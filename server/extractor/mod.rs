use anyhow::{Context, Result};
use axum::{
    extract::{FromRef, FromRequestParts, Path, Query, State},
    http::request::Parts,
};
use axum_extra::extract::PrivateCookieJar;
use bson::doc;

use axum::extract::ws::WebSocketUpgrade;
use axum::response::IntoResponse;
use http::StatusCode;
use serde::Deserialize;
use tower_sessions::Session;
use tracing::{info, warn};

use crate::{
    database::ExamCreatorUser,
    errors::AppError,
    routes::handle_users_ws,
    state::{Activity, ServerState, User, set_user_activity},
};

impl<S> FromRequestParts<S> for ExamCreatorUser
where
    S: Send + Sync,
    ServerState: FromRef<S>,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> anyhow::Result<Self, Self::Rejection> {
        let state = ServerState::from_ref(state);

        let cookiejar: PrivateCookieJar = PrivateCookieJar::from_request_parts(parts, &state)
            .await
            .context("unable to create cookie jar")
            .unwrap();

        let Some(cookie) = cookiejar.get("sid").map(|cookie| cookie.value().to_owned()) else {
            warn!("no sid in jar");
            return Err((StatusCode::UNAUTHORIZED, "no sid in jar"));
        };

        let user_session = state
            .database
            .exam_creator_session
            .find_one(doc! {"session_id": cookie})
            .await
            .unwrap()
            .ok_or((StatusCode::UNAUTHORIZED, "no existing session"))?;

        let user = state
            .database
            .exam_creator_user
            .find_one(doc! {"_id": user_session.user_id})
            .await
            .unwrap()
            .ok_or((StatusCode::UNAUTHORIZED, "no user account"))?;

        let client_sync = &mut state.client_sync.lock().unwrap();
        if let Some(user) = client_sync.users.iter_mut().find(|u| u.email == user.email) {
            user.activity.last_active = chrono::Utc::now().timestamp_millis() as usize;
        } else {
            let name = user.name.clone();
            let email = user.email.clone();
            let picture = user.picture.clone().unwrap_or_default();
            let activity = Activity {
                exam: None,
                last_active: chrono::Utc::now().timestamp_millis() as usize,
            };
            client_sync.users.push(User {
                name,
                email,
                picture,
                activity,
            });
        }

        Ok(user)
    }
}

#[derive(Deserialize)]
pub struct QueryAuth {
    token: String,
}

pub async fn ws_handler_exam(
    _ws: WebSocketUpgrade,
    Path(exam_id): Path<String>,
    State(_state): State<ServerState>,
    // Token has to be extracted from URL query parameters for now
    // as browser APIs do not support sending custom headers with WebSocket connections
    // TypedHeader(auth_header): TypedHeader<Authorization<Bearer>>,

    // Query(QueryAuth { token }): Query<QueryAuth>,
) -> impl IntoResponse {
    info!("WebSocket connection request for exam_id: {}", exam_id);
    // let token = auth_header.token();

    // todo!()
}

pub async fn ws_handler_users(
    ws: WebSocketUpgrade,
    session: Session,
    State(state): State<ServerState>,
    Query(QueryAuth { token }): Query<QueryAuth>,
) -> Result<impl IntoResponse, AppError> {
    info!("WebSocket connection request for users");

    let cookie = session
        .remove::<String>(&token)
        .await?
        .context("session cookie not behind token")?;

    let session = state
        .database
        .exam_creator_session
        .find_one(doc! { "session_id": cookie})
        .await?
        .context("user session not found")?;

    let user = state
        .database
        .exam_creator_user
        .find_one(doc! {"_id": session.user_id})
        .await?
        .context("user not found")?;

    // Scoped to release lock
    {
        let client_sync = &mut state.client_sync.lock().unwrap();
        // TODO: Might want 3 states for exam activity, because there is no reason to change it here.
        set_user_activity(client_sync, &user.email, None);
    }

    let upgrade_res = ws.on_upgrade(move |socket| handle_users_ws(socket, user, state));
    Ok(upgrade_res)
}
