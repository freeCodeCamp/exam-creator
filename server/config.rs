use std::env::var;

use http::HeaderValue;
use mongodb::bson::oid::ObjectId;
use sentry::types::Dsn;
use serde::{Deserialize, Serialize};
use tracing::{error, warn};

use crate::database::prisma;

#[derive(Clone, Debug)]
pub struct EnvVars {
    /// Allowed origins for CORS
    ///
    /// ALLOWED_ORIGINS=http://localhost:3000,https://myapp.com
    pub allowed_origins: Vec<HeaderValue>,
    /// Cookie key for signing cookies
    ///
    /// Must be 64 bytes
    pub cookie_key: String,
    /// GitHub OAuth Client ID
    pub github_client_id: String,
    /// GitHub OAuth Client Secret
    pub github_client_secret: String,
    /// GitHub OAuth Redirect URL
    pub github_redirect_url: String,
    /// Whether to use mock authentication
    pub mock_auth: bool,
    /// MongoDB URI for production database
    pub mongodb_uri_production: String,
    /// MongoDB URI for staging database
    pub mongodb_uri_staging: String,
    /// Port to run the server on
    pub port: u16,
    /// Request body size limit in bytes
    pub request_body_size_limit: usize,
    /// Request timeout in milliseconds
    pub request_timeout_in_ms: u64,
    /// Sentry DSN
    pub sentry_dsn: Option<String>,
    /// Session TTL in seconds
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

        let request_body_size_limit = match var("REQUEST_BODY_SIZE_LIMIT") {
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

        let request_timeout_in_ms = match var("REQUEST_TIMEOUT_IN_MS") {
            Ok(s) => s
                .parse()
                .expect("REQUEST_TIMEOUT_IN_MS to be valid unsigned integer"),
            Err(_e) => {
                // Note: This could cause the generation stream to end early
                let default_request_timeout = 11_000;
                warn!("REQUEST_TIMEOUT_IN_MS not set. Defaulting to {default_request_timeout}");
                default_request_timeout
            }
        };

        let sentry_dsn = match var("SENTRY_DSN") {
            Ok(dsn_string) => {
                assert!(
                    valid_sentry_dsn(&dsn_string),
                    "SENTRY_DSN is not valid DSN."
                );
                Some(dsn_string)
            }
            Err(_e) => {
                if cfg!(not(debug_assertions)) {
                    panic!("SENTRY_DSN is not allowed to be unset outside of a debug build");
                }
                warn!("SENTRY_DSN not set.");
                None
            }
        };

        let session_ttl_in_s = match var("SESSION_TTL_IN_S") {
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
            sentry_dsn,
            session_ttl_in_s,
        };

        env_vars
    }
}

#[serde_with::serde_as]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Attempt {
    id: ObjectId,
    prerequisites: Vec<ObjectId>,
    deprecated: bool,
    #[serde(rename = "questionSets")]
    question_sets: Vec<AttemptQuestionSet>,
    config: prisma::ExamEnvironmentConfig,
    #[serde(rename = "startTime")]
    #[serde_as(as = "bson::serde_helpers::datetime::AsRfc3339String")]
    start_time: mongodb::bson::DateTime,
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
    #[serde(rename = "submissionTime")]
    submission_time: mongodb::bson::DateTime,
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
        id: _id,
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
            let submission_time = attempt_question.submission_time;

            let attempt_question_set_question = AttemptQuestionSetQuestion {
                id: id.clone(),
                text: text.clone(),
                tags: tags.clone(),
                deprecated: deprecated.clone(),
                audio: audio.clone(),
                answers: answers.clone(),
                selected,
                submission_time,
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

    let start_time = exam_attempt.start_time;

    let attempt = Attempt {
        id: exam_attempt.id,
        prerequisites: prerequisites.clone(),
        deprecated: *deprecated,
        question_sets: attempt_question_sets,
        config: config.clone(),
        start_time,
    };

    attempt
}

