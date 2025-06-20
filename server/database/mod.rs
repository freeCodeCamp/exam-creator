use bson::oid::ObjectId;
use mongodb::Collection;
use serde::{Deserialize, Serialize};

use crate::state::{Activity, User};

pub mod prisma;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExamCreatorUser {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub name: String,
    pub github_id: Option<i64>,
    pub picture: Option<String>,
    pub email: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExamCreatorSession {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub user_id: ObjectId,
    pub session_id: String,
    pub expires_at: u64,
}

#[derive(Clone, Debug)]
pub struct Database {
    pub temp_env_exam: Collection<prisma::EnvExam>,
    pub exam_creator_user: Collection<ExamCreatorUser>,
    pub exam_creator_session: Collection<ExamCreatorSession>,
}

impl ExamCreatorUser {
    pub fn to_session(&self, users: &Vec<User>) -> User {
        if let Some(user) = users.iter().find(|u| u.email == self.email) {
            user.to_owned()
        } else {
            User {
                name: self.name.clone(),
                email: self.email.clone(),
                picture: self.picture.clone().unwrap_or_default(),
                activity: Activity {
                    exam: None,
                    last_active: chrono::Utc::now().timestamp_millis() as usize,
                },
            }
        }
    }
}
