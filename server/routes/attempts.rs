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
    database::{database_environment, prisma},
    errors::Error,
    state::ServerState,
};

/// Get all attempts
///
/// TODO: Return only what is needed
///       Could be smarter with fetching exams and attempts as needed
#[instrument(skip_all, err(Debug))]
pub async fn get_attempts(
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
) -> Result<Json<Vec<config::Attempt>>, Error> {
    let database = database_environment(&server_state, &exam_creator_user);
    let mut exam_attempts = database
        .exam_attempt
        // Not the practice exam
        .find(doc! { "examId": { "$ne": "674819431ed2e8ac8d170f5e"}})
        .await?;

    let exams: Vec<prisma::ExamEnvironmentExam> =
        database.exam.find(doc! {}).await?.try_collect().await?;

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
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Path(attempt_id): Path<ObjectId>,
) -> Result<Json<config::Attempt>, Error> {
    let database = database_environment(&server_state, &exam_creator_user);
    let exam_attempt = database
        .exam_attempt
        .find_one(doc! {"_id": attempt_id})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("attempt non-existant: {attempt_id}"),
        ))?;

    let exam = database
        .exam
        .find_one(doc! {"_id": exam_attempt.exam_id})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existant: {}", exam_attempt.exam_id),
        ))?;

    let attempt = config::construct_attempt(&exam, &exam_attempt);

    Ok(Json(attempt))
}
