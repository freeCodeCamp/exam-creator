use bson::oid::ObjectId;
use prisma_rust_schema;
use serde::{Deserialize, Serialize};

prisma_rust_schema::import_types!(
    schema_path = "./prisma/schema.prisma",
    derive = [Clone, Debug, Serialize, Deserialize],
    include = [
        "EnvExam",
        "EnvQuestionSet",
        "EnvMultipleChoiceQuestion",
        "EnvAudio",
        "EnvQuestionType",
        "EnvConfig",
        "EnvQuestionSetConfig",
        "EnvTagConfig",
        "EnvAnswer",
    ]
);

impl Default for EnvExam {
    fn default() -> Self {
        EnvExam {
            id: ObjectId::new(),
            question_sets: vec![],
            config: Default::default(),
            prerequisites: vec![],
            deprecated: false,
        }
    }
}

impl Default for EnvConfig {
    fn default() -> Self {
        EnvConfig {
            name: String::new(),
            note: String::new(),
            tags: vec![],
            total_time_in_m_s: 2 * 60 * 60 * 1000,
            question_sets: vec![],
            retake_time_in_m_s: 24 * 60 * 60 * 1000,
        }
    }
}
