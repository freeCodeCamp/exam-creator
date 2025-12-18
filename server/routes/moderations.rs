use axum::{
    Json,
    extract::{Path, Query, State},
};
use bson::oid::ObjectId;
use futures_util::TryStreamExt;
use http::StatusCode;
use mongodb::bson::doc;
use serde::{Deserialize, Serialize};
use tracing::instrument;

use crate::{
    database::{database_environment, prisma},
    errors::Error,
    state::ServerState,
};

#[derive(Deserialize)]
pub struct GetModerationsQuery {
    pub status: Option<prisma::ExamEnvironmentExamModerationStatus>,
    pub skip: Option<u64>,
    pub limit: Option<i64>,
    // Realistically, this can be -1, 0, 1
    // pub sort: Option<i32>,
}

#[instrument(skip_all, err(Debug))]
pub async fn get_moderations(
    exam_creator_user: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Query(params): Query<GetModerationsQuery>,
) -> Result<Json<Vec<prisma::ExamEnvironmentExamModeration>>, Error> {
    let database = database_environment(&server_state, &exam_creator_user);
    let status = params.status;
    let skip = params.skip.unwrap_or(0);
    let filter = if let Some(status) = status {
        doc! { "status": bson::serialize_to_bson(&status)? }
    } else {
        doc! {}
    };
    // let sort = if let Some(sort) = params.sort {
    //     doc! {"_id":  sort}
    // } else {
    //     doc! {}
    // };

    let mut exam_moderations_query = database
        .exam_environment_exam_moderation
        .find(filter)
        // .sort(sort)
        .skip(skip);
    if let Some(limit) = params.limit {
        exam_moderations_query = exam_moderations_query.limit(limit);
    }
    let exam_moderations = exam_moderations_query.await?.try_collect().await?;

    Ok(Json(exam_moderations))
}

#[derive(Serialize)]
pub struct GetModerationsCountResponse {
    pub staging: ModerationCount,
    pub production: ModerationCount,
}

#[derive(Serialize)]
pub struct ModerationCount {
    pub pending: u64,
    pub approved: u64,
    pub denied: u64,
}

#[instrument(skip_all, err(Debug), level = "debug")]
pub async fn get_moderations_count(
    _: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<GetModerationsCountResponse>, Error> {
    let production_pending_count = state.production_database
    .exam_environment_exam_moderation
    .count_documents(doc! { "status": bson::serialize_to_bson(&prisma::ExamEnvironmentExamModerationStatus::Pending)? })
    .await?;

    let production_approved_count = state.production_database
.exam_environment_exam_moderation
.count_documents(doc! { "status": bson::serialize_to_bson(&prisma::ExamEnvironmentExamModerationStatus::Approved)? })
.await?;

    let production_denied_count = state.production_database
.exam_environment_exam_moderation
.count_documents(doc! { "status": bson::serialize_to_bson(&prisma::ExamEnvironmentExamModerationStatus::Denied)? })
.await?;

    let staging_pending_count = state.staging_database
.exam_environment_exam_moderation
.count_documents(doc! { "status": bson::serialize_to_bson(&prisma::ExamEnvironmentExamModerationStatus::Pending)? })
.await?;

    let staging_approved_count = state.staging_database
.exam_environment_exam_moderation
.count_documents(doc! { "status": bson::serialize_to_bson(&prisma::ExamEnvironmentExamModerationStatus::Approved)? })
.await?;

    let staging_denied_count = state.staging_database
.exam_environment_exam_moderation
.count_documents(doc! { "status": bson::serialize_to_bson(&prisma::ExamEnvironmentExamModerationStatus::Denied)? })
.await?;

    let counts = GetModerationsCountResponse {
        staging: ModerationCount {
            pending: staging_pending_count,
            approved: staging_approved_count,
            denied: staging_denied_count,
        },
        production: ModerationCount {
            pending: production_pending_count,
            approved: production_approved_count,
            denied: production_denied_count,
        },
    };

    Ok(Json(counts))
}

#[instrument(skip_all, err(Debug), level = "debug")]
pub async fn get_moderation_by_attempt_id(
    exam_creator_user: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(attempt_id): Path<ObjectId>,
) -> Result<Json<prisma::ExamEnvironmentExamModeration>, Error> {
    let database = database_environment(&state, &exam_creator_user);
    let moderation = database
        .exam_environment_exam_moderation
        .find_one(doc! {"examAttemptId": attempt_id})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("moderation non-existent for attempt id: {attempt_id}"),
        ))?;

    Ok(Json(moderation))
}
