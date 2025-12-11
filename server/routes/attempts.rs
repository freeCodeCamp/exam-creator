use std::collections::HashMap;

use axum::{
    Json,
    extract::{Path, State},
};
use futures_util::TryStreamExt;
use http::StatusCode;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use serde::Deserialize;
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
pub async fn _get_attempts(
    _exam_creator_user: prisma::ExamCreatorUser,
    State(_server_state): State<ServerState>,
) -> Result<Json<Vec<config::Attempt>>, Error> {
    unimplemented!()
    // let database = database_environment(&server_state, &exam_creator_user);
    // let mut exam_attempts = database
    //     .exam_attempt
    //     // Find all attempts except for the ones created for the practice exam
    //     .find(doc! { "examId": { "$ne": "674819431ed2e8ac8d170f5e"}})
    //     .await?;

    // let exams: Vec<prisma::ExamEnvironmentExam> =
    //     database.exam.find(doc! {}).await?.try_collect().await?;

    // let mut attempts = vec![];

    // while let Some(exam_attempt) = exam_attempts.try_next().await? {
    //     let exam = exams
    //         .iter()
    //         .find(|e| e.id == exam_attempt.exam_id)
    //         .ok_or(Error::Server(
    //             StatusCode::INTERNAL_SERVER_ERROR,
    //             format!("exam non-existent: {}", exam_attempt.exam_id),
    //         ))?;

    //     let attempt = config::construct_attempt(&exam, &exam_attempt);
    //     attempts.push(attempt);
    // }

    // Ok(Json(attempts))
}

#[instrument(skip_all, err(Debug), level = "debug")]
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
            format!("attempt non-existent: {attempt_id}"),
        ))?;

    let exam = database
        .exam
        .find_one(doc! {"_id": exam_attempt.exam_id})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existent: {}", exam_attempt.exam_id),
        ))?;

    let generation = database
        .generated_exam
        .find_one(doc! {
            "_id": exam_attempt.generated_exam_id
        })
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!(
                "generation non-existent: {}",
                exam_attempt.generated_exam_id
            ),
        ))?;

    let attempt = config::construct_attempt(&exam, &generation, &exam_attempt);

    Ok(Json(attempt))
}

#[derive(Deserialize)]
pub struct PatchModerationStatusByAttemptIdBody {
    #[serde(rename = "attemptId")]
    pub attempt_id: mongodb::bson::oid::ObjectId,
    pub status: prisma::ExamEnvironmentExamModerationStatus,
}

#[instrument(skip_all, err(Debug), level = "debug")]
pub async fn patch_moderation_status_by_attempt_id(
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Path(attempt_id): Path<mongodb::bson::oid::ObjectId>,
    Json(body): Json<PatchModerationStatusByAttemptIdBody>,
) -> Result<(), Error> {
    if attempt_id != body.attempt_id {
        return Err(Error::Server(
            StatusCode::BAD_REQUEST,
            format!(
                "Path id does not match body id: {} != {}",
                attempt_id, body.attempt_id
            ),
        ));
    }

    let database = database_environment(&server_state, &exam_creator_user);

    let update_result = database
        .exam_environment_exam_moderation
        .update_one(
            doc! { "examAttemptId": body.attempt_id },
            doc! { "$set": { "status": bson::serialize_to_bson(&body.status)? } },
        )
        .await?;

    if update_result.matched_count == 0 {
        return Err(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("Moderation record non-existent for attempt: {}", attempt_id),
        ));
    }

    Ok(())
}

#[instrument(skip_all, err(Debug), level = "debug")]
pub async fn get_attempts_by_user_id(
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Path(user_id): Path<ObjectId>,
) -> Result<Json<Vec<config::Attempt>>, Error> {
    let database = database_environment(&server_state, &exam_creator_user);
    let mut exam_attempts = database
        .exam_attempt
        .find(doc! { "userId": user_id })
        .await?;

    let mut attempts = vec![];
    let mut exams = HashMap::<ObjectId, prisma::ExamEnvironmentExam>::new();
    let mut generations = HashMap::<ObjectId, prisma::ExamEnvironmentGeneratedExam>::new();

    while let Some(exam_attempt) = exam_attempts.try_next().await? {
        let exam = if let Some(exam) = exams.get(&exam_attempt.exam_id) {
            exam.clone()
        } else {
            let exam = database
                .exam
                .find_one(doc! {"_id": exam_attempt.exam_id})
                .await?
                .ok_or(Error::Server(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("exam non-existent: {}", exam_attempt.exam_id),
                ))?;
            exams.insert(exam_attempt.exam_id, exam.to_owned());
            exam
        };

        let generation = if let Some(generation) = generations.get(&exam_attempt.generated_exam_id)
        {
            generation.clone()
        } else {
            let generation = database
                .generated_exam
                .find_one(doc! {"_id": exam_attempt.generated_exam_id})
                .await?
                .ok_or(Error::Server(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    format!("exam non-existent: {}", exam_attempt.exam_id),
                ))?;
            generations.insert(exam_attempt.generated_exam_id, generation.to_owned());
            generation
        };

        let attempt = config::construct_attempt(&exam, &generation, &exam_attempt);
        attempts.push(attempt);
    }

    Ok(Json(attempts))
}

#[instrument(skip_all, err(Debug), level = "debug")]
pub async fn get_number_of_attempts_by_user_id(
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Path(user_id): Path<ObjectId>,
) -> Result<Json<u64>, Error> {
    let database = database_environment(&server_state, &exam_creator_user);
    let number_of_attempts = database
        .exam_attempt
        .count_documents(doc! { "userId": user_id })
        .await?;

    Ok(Json(number_of_attempts))
}
