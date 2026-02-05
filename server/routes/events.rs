use axum::{
    Json,
    extract::{Path, State},
};
use bson::oid::ObjectId;
use http::StatusCode;
use tracing::{instrument, warn};

use crate::{config, database::prisma, errors::Error, state::ServerState};

#[instrument(skip_all, err(Debug), level = "debug")]
pub async fn get_events_by_attempt_id(
    _: prisma::ExamCreatorUser,
    State(server_state): State<ServerState>,
    Path(attempt_id): Path<ObjectId>,
) -> Result<Json<Vec<config::Event>>, Error> {
    let supabase = server_state.supabase;
    let events = supabase
        .from("events")
        .eq("attempt_id", &attempt_id.to_hex())
        .execute()
        .await
        .map_err(|e| {
            Error::Server(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("supabase http error: {e}"),
            )
        })?;

    let mut events: Vec<config::Event> = events
        .into_iter()
        .filter_map(|event| match serde_json::from_value(event) {
            Ok(event) => Some(event),
            Err(e) => {
                warn!(error = ?e, "unable to deserialize event");
                None
            }
        })
        .collect();

    events.sort_by(|a, b| (a.timestamp).cmp(&b.timestamp));

    Ok(Json(events))
}
