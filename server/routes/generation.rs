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
use tracing::info;

use crate::{
    database::{self, prisma},
    errors::Error,
    generation::{self},
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
pub async fn put_generate_exam(
    auth_user: prisma::ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
    Json(body): Json<PutGenerateExamBody>,
) -> Result<impl IntoResponse, Error> {
    info!("Generating {} exam for exam_id: {}", body.count, exam_id);

    // Clone the selected database so it can be moved into the spawned task ('static lifetime)
    let database = database::database_environment(&state, &auth_user).clone();

    // Fetch the exam from the appropriate database
    let exam_creator_exam = database
        .exam_creator_exam
        .find_one(doc! { "_id": exam_id })
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existent: {exam_id}"),
        ))?;

    // Convert to ExamInput for generation
    let exam_input = generation::ExamInput {
        id: exam_creator_exam.id,
        question_sets: exam_creator_exam.question_sets,
        config: exam_creator_exam.config,
    };

    // 1. Create a channel
    let (tx, rx) = mpsc::channel::<PutGenerateExamResponse>(16); // Buffer of 16

    // 2. Spawn a background task to do the generation
    tokio::spawn(async move {
        for i in 0..body.count {
            match generation::generate_exam(exam_input.clone()) {
                Ok(generated_exam) => {
                    if let Err(e) = database.generated_exam.insert_one(&generated_exam).await {
                        tracing::error!("Failed to insert generated exam: {}, stopping stream.", e);
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
                }
                Err(e) => {
                    tracing::error!("Failed to generate exam: {:?}", e);
                    break;
                }
            }
        }
        // The sender `tx` is dropped when the task finishes, closing the stream.
    });

    // 4. Create a stream from the receiver
    let stream = ReceiverStream::new(rx);

    // 5. Return the stream as the response body immediately.
    Ok(StreamBodyAs::json_nl(stream))
}
