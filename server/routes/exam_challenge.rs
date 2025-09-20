use axum::{
    Json,
    extract::{Path, State},
};
use futures_util::TryStreamExt;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use tracing::instrument;

use crate::{
    database::{ExamCreatorUser, prisma},
    errors::Error,
    state::ServerState,
};

/// Get all exam-challenge mappings for the given exam id.
#[instrument(skip_all, err(Debug))]
pub async fn get_exam_challenges(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<Json<Vec<prisma::ExamEnvironmentChallenge>>, Error> {
    let mut exam_challenge_cursor = state
        .production_database
        .exam_environment_challenge
        .find(doc! {"examId": exam_id})
        .await?;

    let mut exam_challenges: Vec<prisma::ExamEnvironmentChallenge> = vec![];

    while let Some(exam_challenge) = exam_challenge_cursor.try_next().await? {
        exam_challenges.push(exam_challenge);
    }

    Ok(Json(exam_challenges))
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PutExamChallengeBody {
    #[serde(rename = "examId")]
    exam_id: ObjectId,
    #[serde(rename = "challengeId")]
    challenge_id: ObjectId,
}

/// Creates or deletes many exam-challenge mapping.
///
/// Overwrites all existing mappings for the given exam id.
/// TODO: Use `x_many` queries, and fewer ops
#[instrument(skip_all, err(Debug))]
pub async fn put_exam_challenges(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
    Json(exam_environment_challenges): Json<Vec<PutExamChallengeBody>>,
) -> Result<Json<Vec<prisma::ExamEnvironmentChallenge>>, Error> {
    let existing_exam_challenges: Vec<prisma::ExamEnvironmentChallenge> = state
        .production_database
        .exam_environment_challenge
        .find(doc! {"examId": exam_id})
        .await?
        .try_collect()
        .await?;

    let exam_challenges_to_delete: Vec<ObjectId> = existing_exam_challenges
        .iter()
        .filter(|existing| {
            !exam_environment_challenges
                .iter()
                .any(|new| new.challenge_id == existing.challenge_id)
        })
        .map(|ec| ec.id)
        .collect();

    let exam_challenge_to_insert: Vec<prisma::ExamEnvironmentChallenge> =
        exam_environment_challenges
            .iter()
            .filter(|new| {
                !existing_exam_challenges
                    .iter()
                    .any(|existing| existing.challenge_id == new.challenge_id)
            })
            .map(|new| prisma::ExamEnvironmentChallenge {
                id: ObjectId::new(),
                exam_id: new.exam_id,
                challenge_id: new.challenge_id,
            })
            .collect();

    state
        .production_database
        .exam_environment_challenge
        .delete_many(doc! {"_id": {"$in": exam_challenges_to_delete}})
        .await?;

    if !exam_challenge_to_insert.is_empty() {
        state
            .production_database
            .exam_environment_challenge
            .insert_many(exam_challenge_to_insert)
            .await?;
    }

    let updated_exam_challenges: Vec<prisma::ExamEnvironmentChallenge> = state
        .production_database
        .exam_environment_challenge
        .find(doc! {"examId": exam_id})
        .await?
        .try_collect()
        .await?;

    Ok(Json(updated_exam_challenges))
}
