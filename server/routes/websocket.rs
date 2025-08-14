use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use mongodb::bson::oid::ObjectId;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::broadcast;
use tracing::info;

use crate::{
    database::ExamCreatorUser,
    state::{ServerState, SocketEvents, remove_user, set_user_activity},
};

// Shared state for WebSocket exam rooms
static _EXAM_ROOMS: Lazy<Mutex<HashMap<String, broadcast::Sender<String>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

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
