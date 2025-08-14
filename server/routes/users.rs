use axum::{Json, extract::State};
use axum_extra::extract::PrivateCookieJar;
use http::StatusCode;
use mongodb::bson::doc;
use oauth2::CsrfToken;
use tower_sessions::Session;
use tracing::instrument;

use crate::{
    database::ExamCreatorUser,
    errors::Error,
    state::{ServerState, SessionUser, User},
};

/// Get all users online (in state)
#[instrument(skip_all, err(Debug))]
pub async fn get_users(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<Vec<User>>, Error> {
    let users = &state.client_sync.lock().unwrap().users;

    Ok(Json(users.clone()))
}

/// Get current session user
#[instrument(skip_all, err(Debug))]
pub async fn get_session_user(
    exam_creator_user: ExamCreatorUser,
    session: Session,
    jar: PrivateCookieJar,
    State(server_state): State<ServerState>,
) -> Result<Json<SessionUser>, Error> {
    let web_socket_token = CsrfToken::new_random().into_secret();

    let cookie = jar
        .get("sid")
        .map(|cookie| cookie.value().to_owned())
        .ok_or(Error::Server(
            StatusCode::UNAUTHORIZED,
            format!("invalid sid in cookie jar"),
        ))?;

    session.insert(&web_socket_token, &cookie).await?;

    let users = &server_state
        .client_sync
        .lock()
        .expect("unable to lock client_sync mutex")
        .users;
    let User {
        name,
        email,
        picture,
        activity,
    } = exam_creator_user.to_session(&users);

    let session_user = SessionUser {
        name,
        email,
        picture,
        activity,
        web_socket_token,
    };

    Ok(Json(session_user))
}
