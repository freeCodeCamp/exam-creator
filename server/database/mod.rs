use mongodb::{Collection, bson::oid::ObjectId};
use serde::{Deserialize, Serialize};

use crate::state::{Activity, User};

pub mod prisma;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DocId {
    #[serde(rename = "_id")]
    pub id: ObjectId,
}

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
    pub expires_at: mongodb::bson::DateTime,
}

#[derive(Clone, Debug)]
pub struct Database {
    pub exam_creator_exam: Collection<prisma::ExamCreatorExam>,
    pub exam: Collection<prisma::ExamEnvironmentExam>,
    pub exam_attempt: Collection<prisma::ExamEnvironmentExamAttempt>,
    pub generated_exam: Collection<prisma::ExamEnvironmentGeneratedExam>,
    pub exam_creator_user: Collection<ExamCreatorUser>,
    pub exam_creator_session: Collection<ExamCreatorSession>,
    pub exam_environment_exam_moderation: Collection<prisma::ExamEnvironmentExamModeration>,
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
                    page: "/".to_string(),
                    last_active: chrono::Utc::now().timestamp_millis() as usize,
                },
            }
        }
    }
}

// Needed for projections to work
// TODO: Once prisma_rust_schema allows for `serde(default)` to be configured for struct, this is not needed.
impl TryFrom<bson::Document> for prisma::ExamCreatorExam {
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
        let version = value.get_i64("version")?;

        let exam_creator_exam = prisma::ExamCreatorExam {
            id,
            question_sets,
            config,
            prerequisites,
            deprecated,
            version,
        };

        Ok(exam_creator_exam)
    }
}
