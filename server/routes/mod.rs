use axum::{
    Json,
    extract::{Path, State},
    http::header::{CACHE_CONTROL, CONTENT_TYPE},
    response::Response,
};
use http::StatusCode;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use tracing::{info, instrument};

use crate::{database::prisma, errors::Error, state::ServerState};

pub mod attempts;
pub mod auth;
pub mod exam_challenge;
pub mod exams;
pub mod generation;
pub mod moderations;
pub mod users;
pub mod websocket;

#[instrument(skip_all, err(Debug))]
pub async fn discard_exam_state_by_id(
    _: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<Json<prisma::ExamCreatorExam>, Error> {
    let original_exam = state
        .production_database
        .exam_creator_exam
        .find_one(doc! {
            "_id": &exam_id
        })
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("No exam {exam_id} found"),
        ))?;

    let client_sync = &mut state.client_sync.lock().unwrap();
    if let Some(exam) = client_sync.exams.iter_mut().find(|e| e.id == exam_id) {
        *exam = original_exam.clone();
    } else {
        info!("No exam in client sync state: {}", exam_id)
    }

    Ok(Json(original_exam))
}

pub async fn get_status_ping() -> Response {
    info!("Health check ping received");

    let mut response = Response::new("pong".into());
    response.headers_mut().insert(
        CACHE_CONTROL,
        "no-cache"
            .parse()
            .expect("Unreachable. static str into HeaderValue"),
    );
    response.headers_mut().insert(
        CONTENT_TYPE,
        "text/plain; charset=utf-8"
            .parse()
            .expect("Unreachable. static str into HeaderValue"),
    );
    response
}
