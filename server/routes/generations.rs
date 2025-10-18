use axum::{
    Json,
    extract::{Path, State},
    response::IntoResponse,
};
use axum_streams::StreamBodyAs;
use http::StatusCode;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tracing::{info, instrument};

use crate::{
    database::{Database, prisma},
    errors::Error,
    generate,
    state::ServerState,
};

#[derive(Deserialize)]
pub struct PutGenerateExamBody {
    pub count: i16,
}

#[derive(Serialize)]
pub struct PutGenerateExamResponse {
    pub count: i16,
    #[serde(rename = "examId")]
    pub exam_id: ObjectId,
}

/// Generate an exam based on the exam configuration
#[instrument(skip_all, err(Debug))]
pub async fn put_generations_by_exam_id_to_staging(
    _auth_user: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
    Json(body): Json<PutGenerateExamBody>,
) -> Result<impl IntoResponse, Error> {
    let database = state.staging_database.clone();

    // Fetch the exam from the source
    let exam_creator_exam = state
        .production_database
        .exam_creator_exam
        .find_one(doc! { "_id": exam_id })
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existent: {exam_id}"),
        ))?;
    put_generations_by_exam_id(body.count, database, exam_id, exam_creator_exam).await
}

/// Generate an exam based on the exam configuration
#[instrument(skip_all, err(Debug))]
pub async fn put_generations_by_exam_id_to_production(
    _auth_user: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
    Json(body): Json<PutGenerateExamBody>,
) -> Result<impl IntoResponse, Error> {
    let database = state.production_database.clone();

    // Fetch the exam from the source
    let exam_creator_exam = state
        .production_database
        .exam_creator_exam
        .find_one(doc! { "_id": exam_id })
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existent: {exam_id}"),
        ))?;
    put_generations_by_exam_id(body.count, database, exam_id, exam_creator_exam).await
}

async fn put_generations_by_exam_id(
    count: i16,
    database: Database,
    exam_id: ObjectId,
    exam_creator_exam: prisma::ExamCreatorExam,
) -> Result<impl IntoResponse, Error> {
    // Convert to ExamInput for generation
    let exam_input = generate::ExamInput {
        id: exam_creator_exam.id,
        question_sets: exam_creator_exam.question_sets,
        config: exam_creator_exam.config,
    };

    // 1. Create a channel
    let (tx, rx) = mpsc::channel::<PutGenerateExamResponse>(16); // Buffer of 16

    // 2. Spawn a background task to do the generation, with a 10s timeout
    tokio::spawn(async move {
        let generation_future = async {
            for i in 0..count {
                loop {
                    match generate::generate_exam(exam_input.clone()) {
                        Ok(generated_exam) => {
                            if let Err(e) =
                                database.generated_exam.insert_one(&generated_exam).await
                            {
                                tracing::error!(
                                    "Failed to insert generated exam: {}, stopping stream.",
                                    e
                                );
                                // The sender `tx` is dropped here, closing the channel and ending the stream.
                                return;
                            }

                            info!("Successfully generated exam: {}", generated_exam.id);

                            let res = PutGenerateExamResponse { count: i, exam_id };

                            // 3. Send the result through the channel.
                            // If the client disconnects, `send` will fail, and we break the loop.
                            if tx.send(res).await.is_err() {
                                tracing::warn!("Client disconnected, stopping exam generation.");
                                break;
                            }

                            break;
                        }
                        Err(e) => {
                            tracing::debug!("Failed to generate exam: {:?}", e);
                            // break;
                        }
                    }
                }
            }
        };

        if tokio::time::timeout(std::time::Duration::from_secs(10), generation_future)
            .await
            .is_err()
        {
            tracing::warn!("Exam generation timed out after 10 seconds.");
            // Dropping the sender here will close the stream on the client side.
        }
        // The sender `tx` is dropped when the task finishes or times out, closing the stream.
    });

    // 4. Create a stream from the receiver
    let stream = ReceiverStream::new(rx);

    // 5. Return the stream as the response body immediately.
    Ok(StreamBodyAs::json_nl(stream))
}
