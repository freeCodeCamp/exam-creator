use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use axum::extract::FromRef;
use axum_extra::extract::cookie::Key;
use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use supabase_rs::SupabaseClient;
use tokio::sync::oneshot;
use tracing::error;

use crate::{
    config::EnvVars,
    database::{Database, prisma},
    routes::metrics::{GetAttemptsMetrics, GetExamMetricsById},
};

#[derive(Clone)]
pub struct ServerState {
    pub production_database: Database,
    pub staging_database: Database,
    pub supabase: SupabaseClient,
    pub client_sync: Arc<Mutex<ClientSync>>,
    pub key: Key,
    pub env_vars: EnvVars,
    pub exam_metrics_by_id_cache: Arc<Mutex<Vec<GetExamMetricsById>>>,
    pub attempt_metrics_cache: Arc<Mutex<Cache<Vec<GetAttemptsMetrics>>>>,
    /// Attempts scheduled for deletion after a grace period. Sending on (or dropping)
    /// the sender cancels the pending delete before it runs.
    pub pending_deletes: PendingDeletes,
    /// Time each attempt's moderation page was last opened, so a subsequent moderation
    /// decision can compute time spent reviewing it.
    pub attempt_page_views: AttemptPageViews,
}

/// Maps an attempt id to the cancellation channel for its pending deletion task, tagged with a
/// generation so a completing task only clears its own entry (not a newer reschedule that replaced it).
pub type PendingDeletes = Arc<Mutex<HashMap<ObjectId, (u64, oneshot::Sender<()>)>>>;

/// Maps a moderator id and an attempt id to the time its moderation page was last opened.
pub type AttemptPageViews = Arc<Mutex<HashMap<(ObjectId, ObjectId), bson::DateTime>>>;

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

pub struct Cache<T: Default> {
    pub data: T,
    pub expire_at: std::time::SystemTime,
}

impl<T: Default> Cache<T> {
    pub fn new() -> Self {
        let data: T = Default::default();
        Self {
            data,
            expire_at: std::time::SystemTime::now() + std::time::Duration::from_hours(24), // 1 day
        }
    }
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
