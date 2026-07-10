use std::collections::HashMap;

use axum::{
    Json,
    extract::{Path, State},
};
use bson::DateTime;
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

    let now = DateTime::now();
    let update_result = database
        .exam_environment_exam_moderation
        .update_one(
            doc! { "examAttemptId": body.attempt_id },
            doc! { "$set": { "status": bson::serialize_to_bson(&body.status)?, "moderationDate": now } },
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

/// Grace period before a scheduled attempt deletion is executed, allowing an undo.
const DELETE_GRACE_SECONDS: u64 = 10;

/// Monotonic tag distinguishing successive schedules for the same attempt id.
static DELETE_GENERATION: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// Schedule deletion of an attempt (and its moderation) after a grace period.
///
/// Spawns a non-blocking task that waits `DELETE_GRACE_SECONDS` before deleting.
/// The task is cancellable via [`delete_pending_deletion`]; unlike the previous
/// client-side timer, it survives the client navigating away.
#[instrument(skip_all, err(Debug), level = "debug")]
pub async fn put_pending_deletion(
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Path(attempt_id): Path<ObjectId>,
) -> Result<(), Error> {
    let database = database_environment(&server_state, &exam_creator_user).clone();

    let (tx, rx) = tokio::sync::oneshot::channel::<()>();
    let generation = DELETE_GENERATION.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    // Replace any existing schedule for this attempt (dropping the old sender cancels it).
    server_state
        .pending_deletes
        .lock()
        .unwrap()
        .insert(attempt_id, (generation, tx));

    let pending_deletes = server_state.pending_deletes.clone();
    tokio::spawn(async move {
        tokio::select! {
            _ = tokio::time::sleep(std::time::Duration::from_secs(DELETE_GRACE_SECONDS)) => {
                if let Err(e) = perform_delete_attempt(&database, attempt_id).await {
                    tracing::error!("scheduled delete failed for attempt {attempt_id}: {e}");
                }
                // Only drop our own entry, not a newer reschedule that replaced it.
                let mut pending = pending_deletes.lock().unwrap();
                if pending.get(&attempt_id).is_some_and(|(g, _)| *g == generation) {
                    pending.remove(&attempt_id);
                }
            }
            _ = rx => {
                // Cancelled: the sender was dropped/removed by delete_pending_deletion.
                tracing::info!(%attempt_id, "scheduled delete cancelled");
            }
        }
    });

    Ok(())
}

/// Cancel a pending attempt deletion, restoring the attempt.
///
/// Idempotent: cancelling when nothing is pending (e.g. the grace period
/// already elapsed) is a no-op, not an error.
#[instrument(skip_all, err(Debug), level = "debug")]
pub async fn delete_pending_deletion(
    _exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Path(attempt_id): Path<ObjectId>,
) -> Result<(), Error> {
    // Removing the sender drops it, waking the task's `rx` branch and aborting the delete.
    let removed = server_state
        .pending_deletes
        .lock()
        .unwrap()
        .remove(&attempt_id);

    if removed.is_none() {
        tracing::info!(%attempt_id, "no pending deletion to cancel");
    }

    Ok(())
}

/// Delete an attempt and its moderation (0-1 records). Already-deleted records
/// are not an error: the desired end state is reached either way.
async fn perform_delete_attempt(
    database: &crate::database::Database,
    attempt_id: ObjectId,
) -> Result<(), Error> {
    // Delete moderation first (0-1 records). Not-found is fine.
    database
        .exam_environment_exam_moderation
        .delete_one(doc! { "examAttemptId": attempt_id })
        .await?;

    let delete_result = database
        .exam_attempt
        .delete_one(doc! { "_id": attempt_id })
        .await?;

    if delete_result.deleted_count == 0 {
        tracing::warn!(%attempt_id, "attempt already deleted");
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
    let exam_attempts: Vec<prisma::ExamEnvironmentExamAttempt> = database
        .exam_attempt
        .find(doc! { "userId": user_id })
        .await?
        .try_collect()
        .await?;

    let attempts = construct_attempts(database, &exam_attempts).await?;

    Ok(Json(attempts))
}

/// Constructs full `Attempt`s from raw exam attempts, caching exams and generations
/// to avoid repeated lookups.
pub async fn construct_attempts(
    database: &crate::database::Database,
    exam_attempts: &[prisma::ExamEnvironmentExamAttempt],
) -> Result<Vec<config::Attempt>, Error> {
    let mut attempts = vec![];
    let mut exams = HashMap::<ObjectId, prisma::ExamEnvironmentExam>::new();
    let mut generations = HashMap::<ObjectId, prisma::ExamEnvironmentGeneratedExam>::new();

    for exam_attempt in exam_attempts {
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
                    format!(
                        "generated exam non-existent: {}",
                        exam_attempt.generated_exam_id
                    ),
                ))?;
            generations.insert(exam_attempt.generated_exam_id, generation.to_owned());
            generation
        };

        let attempt = config::construct_attempt(&exam, &generation, exam_attempt);
        attempts.push(attempt);
    }

    Ok(attempts)
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
