use anyhow::Context;
use axum::{
    Json,
    extract::{
        Path, State,
        ws::{Message, WebSocket},
    },
    http::header::{CACHE_CONTROL, CONTENT_TYPE},
    response::Response,
};
use axum_extra::extract::PrivateCookieJar;
use bson::doc;
use futures_util::TryStreamExt;
use futures_util::{SinkExt, StreamExt};
use mongodb::bson::oid::ObjectId;
use oauth2::CsrfToken;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::broadcast;
use tower_sessions::Session;
use tracing::info;

use crate::{
    database::{ExamCreatorUser, prisma},
    errors::AppError,
    state::{ServerState, SessionUser, SocketEvents, User, remove_user, set_user_activity},
};

pub mod github;

pub async fn discard_exam_state_by_id(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<Json<prisma::EnvExam>, AppError> {
    let original_exam = state
        .database
        .temp_env_exam
        .find_one(doc! {
            "_id": &exam_id
        })
        .await?
        .context(format!("No exam {} found", exam_id))?;

    let client_sync = &mut state.client_sync.lock().unwrap();
    if let Some(exam) = client_sync.exams.iter_mut().find(|e| e.id == exam_id) {
        *exam = original_exam.clone();
    } else {
        info!("No exam in client sync state: {}", exam_id)
    }

    Ok(Json(original_exam))
}

pub async fn get_status_ping() -> Response {
    let mut response = Response::new("pong".into());
    response
        .headers_mut()
        .insert(CACHE_CONTROL, "no-cache".parse().unwrap());
    response
        .headers_mut()
        .insert(CONTENT_TYPE, "text/plain; charset=utf-8".parse().unwrap());
    response
}

/// Get all exams
pub async fn get_exams(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<Vec<prisma::EnvExam>>, AppError> {
    let mut exams_cursor = state.database.temp_env_exam.find(doc! {}).await?;

    let mut exams: Vec<prisma::EnvExam> = vec![];

    while let Some(exam) = exams_cursor.try_next().await? {
        exams.push(exam);
    }

    Ok(Json(exams))
}

pub async fn get_exam_by_id(
    auth_user: ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<Json<prisma::EnvExam>, AppError> {
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
        .database
        .temp_env_exam
        .find_one(doc! { "_id": exam_id })
        .await?
        .with_context(|| "Failed to find exam")?;
    info!("Found exam {exam_id} in database");

    // Update state to reflect user is editing this exam
    let client_sync = &mut state.client_sync.lock().unwrap();
    set_user_activity(client_sync, &auth_user.email, Some(exam_id));

    Ok(Json(exam))
}

/// Create an exam
pub async fn post_exam(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<prisma::EnvExam>, AppError> {
    info!("post_exam");
    let exam = prisma::EnvExam::default();

    state.database.temp_env_exam.insert_one(&exam).await?;

    Ok(Json(exam))
}

/// Update an exam
pub async fn put_exam(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
    Json(exam): Json<prisma::EnvExam>,
) -> Result<Json<prisma::EnvExam>, AppError> {
    if exam.id != exam_id {
        return Err(anyhow::anyhow!(
            "Given exam id {} does not match requested id to edit {}",
            exam.id,
            exam_id
        )
        .into());
    }
    state
        .database
        .temp_env_exam
        .replace_one(doc! { "_id": exam_id }, &exam)
        .await?;

    Ok(Json(exam))
}

// Shared state for WebSocket exam rooms
static _EXAM_ROOMS: Lazy<Mutex<HashMap<String, broadcast::Sender<String>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Get all users online (in state)
pub async fn get_users(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<Vec<User>>, AppError> {
    let users = &state.client_sync.lock().unwrap().users;

    Ok(Json(users.clone()))
}

/// Get current session user
#[axum::debug_handler]
pub async fn get_session_user(
    exam_creator_user: ExamCreatorUser,
    session: Session,
    jar: PrivateCookieJar,
    State(server_state): State<ServerState>,
) -> Result<Json<SessionUser>, AppError> {
    let web_socket_token = CsrfToken::new_random().into_secret();

    let cookie = jar
        .get("sid")
        .map(|cookie| cookie.value().to_owned())
        .context("Unreachable. Protected endpoint.")?;

    session.insert(&web_socket_token, &cookie).await?;

    let users = &server_state
        .client_sync
        .lock()
        .expect("unable to lock client_sync mutex")
        .users;
    let User {
        name,
        email,
        picture,
        activity,
    } = exam_creator_user.to_session(&users);

    let session_user = SessionUser {
        name,
        email,
        picture,
        activity,
        web_socket_token,
    };

    Ok(Json(session_user))
}

/// Logs the user out by deleting the db session(s), and unsetting the sid
///
/// This is not behind auth, but, in practice, requires it.
pub async fn delete_logout(
    user: ExamCreatorUser,
    jar: PrivateCookieJar,
    State(server_state): State<ServerState>,
) -> Result<PrivateCookieJar, AppError> {
    let cookie = jar
        .get("sid")
        .map(|cookie| cookie.value().to_owned())
        .context("Invalid sid")?;

    server_state
        .database
        .exam_creator_session
        .delete_many(doc! {"user_id": &user.id})
        .await
        .context("unable to delete sessions")?;

    Ok(jar.remove(cookie))
}

pub async fn _handle_exam_ws(
    socket: WebSocket,
    auth_user: ExamCreatorUser,
    state: ServerState,
    exam_id: String,
) {
    // By splitting, tasks can be sent and received at the same time.
    let (mut sender, mut receiver) = socket.split();

    let tx = {
        let mut rooms = _EXAM_ROOMS.lock().unwrap();
        rooms
            .entry(exam_id.clone())
            .or_insert_with(|| broadcast::channel(32).0)
            .clone()
    };
    let mut rx = tx.subscribe();

    // Receives messages from other clients in the same exam room, and sends it to the current client.
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            // info!("msg: {}", msg);
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    let client_sync = state.client_sync.clone();
    let id = exam_id.clone();
    let user = auth_user.clone();
    // Receives messages from current client, and sends it to all other client in the same exam room.
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            let msg = text.to_string();
            let sock: SocketEvents =
                serde_json::from_str(&msg).expect("Failed to deserialize message from WebSocket");
            let SocketEvents::ExamUpdate(new_exam) = sock else {
                continue; // Ignore other message types
            };
            {
                let client_sync = &mut client_sync.lock().unwrap();
                if let Some(exam) = client_sync.exams.iter_mut().find(|e| {
                    e.id == ObjectId::parse_str(&id).expect("Unreachable. Invalid exam id.")
                }) {
                    *exam = new_exam.clone();
                } else {
                    client_sync.exams.push(new_exam.clone());
                }

                let exam_id = ObjectId::parse_str(&id).expect("Unreachable. Invalid exam id.");
                set_user_activity(client_sync, &user.email, Some(exam_id));
            }

            let _ = tx.send(msg);
        }
    });

    // If any one of the tasks exit, abort the other.
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    info!(
        "Exam WebSocket connection closed: {}, {}",
        auth_user.email, exam_id
    );
    let client_sync = &mut state.client_sync.lock().unwrap();
    set_user_activity(client_sync, &auth_user.email, None);
}

pub async fn handle_users_ws(socket: WebSocket, auth_user: ExamCreatorUser, state: ServerState) {
    let (mut sender, mut receiver) = socket.split();
    let client_sync = state.client_sync.clone();

    // Spawn a task to send the user list to the client every 5 seconds.
    let mut send_task = tokio::spawn(async move {
        loop {
            // Get the current user list from the server state
            // Lock must not be held across await.
            let users = {
                let client_sync = client_sync.lock().unwrap();
                client_sync.users.clone()
            };
            let users_update = SocketEvents::UsersUpdate(users);
            let item = serde_json::to_string(&users_update).expect("Failed to serialize user list");

            // Send the user list to the client
            if sender.send(item.into()).await.is_err() {
                break;
            }

            // Wait for 5 seconds before sending the next update
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }
    });

    let client_sync = state.client_sync.clone();
    let user = auth_user.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            let msg = text.to_string();
            let sock: SocketEvents =
                serde_json::from_str(&msg).expect("Failed to deserialize message from WebSocket");
            let SocketEvents::ActivityUpdate(activity) = sock else {
                continue; // Ignore other message types
            };
            {
                let client_sync = &mut client_sync.lock().unwrap();

                set_user_activity(client_sync, &user.email, activity.exam);
            }
        }
    });

    // If any one of the tasks exit, abort the other.
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    info!("Users WebSocket connection closed: {}", auth_user.email);
    let client_sync = &mut state.client_sync.lock().unwrap();
    remove_user(client_sync, &auth_user.email);
}
