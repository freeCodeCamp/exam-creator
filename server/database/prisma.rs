use mongodb::bson::oid::ObjectId;
use prisma_rust_schema;
use serde::{Deserialize, Serialize};

prisma_rust_schema::import_types!(
    schema_paths = [
        "https://raw.githubusercontent.com/ShaunSHamilton/freeCodeCamp/breaking_prisma-dates/api/prisma/schema.prisma",
        "https://raw.githubusercontent.com/ShaunSHamilton/freeCodeCamp/breaking_prisma-dates/api/prisma/exam-environment.prisma",
        "https://raw.githubusercontent.com/ShaunSHamilton/freeCodeCamp/breaking_prisma-dates/api/prisma/exam-creator.prisma",
    ],
    derive = [Clone, Debug, Serialize, Deserialize],
    include = [
        "ExamEnvironmentExam",
        "ExamCreatorExam",
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

impl From<ExamCreatorExam> for bson::Bson {
    fn from(exam: ExamCreatorExam) -> Self {
        mongodb::bson::serialize_to_bson(&exam).unwrap_or(bson::Bson::Null)
    }
}
