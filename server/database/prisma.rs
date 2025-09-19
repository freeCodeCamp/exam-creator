use mongodb::bson::oid::ObjectId;
use prisma_rust_schema;
use serde::{Deserialize, Serialize};

prisma_rust_schema::import_types!(
    schema_path =
        "https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/api/prisma/schema.prisma",
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
            question_sets: vec![],
            retake_time_in_m_s: 24 * 60 * 60 * 1000,
            passing_percent: 80.0,
        }
    }
}
