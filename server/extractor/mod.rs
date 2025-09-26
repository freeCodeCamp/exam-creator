use axum::{
    extract::{FromRef, FromRequestParts, Path, Query, State},
    http::request::Parts,
};
use axum_extra::extract::PrivateCookieJar;
use mongodb::bson::doc;

use axum::extract::ws::WebSocketUpgrade;
use axum::response::IntoResponse;
use http::StatusCode;
use serde::Deserialize;
use tower_sessions::Session;
use tracing::{error, info, warn};

use crate::{
    database::prisma,
    errors::Error,
    routes::websocket::handle_users_ws,
    state::{Activity, ServerState, User},
};

impl<S> FromRequestParts<S> for prisma::ExamCreatorUser
where
    S: Send + Sync,
    ServerState: FromRef<S>,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = ServerState::from_ref(state);

        let cookiejar: PrivateCookieJar = PrivateCookieJar::from_request_parts(parts, &state)
            .await
            .map_err(|e| {
                error!("cookie jar could not be constructed: {e:?}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "unable to handle cookies",
                )
            })?;

        let Some(cookie) = cookiejar.get("sid").map(|cookie| cookie.value().to_owned()) else {
            warn!("no sid in jar");
            return Err((StatusCode::UNAUTHORIZED, "no sid in jar"));
        };

        let user_session = state
            .production_database
            .exam_creator_session
            .find_one(doc! {"session_id": cookie})
            .await
            .map_err(|e| {
                error!("db session find op failed: {e:?}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "db session find op failed",
                )
            })?
            .ok_or((StatusCode::UNAUTHORIZED, "no existing session"))?;

        let user = state
            .production_database
            .exam_creator_user
            .find_one(doc! {"_id": user_session.user_id})
            .await
            .map_err(|e| {
                error!("db user find op failed: {e:?}");
                (StatusCode::INTERNAL_SERVER_ERROR, "db user find op failed")
            })?
            .ok_or((StatusCode::UNAUTHORIZED, "no user account"))?;

        let client_sync = &mut state.client_sync.lock().unwrap();
        if let Some(user) = client_sync.users.iter_mut().find(|u| u.email == user.email) {
            user.activity.last_active = chrono::Utc::now().timestamp_millis() as usize;
        } else {
            let name = user.name.clone();
            let email = user.email.clone();
            let picture = user.picture.clone().unwrap_or_default();
            let activity = Activity {
                page: "/".to_string(),
                last_active: chrono::Utc::now().timestamp_millis() as usize,
            };
            let settings = user.settings.clone().unwrap_or_default();
            client_sync.users.push(User {
                name,
                email,
                picture,
                activity,
                settings,
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
) -> Result<impl IntoResponse, Error> {
    info!("WebSocket connection request for users");

    let cookie = session
        .remove::<String>(&token)
        .await?
        .ok_or(Error::Server(
            StatusCode::UNAUTHORIZED,
            format!("session cookie not behind token"),
        ))?;

    let session = state
        .production_database
        .exam_creator_session
        .find_one(doc! { "session_id": cookie})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("user session not found"),
        ))?;

    let user = state
        .production_database
        .exam_creator_user
        .find_one(doc! {"_id": session.user_id})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("user not found: {}", session.user_id),
        ))?;

    let upgrade_res = ws.on_upgrade(move |socket| handle_users_ws(socket, user, state));
    Ok(upgrade_res)
}
