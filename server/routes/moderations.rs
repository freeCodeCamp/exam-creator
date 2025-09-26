use axum::{Json, extract::State};
use futures_util::TryStreamExt;
use mongodb::bson::doc;
use tracing::instrument;

use crate::{
    database::{database_environment, prisma},
    errors::Error,
    state::ServerState,
};

#[instrument(skip_all, err(Debug))]
pub async fn get_moderations(
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
) -> Result<Json<Vec<prisma::ExamEnvironmentExamModeration>>, Error> {
    let database = database_environment(&server_state, &exam_creator_user);
    let exam_moderations = database
        .exam_environment_exam_moderation
        .find(doc! {})
        .await?
        .try_collect()
        .await?;

    Ok(Json(exam_moderations))
}
