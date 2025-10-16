use axum::{Json, extract::State};
use axum_extra::extract::PrivateCookieJar;
use http::StatusCode;
use mongodb::bson::doc;
use oauth2::CsrfToken;
use tower_sessions::Session;
use tracing::instrument;

use crate::{
    database::prisma,
    errors::Error,
    state::{ServerState, SessionUser, User},
};

/// Get all users online (in state)
#[instrument(skip_all, err(Debug))]
pub async fn get_users(
    _: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<Vec<User>>, Error> {
    let users = &state.client_sync.lock().unwrap().users;

    Ok(Json(users.clone()))
}

/// Get current session user
#[instrument(skip_all, err(Debug))]
pub async fn get_session_user(
    exam_creator_user: prisma::ExamCreatorUser,
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
        settings,
    } = exam_creator_user.to_session(&users);

    let session_user = SessionUser {
        name,
        email,
        picture,
        activity,
        web_socket_token,
        settings,
    };

    Ok(Json(session_user))
}

pub async fn put_user_settings(
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Json(new_settings): Json<prisma::ExamCreatorUserSettings>,
) -> Result<Json<prisma::ExamCreatorUserSettings>, Error> {
    let new_settings = mongodb::bson::serialize_to_bson(&new_settings)?;
    let _update_result = server_state
        .production_database
        .exam_creator_user
        .update_one(
            doc! { "_id": exam_creator_user.id },
            doc! { "$set": { "settings": new_settings } },
        )
        .await?;

    let updated_user = server_state
        .production_database
        .exam_creator_user
        .find_one(doc! { "_id": exam_creator_user.id })
        .await?
        .ok_or(Error::Server(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("could not find user after update: {}", exam_creator_user.id),
        ))?;

    let settings = updated_user.settings;

    // Update state
    let client_sync = &mut server_state.client_sync.lock().unwrap();
    if let Some(user) = client_sync
        .users
        .iter_mut()
        .find(|u| u.email == updated_user.email)
    {
        user.settings = settings.clone();
    }

    Ok(Json(settings))
}