/// Validate Exam Config:
/// - `config.name` is not empty
/// - `config.passing_percent` is between 0 and 100
/// - `config.tags` is solvable
/// - `config.question_sets` is solvable
///
/// A "solvable" config means that there are enough sets, questions, and answers to satisfy the constraints
pub fn validate_config(exam: &prisma::ExamCreatorExam) -> Result<(), String> {
    let config = &exam.config;
    let question_sets = &exam.question_sets;

    if config.name.is_empty() {
        return Err("Config name is empty".into());
    }

    if config.passing_percent < 0.0 || config.passing_percent > 100.0 {
        return Err("Config passing percent must be between 0.0 and 100.0".into());
    }

    // For each tag config, generate a map of (tag config, number of questions satisfying tag)
    // If any tag config `number_of_questions` > available questions with that tag, return error
    for tag_config in &config.tags {
        let mut available_questions = 0;
        for question_set in question_sets {
            for question in &question_set.questions {
                let group = &tag_config.group;
                // if `question.tags` includes all of `group`, then it satisfies the tag config
                if group.iter().all(|tag| question.tags.contains(tag)) {
                    available_questions += 1;
                }
            }
        }
        if available_questions < tag_config.number_of_questions as usize {
            return Err(format!(
                "Not enough questions for tag config: {:?}. Available: {}, Required: {}",
                tag_config, available_questions, tag_config.number_of_questions
            ));
        }
    }

    // For each question set config, ensure there are enough question sets of that type
    for qs_config in &config.question_sets {
        let available_question_sets = question_sets
            .iter()
            .filter(|qs| qs._type == qs_config._type)
            .count();
        if available_question_sets < qs_config.number_of_set as usize {
            return Err(format!(
                "Not enough question sets for question set config: {:?}. Available: {}, Required: {}",
                qs_config, available_question_sets, qs_config.number_of_set
            ));
        }
    }

    // For each `config.question_sets.number_of_questions`, ensure there are enough questions in the question sets of that type
    // Tally the total number of questions for a given type
    // Also, ensure for each question_set config, there exists a question set of that type with enough questions
    for qs_config in &config.question_sets {
        let mut total_questions = 0;
        let mut has_enough_in_single_set = false;
        for question_set in question_sets
            .iter()
            .filter(|qs| qs._type == qs_config._type)
        {
            let num_questions_in_set = question_set.questions.len();
            total_questions += num_questions_in_set;
            if num_questions_in_set >= qs_config.number_of_questions as usize {
                has_enough_in_single_set = true;
            }
        }
        if total_questions
            < qs_config.number_of_set as usize * qs_config.number_of_questions as usize
        {
            return Err(format!(
                "Not enough questions overall for question set config: {:?}. Available: {}, Required: {}",
                qs_config,
                total_questions,
                qs_config.number_of_set * qs_config.number_of_questions
            ));
        }
        if !has_enough_in_single_set {
            return Err(format!(
                "No single question set has enough questions for question set config: {:?}",
                qs_config
            ));
        }
    }

    // For each `config.question_sets.number_of_correct_answers` and `number_of_incorrect_answers`, ensure there are enough answers in the question sets of that type
    for qs_config in &config.question_sets {
        for question_set in question_sets
            .iter()
            .filter(|qs| qs._type == qs_config._type)
        {
            for question in &question_set.questions {
                let num_correct_answers = question.answers.iter().filter(|a| a.is_correct).count();
                let num_incorrect_answers =
                    question.answers.iter().filter(|a| !a.is_correct).count();
                if num_correct_answers < qs_config.number_of_correct_answers as usize {
                    return Err(format!(
                        "Not enough correct answers for question {:?} in question set {:?}. Available: {}, Required: {}",
                        question.id,
                        question_set.id,
                        num_correct_answers,
                        qs_config.number_of_correct_answers
                    ));
                }
                if num_incorrect_answers < qs_config.number_of_incorrect_answers as usize {
                    return Err(format!(
                        "Not enough incorrect answers for question {:?} in question set {:?}. Available: {}, Required: {}",
                        question.id,
                        question_set.id,
                        num_incorrect_answers,
                        qs_config.number_of_incorrect_answers
                    ));
                }
            }
        }
    }

    Ok(())
}

fn valid_sentry_dsn(url: &str) -> bool {
    url.parse::<Dsn>().is_ok()
}
