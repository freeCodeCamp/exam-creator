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
use futures_util::TryStreamExt;
use futures_util::{SinkExt, StreamExt};
use http::StatusCode;
use mongodb::bson::doc;
use mongodb::bson::oid::ObjectId;
use oauth2::CsrfToken;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::broadcast;
use tower_sessions::Session;
use tracing::{info, instrument};

use crate::{
    config,
    database::{ExamCreatorUser, prisma},
    errors::Error,
    state::{ServerState, SessionUser, SocketEvents, User, remove_user, set_user_activity},
};

pub mod github;

#[instrument(skip_all, err(Debug))]
pub async fn discard_exam_state_by_id(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<Json<prisma::EnvExam>, Error> {
    let original_exam = state
        .database
        .temp_env_exam
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

/// Get all exams
///
/// The `questionSets` field is removed as not needed, but added in the typing for serialization
#[instrument(skip_all, err(Debug))]
pub async fn get_exams(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<Vec<prisma::EnvExam>>, Error> {
    let mut exams_cursor = state
        .database
        .temp_env_exam
        .clone_with_type::<mongodb::bson::Document>()
        .find(doc! {})
        .projection(doc! {"questionSets": false})
        .await?;

    let mut exams: Vec<prisma::EnvExam> = vec![];

    while let Some(exam) = exams_cursor.try_next().await? {
        let env_exam: prisma::EnvExam = exam.try_into()?;
        exams.push(env_exam);
    }

    Ok(Json(exams))
}

#[instrument(skip_all, err(Debug))]
pub async fn get_exam_by_id(
    _auth_user: ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
) -> Result<Json<prisma::EnvExam>, Error> {
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
    _: ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<prisma::EnvExam>, Error> {
    info!("post_exam");
    let exam = prisma::EnvExam::default();

    state.database.temp_env_exam.insert_one(&exam).await?;

    Ok(Json(exam))
}

/// Update an exam
#[instrument(skip_all, err(Debug))]
pub async fn put_exam(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
    Path(exam_id): Path<ObjectId>,
    Json(exam): Json<prisma::EnvExam>,
) -> Result<Json<prisma::EnvExam>, Error> {
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
#[instrument(skip_all, err(Debug))]
pub async fn get_users(
    _: ExamCreatorUser,
    State(state): State<ServerState>,
) -> Result<Json<Vec<User>>, Error> {
    let users = &state.client_sync.lock().unwrap().users;

    Ok(Json(users.clone()))
}

/// Get current session user
#[instrument(skip_all, err(Debug))]
pub async fn get_session_user(
    exam_creator_user: ExamCreatorUser,
    session: Session,
    jar: PrivateCookieJar,
    State(server_state): State<ServerState>,
) -> Result<Json<SessionUser>, Error> {
    let web_socket_token = CsrfToken::new_random().into_secret();

    let cookie = jar
        .get("sid")
        .map(|cookie| cookie.value().to_owned())
        .ok_or(Error::Server(
            StatusCode::UNAUTHORIZED,
            format!("invalid sid in cookie jar"),
        ))?;

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
#[instrument(skip_all, err(Debug))]
pub async fn delete_logout(
    user: ExamCreatorUser,
    jar: PrivateCookieJar,
    State(server_state): State<ServerState>,
) -> Result<PrivateCookieJar, Error> {
    let cookie = jar
        .get("sid")
        .map(|cookie| cookie.value().to_owned())
        .ok_or(Error::Server(
            StatusCode::UNAUTHORIZED,
            format!("invalid sid in cookie jar"),
        ))?;

    server_state
        .database
        .exam_creator_session
        .delete_many(doc! {"user_id": &user.id})
        .await?;

    Ok(jar.remove(cookie))
}

/// Get all attempts
///
/// TODO: Return only what is needed
///       Could be smarter with fetching exams and attempts as needed
#[instrument(skip_all, err(Debug))]
pub async fn get_attempts(
    _: ExamCreatorUser,
    State(server_state): State<ServerState>,
) -> Result<Json<Vec<config::Attempt>>, Error> {
    let mut exam_attempts = server_state.database.env_exam_attempt.find(doc! {}).await?;

    let exams: Vec<prisma::EnvExam> = server_state
        .database
        .env_exam
        .find(doc! {})
        .await?
        .try_collect()
        .await?;

    let mut attempts = vec![];

    while let Some(exam_attempt) = exam_attempts.try_next().await? {
        let exam = exams
            .iter()
            .find(|e| e.id == exam_attempt.exam_id)
            .ok_or(Error::Server(
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("exam non-existant: {}", exam_attempt.exam_id),
            ))?;

        let attempt = config::construct_attempt(&exam, &exam_attempt);
        attempts.push(attempt);
    }

    Ok(Json(attempts))
}

#[instrument(skip_all, err(Debug))]
pub async fn get_attempt_by_id(
    _: ExamCreatorUser,
    State(server_state): State<ServerState>,
    Path(attempt_id): Path<ObjectId>,
) -> Result<Json<config::Attempt>, Error> {
    let exam_attempt = server_state
        .database
        .env_exam_attempt
        .find_one(doc! {"_id": attempt_id})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("attempt non-existant: {attempt_id}"),
        ))?;

    let exam = server_state
        .database
        .env_exam
        .find_one(doc! {"_id": exam_attempt.exam_id})
        .await?
        .ok_or(Error::Server(
            StatusCode::BAD_REQUEST,
            format!("exam non-existant: {}", exam_attempt.exam_id),
        ))?;

    let attempt = config::construct_attempt(&exam, &exam_attempt);

    Ok(Json(attempt))
}

#[instrument(skip_all, err(Debug))]
pub async fn get_moderations(
    _: ExamCreatorUser,
    State(server_state): State<ServerState>,
) -> Result<Json<Vec<prisma::ExamEnvironmentExamModeration>>, Error> {
    let exam_moderations = server_state
        .database
        .exam_environment_exam_moderation
        .find(doc! {})
        .await?
        .try_collect()
        .await?;

    Ok(Json(exam_moderations))
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

                set_user_activity(client_sync, &user.email, activity.page);
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
