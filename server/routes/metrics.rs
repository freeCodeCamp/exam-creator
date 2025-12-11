use axum::{
    Json,
    extract::{Path, State},
};
use futures_util::TryStreamExt;
use http::StatusCode;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use serde::Serialize;
use tracing::instrument;

use crate::{
    database::{database_environment, prisma},
    errors::Error,
    state::ServerState,
};

#[derive(Serialize)]
pub struct GetExamMetrics {
    exam: prisma::ExamCreatorExam,
    #[serde(rename = "numberOfAttempts")]
    number_of_attempts: u64,
}

/// Get all exams, and return which database environments they are already deployed to.
///
/// The `questionSets` field is removed as not needed, but added in the typing for serialization
#[instrument(skip_all, err(Debug))]
pub async fn get_exams_metrics(
    user: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<Vec<GetExamMetrics>>, Error> {
    let database = database_environment(&state, &user);
    let mut exam_creator_exams_prod = database
        .exam
        .clone_with_type::<mongodb::bson::Document>()
        .find(doc! {})
        .projection(doc! {"questionSets": false})
        .await?;

    let mut exams: Vec<GetExamMetrics> = vec![];

    while let Some(exam) = exam_creator_exams_prod.try_next().await? {
        let exam: prisma::ExamCreatorExam = exam.try_into()?;
        let number_of_attempts = database
            .exam_attempt
            .count_documents(doc! {"examId": &exam.id})
            .await?;

        let get_exam = GetExamMetrics {
            exam,
            number_of_attempts,
        };

        exams.push(get_exam);
    }

    Ok(Json(exams))
}

#[derive(Debug, Clone, Serialize)]
pub struct GetExamMetricsById {
    exam: prisma::ExamEnvironmentExam,
    attempts: Vec<prisma::ExamEnvironmentExamAttempt>,
    generations: Vec<prisma::ExamEnvironmentGeneratedExam>,
    /// When the cache for this sampled data expires
    expire_at: std::time::SystemTime,
}

#[instrument(skip_all, err(Debug))]
pub async fn get_exam_metrics_by_exam_id(
    user: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<Json<GetExamMetricsById>, Error> {
    {
        let mut cache = state.exam_metrics_by_id_cache.lock().unwrap();
        if let Some(cached_response) = cache.iter().find(|c| c.exam.id == exam_id) {
            if cached_response.expire_at < std::time::SystemTime::now() {
                // Remove expired cached response
                cache.retain(|c| c.exam.id != exam_id);
            } else {
                return Ok(Json(cached_response.clone()));
            }
        }
    }

    let database = database_environment(&state, &user);
    let exam = database
        .exam
        .find_one(doc! { "_id": exam_id })
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existent: {exam_id}"),
        ))?;

    let attempts_sample: Vec<prisma::ExamEnvironmentExamAttempt> = database
        .exam_attempt
        .aggregate(vec![
            doc! {
                "$match": {
                    "examId": exam_id,
                    "$and": [
                        {"examModerationId": { "$exists": true }},
                        {"examModerationId": { "$ne": null}}
                    ]
                }
            },
            doc! {
                "$sample": { "size": 100 }
            },
        ])
        .with_type::<prisma::ExamEnvironmentExamAttempt>()
        .await?
        .try_collect()
        .await?;

    let mut generations: Vec<prisma::ExamEnvironmentGeneratedExam> = vec![];

    for attempt in &attempts_sample {
        if generations
            .iter()
            .any(|g| g.id == attempt.generated_exam_id)
        {
            continue;
        }

        let generation: prisma::ExamEnvironmentGeneratedExam = database
            .generated_exam
            .find_one(doc! { "_id": &attempt.generated_exam_id })
            .await?
            .ok_or(Error::Server(
                StatusCode::BAD_REQUEST,
                format!(
                    "generated exam non-existent: {}",
                    &attempt.generated_exam_id
                ),
            ))?;
        generations.push(generation);
    }

    let response = GetExamMetricsById {
        exam,
        attempts: attempts_sample,
        generations,
        expire_at: std::time::SystemTime::now() + std::time::Duration::from_secs(2 * 60 * 60), // 2 hours
    };

    {
        let mut cache = state.exam_metrics_by_id_cache.lock().unwrap();
        cache.push(response.clone());
    }

    Ok(Json(response))
}
