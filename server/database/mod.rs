use mongodb::Collection;
use tracing::info;

use crate::state::{Activity, ServerState, User};

pub mod prisma;

#[derive(Clone, Debug)]
pub struct Database {
    pub exam_creator_exam: Collection<prisma::ExamCreatorExam>,
    pub exam: Collection<prisma::ExamEnvironmentExam>,
    pub exam_environment_challenge: Collection<prisma::ExamEnvironmentChallenge>,
    pub exam_attempt: Collection<prisma::ExamEnvironmentExamAttempt>,
    pub generated_exam: Collection<prisma::ExamEnvironmentGeneratedExam>,
    pub exam_creator_user: Collection<prisma::ExamCreatorUser>,
    pub exam_creator_session: Collection<prisma::ExamCreatorSession>,
    pub exam_environment_exam_moderation: Collection<prisma::ExamEnvironmentExamModeration>,
}

impl prisma::ExamCreatorUser {
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
                settings: self.settings.clone().unwrap_or_default(),
            }
        }
    }
}

pub fn database_environment<'a>(
    state: &'a ServerState,
    user: &prisma::ExamCreatorUser,
) -> &'a Database {
    match user.settings.as_ref().map(|s| &s.database_environment) {
        Some(prisma::ExamCreatorDatabaseEnvironment::Staging) => {
            info!("{}: using staging database", user.email);
            &state.staging_database
        }
        Some(prisma::ExamCreatorDatabaseEnvironment::Production) => {
            info!("{}: using production database", user.email);
            &state.production_database
        }
        _ => {
            info!("{}: using production database (default)", user.email);
            &state.production_database
        }
    }
}
