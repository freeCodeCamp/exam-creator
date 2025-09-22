use std::env::var;

use http::HeaderValue;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use tracing::{error, warn};

use crate::database::prisma;

#[derive(Clone, Debug)]
pub struct EnvVars {
    pub allowed_origins: Vec<HeaderValue>,
    pub cookie_key: String,
    pub github_client_id: String,
    pub github_client_secret: String,
    pub github_redirect_url: String,
    pub mock_auth: bool,
    pub mongodb_uri_production: String,
    pub mongodb_uri_staging: String,
    pub port: u16,
    pub request_body_size_limit: usize,
    pub request_timeout_in_ms: u64,
    pub session_ttl_in_s: u64,
}

impl EnvVars {
    pub fn new() -> Self {
        let port = match var("PORT") {
            Ok(port_string) => port_string.parse().expect("PORT to be parseable as u16"),
            Err(_e) => {
                let default_port = 8080;
                warn!("PORT not set. Defaulting to {default_port}");
                default_port
            }
        };

        let allowed_origins = match var("ALLOWED_ORIGINS") {
            Ok(origins_string) => origins_string
                .split(',')
                .map(|o| match o.parse() {
                    Ok(origin) => origin,
                    Err(e) => {
                        error!("{o} cannot be parsed as HeaderValue");
                        panic!("{}", e);
                    }
                })
                .collect(),
            Err(_e) => {
                let default_allowed_origin = format!("http://127.0.0.1:{port}")
                    .parse::<HeaderValue>()
                    .expect("default origin to be parseable as HeaderValue");
                warn!("No allowed origins set, defaulting to {default_allowed_origin:?}");
                vec![default_allowed_origin]
            }
        };

        let Ok(cookie_key) = var("COOKIE_KEY") else {
            error!("COOKIE_KEY not set");
            panic!("COOKIE_KEY required");
        };
        assert_eq!(cookie_key.len(), 64, "COOKIE_KEY env var must be 64 bytes");

        let mock_auth = match var("MOCK_AUTH") {
            Ok(v) => {
                let mock_auth = v.parse().unwrap_or(false);
                if cfg!(not(debug_assertions)) && mock_auth {
                    panic!("MOCK_AUTH is not allowed to be set to 'true' outside of a debug build");
                }

                warn!("MOCK_AUTH explicitly set to {mock_auth}");
                mock_auth
            }
            Err(_e) => false,
        };

        let github_client_id = match var("GITHUB_CLIENT_ID") {
            Ok(v) => v,
            Err(_e) => {
                // If no value provided, but MOCK_AUTH=true, then default, otherwise panic
                if !mock_auth {
                    error!("GITHUB_CLIENT_ID not set");
                    panic!("GITHUB_CLIENT_ID required");
                }
                "test-dev-string".to_string()
            }
        };
        assert!(
            !github_client_id.is_empty(),
            "GITHUB_CLIENT_ID must not be empty"
        );

        let github_client_secret = match var("GITHUB_CLIENT_SECRET") {
            Ok(v) => v,
            Err(_e) => {
                // If no value provided, but MOCK_AUTH=true, then default, otherwise panic
                if !mock_auth {
                    error!("GITHUB_CLIENT_SECRET not set");
                    panic!("GITHUB_CLIENT_SECRET required");
                }
                "test-dev-string".to_string()
            }
        };
        assert!(
            !github_client_secret.is_empty(),
            "GITHUB_CLIENT_SECRET must not be empty"
        );

        let github_redirect_url = match var("GITHUB_REDIRECT_URL") {
            Ok(u) => u,
            Err(_e) => {
                let url = format!("http://127.0.0.1:{port}/auth/callback/github");
                warn!("GITHUB_REDIRECT_URL not set. Defaulting to {url}");
                url
            }
        };

        let Ok(mongodb_uri_production) = var("MONGODB_URI_PRODUCTION") else {
            error!("MONGODB_URI_PRODUCTION not set");
            panic!("MONGODB_URI_PRODUCTION required");
        };
        assert!(
            !mongodb_uri_production.is_empty(),
            "MONGODB_URI_PRODUCTION must not be empty"
        );
        let Ok(mongodb_uri_staging) = var("MONGODB_URI_STAGING") else {
            error!("MONGODB_URI_STAGING not set");
            panic!("MONGODB_URI_STAGING required");
        };
        assert!(
            !mongodb_uri_staging.is_empty(),
            "MONGODB_URI_STAGING must not be empty"
        );

        let request_body_size_limit = match std::env::var("REQUEST_BODY_SIZE_LIMIT") {
            Ok(s) => s
                .parse()
                .expect("REQUEST_BODY_SIZE_LIMIT to be valid unsigned integer"),
            Err(_e) => {
                let base: usize = 2;
                let exp = 20;
                let default_request_body_size_limit = 5 * base.pow(exp);
                warn!(
                    "REQUEST_BODY_SIZE_LIMIT not set. Defaulting to {default_request_body_size_limit}"
                );
                default_request_body_size_limit
            }
        };

        let request_timeout_in_ms = match std::env::var("REQUEST_TIMEOUT_IN_MS") {
            Ok(s) => s
                .parse()
                .expect("REQUEST_TIMEOUT_IN_MS to be valid unsigned integer"),
            Err(_e) => {
                let default_request_timeout = 5_000;
                warn!("REQUEST_TIMEOUT_IN_MS not set. Defaulting to {default_request_timeout}");
                default_request_timeout
            }
        };

        let session_ttl_in_s = match std::env::var("SESSION_TTL_IN_S") {
            Ok(s) => s
                .parse()
                .expect("SESSION_TTL_IN_S to be valid unsigned integer"),
            Err(_e) => {
                let default_session_ttl_in_s = 3600 * 2;
                warn!("SESSION_TTL_IN_S not set. Defaulting to {default_session_ttl_in_s}");
                default_session_ttl_in_s
            }
        };

        let env_vars = Self {
            allowed_origins,
            cookie_key,
            github_client_id,
            github_client_secret,
            github_redirect_url,
            mock_auth,
            mongodb_uri_production,
            mongodb_uri_staging,
            port,
            request_body_size_limit,
            request_timeout_in_ms,
            session_ttl_in_s,
        };

        env_vars
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Attempt {
    id: ObjectId,
    prerequisites: Vec<ObjectId>,
    deprecated: bool,
    #[serde(rename = "questionSets")]
    question_sets: Vec<AttemptQuestionSet>,
    config: prisma::ExamEnvironmentConfig,
    #[serde(rename = "startTimeInMS")]
    start_time_in_m_s: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AttemptQuestionSet {
    id: ObjectId,
    #[serde(rename = "type")]
    _type: prisma::ExamEnvironmentQuestionType,
    context: Option<String>,
    questions: Vec<AttemptQuestionSetQuestion>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AttemptQuestionSetQuestion {
    id: ObjectId,
    text: String,
    tags: Vec<String>,
    deprecated: bool,
    audio: Option<prisma::ExamEnvironmentAudio>,
    answers: Vec<prisma::ExamEnvironmentAnswer>,
    selected: Vec<ObjectId>,
    #[serde(rename = "submissionTimeInMS")]
    submission_time_in_m_s: i64,
}

/// Constructs an `Attempt`:
/// - Filters questions from exam based on generated exam
/// - Adds submission time from attempt questions
/// - Adds selected answers from attempt
///
/// NOTE: Generated exam is assumed to not be needed,
/// because API ensures attempt only includes answers from assigned generation.
pub fn construct_attempt(
    exam: &prisma::ExamEnvironmentExam,
    exam_attempt: &prisma::ExamEnvironmentExamAttempt,
) -> Attempt {
    let prisma::ExamEnvironmentExam {
        id,
        question_sets,
        config,
        prerequisites,
        deprecated,
        version: _version,
    } = exam;
    // TODO: Can caluclate allocation size from exam
    let mut attempt_question_sets = vec![];

    for question_set in question_sets {
        let prisma::ExamEnvironmentQuestionSet {
            id,
            _type,
            context,
            questions,
        } = question_set;

        // Attempt might not have question set, if related question(s) not answered
        let attempt_question_set = match exam_attempt
            .question_sets
            .iter()
            .find(|qs| qs.id == question_set.id)
        {
            Some(a) => a,
            None => continue,
        };

        let mut attempt_questions = vec![];

        for question in questions {
            let prisma::ExamEnvironmentMultipleChoiceQuestion {
                id,
                text,
                tags,
                audio,
                answers,
                deprecated,
            } = question;

            // Attempt question might not exist if not answered
            let attempt_question = match attempt_question_set.questions.iter().find(|q| q.id == *id)
            {
                Some(a) => a,
                None => continue,
            };

            let selected = attempt_question.answers.clone();
            let submission_time = attempt_question.submission_time_in_m_s;

            let attempt_question_set_question = AttemptQuestionSetQuestion {
                id: id.clone(),
                text: text.clone(),
                tags: tags.clone(),
                deprecated: deprecated.clone(),
                audio: audio.clone(),
                answers: answers.clone(),
                selected,
                submission_time_in_m_s: submission_time,
            };

            attempt_questions.push(attempt_question_set_question);
        }

        let attempt_question_set = AttemptQuestionSet {
            id: id.clone(),
            _type: _type.clone(),
            context: context.clone(),
            questions: attempt_questions,
        };

        attempt_question_sets.push(attempt_question_set);
    }

    let attempt = Attempt {
        id: *id,
        prerequisites: prerequisites.clone(),
        deprecated: *deprecated,
        question_sets: attempt_question_sets,
        config: config.clone(),
        start_time_in_m_s: exam_attempt.start_time_in_m_s,
    };

    attempt
}
