use std::time::Duration;

use axum::{
    Extension,
    extract::{Query, State},
    response::{IntoResponse, Redirect},
};
use axum_extra::extract::{PrivateCookieJar, cookie::Cookie};
use http::{
    StatusCode,
    header::{ACCEPT, USER_AGENT},
};
use mongodb::bson::{doc, oid::ObjectId};
use oauth2::{
    AccessToken, AuthorizationCode, CsrfToken, EmptyExtraTokenFields, EndpointNotSet, EndpointSet,
    Scope, StandardTokenResponse, TokenResponse,
    basic::{BasicClient, BasicTokenType},
};
use reqwest::Client;
use tower_sessions::Session;
use tracing::info;
use url::Url;

use crate::{database::prisma, errors::Error, state::ServerState};

type GitHubClient =
    BasicClient<EndpointSet, EndpointNotSet, EndpointNotSet, EndpointNotSet, EndpointSet>;

pub async fn github_login_handler(
    _session: Session,
    State(server_state): State<ServerState>,
    Extension(github_client): Extension<GitHubClient>,
) -> impl IntoResponse {
    if server_state.env_vars.mock_auth {
        let redirect_url = Url::parse_with_params(
            &server_state.env_vars.github_redirect_url,
            &[("code", "anything"), ("state", "anything")],
        )
        .expect("Unreachable. Development static string parsing.");
        return Redirect::to(redirect_url.as_str());
    }

    let (authorize_url, _csrf_state) = github_client
        .authorize_url(CsrfToken::new_random)
        // .add_scope(Scope::new("user".to_string()))
        .add_scope(Scope::new("read:user".to_string()))
        .add_scope(Scope::new("user:email".to_string()))
        .url();

    // TODO: Store csrf_state in session to later compare with state
    // Redirect to authorize_url
    Redirect::to(authorize_url.as_str())
}

