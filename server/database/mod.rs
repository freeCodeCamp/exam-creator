use bson::oid::ObjectId;
use mongodb::Collection;
use serde::{Deserialize, Serialize};

use crate::{
    database::prisma::EnvExam,
    state::{Activity, User},
};

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

// Needed for projections to work
// TODO: Once prisma_rust_schema allows for `serde(default)` to be configured for struct, this is not needed.
impl TryFrom<bson::Document> for EnvExam {
    type Error = crate::errors::Error;
    fn try_from(value: bson::Document) -> Result<Self, Self::Error> {
        let id = value.get_object_id("_id")?;
        let question_sets = bson::from_bson(
            value
                .get("questionSets")
                .unwrap_or(&bson::Bson::Array(vec![]))
                .clone(),
        )
        .unwrap_or_default();
        let config = bson::from_document(value.get_document("config")?.clone())?;
        let prerequisites = bson::from_bson(
            value
                .get("prerequisites")
                .unwrap_or(&bson::Bson::Array(vec![]))
                .clone(),
        )?;
        let deprecated = value.get_bool("deprecated")?;

        let env_exam = EnvExam {
            id,
            question_sets,
            config,
            prerequisites,
            deprecated,
        };

        Ok(env_exam)
    }
}
