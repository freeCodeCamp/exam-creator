use axum::{
    Json,
    extract::{Path, State},
};
use futures_util::TryStreamExt;
use http::StatusCode;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use tracing::instrument;

use crate::{
    config,
    database::{ExamCreatorUser, prisma},
    errors::Error,
    state::ServerState,
};

/// Get all attempts
///
/// TODO: Return only what is needed
///       Could be smarter with fetching exams and attempts as needed
#[instrument(skip_all, err(Debug))]
pub async fn get_attempts(
    _: ExamCreatorUser,
    State(server_state): State<ServerState>,
) -> Result<Json<Vec<config::Attempt>>, Error> {
    let mut exam_attempts = server_state.database.exam_attempt.find(doc! {}).await?;

    let exams: Vec<prisma::ExamCreatorExam> = server_state
        .database
        .exam_creator_exam
        .find(doc! {})
        .await?
        .try_collect()
        .await?;

    let mut attempts = vec![];

    while let Some(exam_attempt) = exam_attempts.try_next().await? {
        let exam = exams
            .iter()
            .find(|e| e.id == exam_attempt.exam_id)
            .ok_or(Error::Server(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("exam non-existant: {}", exam_attempt.exam_id),
            ))?;

        let attempt = config::construct_attempt(&exam, &exam_attempt);
        attempts.push(attempt);
    }

    Ok(Json(attempts))
}

#[instrument(skip_all, err(Debug))]
pub async fn get_attempt_by_id(
    _: ExamCreatorUser,
    State(server_state): State<ServerState>,
    Path(attempt_id): Path<ObjectId>,
) -> Result<Json<config::Attempt>, Error> {
    let exam_attempt = server_state
        .database
        .exam_attempt
        .find_one(doc! {"_id": attempt_id})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("attempt non-existant: {attempt_id}"),
        ))?;

    let exam = server_state
        .database
        .exam_creator_exam
        .find_one(doc! {"_id": exam_attempt.exam_id})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existant: {}", exam_attempt.exam_id),
        ))?;

    let attempt = config::construct_attempt(&exam, &exam_attempt);

    Ok(Json(attempt))
}
