use axum::{Json, extract::State};
use futures_util::TryStreamExt;
use mongodb::bson::doc;
use tracing::instrument;

use crate::{
    database::{ExamCreatorUser, prisma},
    errors::Error,
    state::ServerState,
};

#[instrument(skip_all, err(Debug))]
pub async fn get_moderations(
    _: ExamCreatorUser,
    State(server_state): State<ServerState>,
) -> Result<Json<Vec<prisma::ExamEnvironmentExamModeration>>, Error> {
    let exam_moderations = server_state
        .production_database
        .exam_environment_exam_moderation
        .find(doc! {})
        .await?
        .try_collect()
        .await?;

    Ok(Json(exam_moderations))
}
