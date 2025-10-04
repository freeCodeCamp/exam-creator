use axum::{
    Json,
    extract::{Path, State},
};
use bson::Document;
use futures_util::TryStreamExt;
use http::StatusCode;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use serde::Serialize;
use tracing::{info, instrument};

use crate::{database::prisma, errors::Error, state::ServerState};

#[derive(Serialize)]
pub struct GetExam {
    exam: prisma::ExamCreatorExam,
    #[serde(rename = "databaseEnvironments")]
    database_environments: Vec<prisma::ExamCreatorDatabaseEnvironment>,
}

/// Get all exams, and return which database environments they are already deployed to.
///
/// The `questionSets` field is removed as not needed, but added in the typing for serialization
#[instrument(skip_all, err(Debug))]
pub async fn get_exams(
    _: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<Vec<GetExam>>, Error> {
    let mut exam_creator_exams_prod = state
        .production_database
        .exam_creator_exam
        .clone_with_type::<mongodb::bson::Document>()
        .find(doc! {})
        .projection(doc! {"questionSets": false})
        .await?;

    let mut exams: Vec<GetExam> = vec![];

    while let Some(exam) = exam_creator_exams_prod.try_next().await? {
        let exam: prisma::ExamCreatorExam = exam.try_into()?;
        let mut database_environments = vec![];

        if state
            .production_database
            .exam
            .find_one(doc! {"_id": exam.id})
            .await?
            .is_some()
        {
            database_environments.push(prisma::ExamCreatorDatabaseEnvironment::Production);
        }
        if state
            .staging_database
            .exam
            .clone_with_type::<Document>()
            .find_one(doc! {"_id": exam.id})
            .projection(doc! {"_id": true})
            .await?
            .is_some()
        {
            database_environments.push(prisma::ExamCreatorDatabaseEnvironment::Staging);
        }

        let get_exam = GetExam {
            exam,
            database_environments,
        };

        exams.push(get_exam);
    }

    Ok(Json(exams))
}

#[instrument(skip_all, err(Debug))]
pub async fn get_exam_by_id(
    _auth_user: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<Json<prisma::ExamCreatorExam>, Error> {
    // TODO: Check if exam is in server state first:
    // {
    //     let client_sync = &mut state.client_sync.lock().unwrap();
    //     let exams = client_sync.exams.clone();
    //     if let Some(exam) = exams.iter().find(|e| e.id == exam_id) {
    //         info!("Found exam {exam_id} in state");
    //         // Update state to reflect user is editing this exam
    //         set_user_activity(client_sync, &auth_user.email, Some(exam_id));
    //         return Ok(Json(exam.clone()));
    //     }
    // }

    let exam = state
        .production_database
        .exam_creator_exam
        .find_one(doc! { "_id": exam_id })
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existant: {exam_id}"),
        ))?;
    info!("Found exam {exam_id} in database");

    Ok(Json(exam))
}

/// Create an exam
#[instrument(skip_all, err(Debug))]
pub async fn post_exam(
    _: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<prisma::ExamCreatorExam>, Error> {
    info!("post_exam");
    let exam = prisma::ExamCreatorExam::default();

    state
        .production_database
        .exam_creator_exam
        .insert_one(&exam)
        .await?;

    Ok(Json(exam))
}

/// Update an exam
#[instrument(skip_all, err(Debug))]
pub async fn put_exam(
    _: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
    Json(exam): Json<prisma::ExamCreatorExam>,
) -> Result<Json<prisma::ExamCreatorExam>, Error> {
    if exam.id != exam_id {
        return Err(Error::Server(
            StatusCode::BAD_REQUEST,
            format!(
                "Given exam id {} does not match requested id to edit {}",
                exam.id, exam_id
            ),
        )
        .into());
    }
    state
        .production_database
        .exam_creator_exam
        .replace_one(doc! { "_id": exam_id }, &exam)
        .await?;

    Ok(Json(exam))
}

/// Finds an exam in `ExamCreatorExam`
/// Upserts it into staging database `ExamEnvironmentExam`
///
/// NOTE: Staging has a special case where the `ExamEnvironmentChallenge` documents need to be copied over
#[instrument(skip_all, err(Debug))]
pub async fn put_exam_by_id_to_staging(
    _auth_user: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<(), Error> {
    let exam_creator_exam = state
        .production_database
        .exam_creator_exam
        .find_one(doc! { "_id": exam_id })
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existant: {exam_id}"),
        ))?;
    info!("Found exam {exam_id} in production database");

    let exam_environment_challenges: Vec<prisma::ExamEnvironmentChallenge> = state
        .production_database
        .exam_environment_challenge
        .find(doc! {"examId": exam_id})
        .await?
        .try_collect()
        .await?;

    info!(
        "Found {} exam-challenge mappings in production database",
        exam_environment_challenges.len()
    );

    state
        .staging_database
        .exam
        .update_one(
            doc! {"_id": exam_id},
            doc! {
                "$set": bson::serialize_to_document(&exam_creator_exam)?,
            },
        )
        .upsert(true)
        .await?;

    state
        .staging_database
        .exam_environment_challenge
        .delete_many(doc! {"examId": exam_id})
        .await?;
    if !exam_environment_challenges.is_empty() {
        state
            .staging_database
            .exam_environment_challenge
            .insert_many(exam_environment_challenges)
            .await?;
    }

    Ok(())
}

/// Finds an exam in `ExamCreatorExam`
/// Upserts it into production database `ExamEnvironmentExam`
#[instrument(skip_all, err(Debug))]
pub async fn put_exam_by_id_to_production(
    _auth_user: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<(), Error> {
    let exam_creator_exam = state
        .production_database
        .exam_creator_exam
        .find_one(doc! { "_id": exam_id })
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existant: {exam_id}"),
        ))?;
    info!("Found exam {exam_id} in production database");

    state
        .production_database
        .exam
        .update_one(
            doc! {"_id": exam_id},
            doc! {
                "$set": bson::serialize_to_document(&exam_creator_exam)?,
            },
        )
        .upsert(true)
        .await?;

    Ok(())
}
