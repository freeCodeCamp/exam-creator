use axum::extract::State;
use axum_extra::extract::PrivateCookieJar;
use http::StatusCode;
use mongodb::bson::doc;
use tracing::instrument;

use crate::{database::ExamCreatorUser, errors::Error, state::ServerState};

pub mod github;

/// Logs the user out by deleting the db session(s), and unsetting the sid
#[instrument(skip_all, err(Debug))]
pub async fn delete_logout(
    user: ExamCreatorUser,
    jar: PrivateCookieJar,
    State(server_state): State<ServerState>,
) -> Result<PrivateCookieJar, Error> {
    let cookie = jar
        .get("sid")
        .map(|cookie| cookie.value().to_owned())
        .ok_or(Error::Server(
            StatusCode::UNAUTHORIZED,
            format!("invalid sid in cookie jar"),
        ))?;

    server_state
        .production_database
        .exam_creator_session
        .delete_many(doc! {"user_id": &user.id})
        .await?;

    Ok(jar.remove(cookie))
}
