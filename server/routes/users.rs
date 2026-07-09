use axum::{
    Json,
    extract::{Query, State},
};
use axum_extra::extract::PrivateCookieJar;
use bson::{Document, oid::ObjectId};
use futures_util::TryStreamExt;
use http::StatusCode;
use mongodb::bson::doc;
use oauth2::CsrfToken;
use serde::{Deserialize, Serialize};
use tower_sessions::Session;
use tracing::instrument;

use crate::{
    config,
    database::{database_environment, prisma},
    errors::Error,
    routes::attempts::construct_attempts,
    state::{ServerState, SessionUser, User},
};

/// Get all users online (in state)
#[instrument(skip_all, err(Debug), level = "debug")]
pub async fn get_users(
    _: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<Vec<User>>, Error> {
    let users = &state.client_sync.lock().unwrap().users;

    Ok(Json(users.clone()))
}

/// Get current session user
#[instrument(skip_all, err(Debug), level = "debug")]
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

#[derive(Deserialize)]
pub struct GetUserSearchQuery {
    pub user_id: Option<ObjectId>,
    pub attempt_id: Option<ObjectId>,
    pub moderation_id: Option<ObjectId>,
    pub username: Option<String>,
    pub email: Option<String>,
}

#[derive(Serialize)]
pub struct GetUserSearchResponse {
    pub user: Document,
    pub attempts: Vec<config::Attempt>,
    pub moderations: Vec<prisma::ExamEnvironmentExamModeration>,
}

/// Look up a user by one of `user_id`, `attempt_id`, `moderation_id`, `username`, or `email`,
/// and return the user with all their attempts and moderations.
#[instrument(skip_all, err(Debug), level = "info")]
pub async fn get_user_search(
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Query(params): Query<GetUserSearchQuery>,
) -> Result<Json<GetUserSearchResponse>, Error> {
    let database = database_environment(&server_state, &exam_creator_user);

    let user_id = if let Some(user_id) = params.user_id {
        user_id
    } else if let Some(attempt_id) = params.attempt_id {
        let attempt = database
            .exam_attempt
            .find_one(doc! {"_id": attempt_id})
            .await?
            .ok_or(Error::Server(
                StatusCode::BAD_REQUEST,
                format!("attempt non-existent: {attempt_id}"),
            ))?;
        attempt.user_id
    } else if let Some(moderation_id) = params.moderation_id {
        let moderation = database
            .exam_environment_exam_moderation
            .find_one(doc! {"_id": moderation_id})
            .await?
            .ok_or(Error::Server(
                StatusCode::BAD_REQUEST,
                format!("moderation non-existent: {moderation_id}"),
            ))?;
        let attempt = database
            .exam_attempt
            .find_one(doc! {"_id": moderation.exam_attempt_id})
            .await?
            .ok_or(Error::Server(
                StatusCode::BAD_REQUEST,
                format!(
                    "attempt non-existent for moderation: {}",
                    moderation.exam_attempt_id
                ),
            ))?;
        attempt.user_id
    } else if let Some(username) = params.username {
        let user = database
            .user
            .find_one(doc! {"username": &username})
            .projection(doc! {"_id": 1})
            .await?
            .ok_or(Error::Server(
                StatusCode::BAD_REQUEST,
                format!("user non-existent for username: {username}"),
            ))?;
        user.get_object_id("_id")?
    } else if let Some(email) = params.email {
        let user = database
            .user
            .find_one(doc! {"email": &email})
            .projection(doc! {"_id": 1})
            .await?
            .ok_or(Error::Server(
                StatusCode::BAD_REQUEST,
                format!("user non-existent for email: {email}"),
            ))?;
        user.get_object_id("_id")?
    } else {
        return Err(Error::Server(
            StatusCode::BAD_REQUEST,
            "one of user_id, attempt_id, moderation_id, username, or email must be provided"
                .to_string(),
        ));
    };

    // Only project fields useful to the client to avoid sending the full user document
    let user = database
        .user
        .find_one(doc! {"_id": user_id})
        .projection(doc! {"_id": 1, "username": 1, "email": 1, "name": 1, "picture": 1})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("user non-existent for id: {user_id}"),
        ))?;

    let exam_attempts: Vec<prisma::ExamEnvironmentExamAttempt> = database
        .exam_attempt
        .find(doc! {"userId": user_id})
        .await?
        .try_collect()
        .await?;

    let attempt_ids: Vec<ObjectId> = exam_attempts.iter().map(|a| a.id).collect();
    let moderations: Vec<prisma::ExamEnvironmentExamModeration> = database
        .exam_environment_exam_moderation
        .find(doc! {"examAttemptId": {"$in": attempt_ids}})
        .await?
        .try_collect()
        .await?;

    let attempts = construct_attempts(database, &exam_attempts).await?;

    Ok(Json(GetUserSearchResponse {
        user,
        attempts,
        moderations,
    }))
}
