use std::sync::{Arc, Mutex};

use axum::extract::FromRef;
use axum_extra::extract::cookie::Key;
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::{
    config::EnvVars,
    database::{Database, prisma},
    routes::metrics::GetExamMetricsById,
};

#[derive(Clone)]
pub struct ServerState {
    pub production_database: Database,
    pub staging_database: Database,
    pub client_sync: Arc<Mutex<ClientSync>>,
    pub key: Key,
    pub env_vars: EnvVars,
    pub exam_metrics_by_id_cache: Arc<Mutex<Vec<GetExamMetricsById>>>,
}

impl FromRef<ServerState> for Key {
    fn from_ref(state: &ServerState) -> Self {
        state.key.clone()
    }
}

/// Ephemiral sync data form the server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientSync {
    /// Used to store online users' activity
    pub users: Vec<User>,
    /// Updated exams yet to be saved to the database
    pub exams: Vec<prisma::ExamCreatorExam>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub name: String,
    pub email: String,
    pub picture: String,
    pub activity: Activity,
    pub settings: prisma::ExamCreatorUserSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionUser {
    pub name: String,
    pub email: String,
    pub picture: String,
    pub activity: Activity,
    #[serde(rename = "webSocketToken")]
    pub web_socket_token: String,
    pub settings: prisma::ExamCreatorUserSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    /// The pathname of the user's current page
    pub page: String,
    /// The last time the user was active in milliseconds since epoch
    pub last_active: usize,
}

pub async fn cleanup_online_users(
    client_sync: Arc<Mutex<ClientSync>>,
    // How often to check for inactive users
    interval: std::time::Duration,
) {
    // Length of time after which a user is considered inactive
    let timeout = std::time::Duration::from_secs(5 * 60); // 5 minutes

    loop {
        tokio::time::sleep(interval).await; // Wait for the specified interval

        let mut client_sync = client_sync.lock().unwrap();
        let users = &mut client_sync.users;

        users.retain(|user| {
            // Retain users who have been active within the timeout period
            let now = chrono::Utc::now().timestamp_millis() as usize;
            now - user.activity.last_active < timeout.as_millis() as usize
        });
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "kebab-case", tag = "type", content = "data")]
pub enum SocketEvents {
    ExamUpdate(prisma::ExamCreatorExam),
    UsersUpdate(Vec<User>),
    ActivityUpdate(Activity),
}

/// Sets the user's activity
/// If the user is not found, does nothing but logs an error
pub fn set_user_activity(client_sync: &mut ClientSync, email: &str, page: String) {
    match client_sync.users.iter_mut().find(|u| u.email == email) {
        Some(user) => {
            user.activity.page = page;
            user.activity.last_active = chrono::Utc::now().timestamp_millis() as usize;
        }
        None => {
            error!("User {} not found in client sync", email);
        }
    }
}

/// Remove user from users list
pub fn remove_user(client_sync: &mut ClientSync, email: &str) {
    let users = &mut client_sync.users;

    users.retain(|user| user.email != email);
}
