use mongodb::bson::oid::ObjectId;
use prisma_rust_schema;
use serde::{Deserialize, Serialize};

prisma_rust_schema::import_types!(
    schema_paths = [
        "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/api/prisma/schema.prisma",
        "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/api/prisma/exam-environment.prisma",
        "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/api/prisma/exam-creator.prisma",
    ],
    derive = [Clone, Debug, Serialize, Deserialize],
    include = [
        "ExamEnvironmentExam",
        "ExamCreatorExam",
        "ExamCreatorUser",
        "ExamCreatorUserSettings",
        "ExamCreatorDatabaseEnvironment",
        "ExamCreatorSession",
        "ExamEnvironmentQuestionSet",
        "ExamEnvironmentMultipleChoiceQuestion",
        "ExamEnvironmentAudio",
        "ExamEnvironmentQuestionType",
        "ExamEnvironmentConfig",
        "ExamEnvironmentQuestionSetConfig",
        "ExamEnvironmentTagConfig",
        "ExamEnvironmentAnswer",
        "ExamEnvironmentExamAttempt",
        "ExamEnvironmentQuestionSetAttempt",
        "ExamEnvironmentMultipleChoiceQuestionAttempt",
        "ExamEnvironmentGeneratedExam",
        "ExamEnvironmentGeneratedQuestionSet",
        "ExamEnvironmentGeneratedMultipleChoiceQuestion",
        "ExamEnvironmentExamModeration",
        "ExamEnvironmentExamModerationStatus",
        "ExamEnvironmentChallenge",
    ],
    patch = [
        struct ExamEnvironmentExamAttempt {
            #[serde(rename = "startTimeInMS")]
            pub start_time_in_m_s: f64
        },
        struct ExamEnvironmentMultipleChoiceQuestionAttempt {
            #[serde(rename = "submissionTimeInMS")]
            pub submission_time_in_m_s: f64
        },
    ]
);

impl Default for ExamCreatorExam {
    fn default() -> Self {
        ExamCreatorExam {
            id: ObjectId::new(),
            question_sets: vec![],
            config: Default::default(),
            prerequisites: vec![],
            deprecated: false,
            version: 1,
        }
    }
}

impl Default for ExamEnvironmentConfig {
    fn default() -> Self {
        ExamEnvironmentConfig {
            name: String::new(),
            note: String::new(),
            tags: vec![],
            total_time_in_m_s: 2 * 60 * 60 * 1000,
            total_time_in_s: Some(2 * 60 * 60),
            question_sets: vec![],
            retake_time_in_m_s: 24 * 60 * 60 * 1000,
            retake_time_in_s: Some(24 * 60 * 60),
            passing_percent: 80.0,
        }
    }
}

impl Default for ExamCreatorUserSettings {
    fn default() -> Self {
        Self {
            database_environment: ExamCreatorDatabaseEnvironment::Production,
        }
    }
}

// Needed for projections to work
// TODO: Once prisma_rust_schema allows for `serde(default)` to be configured for struct, this is not needed.
impl TryFrom<bson::Document> for ExamCreatorExam {
    type Error = crate::errors::Error;
    fn try_from(value: bson::Document) -> Result<Self, Self::Error> {
        let id = value.get_object_id("_id")?;
        let question_sets = bson::deserialize_from_bson(
            value
                .get("questionSets")
                .unwrap_or(&bson::Bson::Array(vec![]))
                .clone(),
        )
        .unwrap_or_default();
        let config = bson::deserialize_from_document(value.get_document("config")?.clone())?;
        let prerequisites = bson::deserialize_from_bson(
            value
                .get("prerequisites")
                .unwrap_or(&bson::Bson::Array(vec![]))
                .clone(),
        )?;
        let deprecated = value.get_bool("deprecated")?;
        let version = match value.get("version") {
            Some(bson::Bson::Int32(v)) => *v as i64,
            Some(bson::Bson::Int64(v)) => *v,
            _ => 1,
        };

        let exam_creator_exam = ExamCreatorExam {
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