#[derive(Debug, serde::Deserialize)]
pub struct AuthCallbackQueryParams {
    code: AuthorizationCode,
    state: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct GitHubUserInfo {
    id: i64,
    avatar_url: String,
    email: Option<String>,
    name: Option<String>,
}
#[derive(Debug, serde::Deserialize)]
pub struct GitHubUserEmail {
    email: String,
    primary: bool,
    verified: bool,
}

pub async fn github_handler(
    _session: Session,
    jar: PrivateCookieJar,
    Extension(github_client): Extension<GitHubClient>,
    Extension(http_client): Extension<Client>,
    State(server_state): State<ServerState>,
    Query(params): Query<AuthCallbackQueryParams>,
) -> Result<impl IntoResponse, Error> {
    let AuthCallbackQueryParams {
        code,
        state: _state,
    } = params;

    let (token, access_token) = get_access_token(
        code,
        &github_client,
        &http_client,
        server_state.env_vars.mock_auth,
    )
    .await?;

    let github_user_info =
        get_github_user_info(&access_token, &http_client, server_state.env_vars.mock_auth).await?;

    let email = match github_user_info.email {
        Some(email) => email,
        None => {
            let emails = get_github_user_emails(
                &access_token,
                &http_client,
                server_state.env_vars.mock_auth,
            )
            .await?;
            let email =
                emails
                    .into_iter()
                    .find(|e| e.verified && e.primary)
                    .ok_or(Error::Server(
                        StatusCode::UNAUTHORIZED,
                        format!("no verified and primary emails associated with GitHub"),
                    ))?;
            email.email
        }
    };

    // If mocking auth, add camperbot user to database
    if server_state.env_vars.mock_auth {
        let mock_user = prisma::ExamCreatorUser {
            id: ObjectId::parse_str("685d2e1c178564e7b9045589")
                .expect("Unreachable. development static string"),
            name: "Camperbot".to_string(),
            github_id: None,
            picture: None,
            email: "camperbot@freecodecamp.org".to_string(),
            settings: Some(prisma::ExamCreatorUserSettings::default()),
            version: 1,
        };
        let res = server_state
            .production_database
            .exam_creator_user
            .insert_one(mock_user)
            .await;

        match res {
            Ok(_insert_result) => {
                info!("Camperbot user inserted into database");
            }
            Err(_e) => {
                info!("Camperbot user already found in database");
            }
        }
    }

    // TEMP: User email must be in database
    let user = server_state
        .production_database
        .exam_creator_user
        .find_one(doc! {"email": &email})
        .await?
        .ok_or(Error::Server(
            StatusCode::UNAUTHORIZED,
            format!("user non-existant: {email}"),
        ))?;

    // Update user picture
    server_state
        .production_database
        .exam_creator_user
        .update_one(
            doc! {"_id": user.id},
            doc! {"$set": {"picture": github_user_info.avatar_url}},
        )
        .await?;

    let expires_in = token
        .expires_in()
        .unwrap_or(Duration::from_secs(server_state.env_vars.session_ttl_in_s));
    let expires_at = chrono::Utc::now() + expires_in;
    let expires_at = expires_at.into();
    let session_id = access_token;
    // Create session
    let session = prisma::ExamCreatorSession {
        id: ObjectId::new(),
        user_id: user.id,
        session_id,
        expires_at,
        version: 1,
    };

    server_state
        .production_database
        .exam_creator_session
        .insert_one(&session)
        .await?;

    let cookie = Cookie::build(("sid", session.session_id))
        // .domain("http://127.0.0.1:3001")
        .path("/")
        .secure(true)
        .http_only(true)
        .max_age(expires_in.try_into()?);

    return Ok(jar.add(cookie));
}

async fn get_github_user_info(
    access_token: &str,
    http_client: &Client,
    mock_auth: bool,
) -> Result<GitHubUserInfo, Error> {
    if mock_auth {
        let github_user_info = GitHubUserInfo {
            id: 0,
            avatar_url: "".to_string(),
            email: Some("camperbot@freecodecamp.org".to_string()),
            name: Some("Camperbot".to_string()),
        };

        return Ok(github_user_info);
    }

    let user_info_request = http_client
        .get("https://api.github.com/user")
        .bearer_auth(access_token)
        .header(USER_AGENT, "Exam Creator (local)")
        // .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header(ACCEPT, "application/vnd.github+json");

    let user_info_res = user_info_request.send().await?;
    let res = user_info_res.error_for_status()?;
    let github_user_info: GitHubUserInfo = res.json().await?;
    info!(
        "{} {:?} {:?} {}",
        github_user_info.id,
        github_user_info.email,
        github_user_info.name,
        github_user_info.avatar_url
    );

    Ok(github_user_info)
}

async fn get_github_user_emails(
    access_token: &str,
    http_client: &Client,
    mock_auth: bool,
) -> Result<Vec<GitHubUserEmail>, Error> {
    if mock_auth {
        let github_user_email = GitHubUserEmail {
            email: "camperbot@freecodecamp.org".to_string(),
            primary: true,
            verified: true,
        };

        return Ok(vec![github_user_email]);
    }

    let user_emails_request = http_client
        .get("https://api.github.com/user/emails")
        .bearer_auth(&access_token)
        .header(USER_AGENT, "Exam Creator (local)")
        // .header(AUTHORIZATION, format!("Bearer {access_token}"))
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header(ACCEPT, "application/vnd.github+json");

    let user_emails_res = user_emails_request.send().await?;
    let res = user_emails_res.error_for_status()?;
    let emails: Vec<GitHubUserEmail> = res.json().await?;

    Ok(emails)
}

async fn get_access_token(
    code: AuthorizationCode,
    github_client: &GitHubClient,
    http_client: &Client,
    mock_auth: bool,
) -> Result<
    (
        StandardTokenResponse<EmptyExtraTokenFields, BasicTokenType>,
        String,
    ),
    Error,
> {
    if mock_auth {
        let access_token = String::from("camperbot-access-token");
        let token = StandardTokenResponse::new(
            AccessToken::new(access_token.clone()),
            BasicTokenType::Bearer,
            EmptyExtraTokenFields {},
        );
        return Ok((token, access_token));
    }

    // Request access token from GitHub
    let token = github_client
        .exchange_code(code)
        .request_async(http_client)
        .await
        .map_err(|e| Error::Server(StatusCode::INTERNAL_SERVER_ERROR, format!("{e}")))?;
    // TODO: Compare session csrf with state
    // Check granted scopes includes necessary information:
    // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authenticating-to-the-rest-api-with-an-oauth-app#checking-granted-scopes
    let scopes = token.scopes().ok_or(Error::Server(
        StatusCode::UNAUTHORIZED,
        format!("No scopes provided in GitHub auth"),
    ))?;

    let scopes = scopes
        .iter()
        .flat_map(|comma_separated| comma_separated.split(','))
        .collect::<Vec<_>>();
    // if !scopes.contains(&"user") {
    if !scopes.contains(&"read:user") || !scopes.contains(&"user:email") {
        info!("Bad scopes: {:?}", scopes);
        return Err(Error::Server(
            StatusCode::UNAUTHORIZED,
            format!("Insufficient scopes: {scopes:?}"),
        ));
    }

    let access_token = token.access_token().secret().to_owned();
    Ok((token, access_token))
}
