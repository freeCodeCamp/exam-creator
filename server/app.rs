use axum::extract::MatchedPath;
use axum::extract::Request;
use axum::routing::delete;
use axum::routing::patch;
use axum::{
    Extension, Router,
    routing::{any, get, post, put},
};
use axum_extra::extract::cookie::Key;
use http::StatusCode;
use http::header::ACCEPT;
use http::header::AUTHORIZATION;
use http::header::ORIGIN;
use http::header::SET_COOKIE;
use http::header::X_CONTENT_TYPE_OPTIONS;
use mongodb::options::ClientOptions;
use oauth2::{AuthUrl, ClientId, ClientSecret, RedirectUrl, TokenUrl, basic::BasicClient};
use reqwest::Method;
use std::sync::{Arc, Mutex};
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;
use tower_http::{
    cors::CorsLayer,
    services::{ServeDir, ServeFile},
};
use tower_sessions::{Expiry, MemoryStore, SessionManagerLayer};
use tracing::info;
use tracing::warn;

use crate::errors::Error;
use crate::{
    database, extractor, routes,
    state::{self, ClientSync, ServerState},
};

use crate::config::EnvVars;

pub async fn app(env_vars: EnvVars) -> Result<Router, Error> {
    info!("Creating app...");
    let mut production_client_options = ClientOptions::parse(&env_vars.mongodb_uri_production)
        .await
        .unwrap();
    production_client_options.app_name = Some("Exam Creator".to_string());
    let mut staging_client_options = ClientOptions::parse(&env_vars.mongodb_uri_staging)
        .await
        .unwrap();
    staging_client_options.app_name = Some("Exam Creator".to_string());

    let production_client = mongodb::Client::with_options(production_client_options).unwrap();
    let staging_client = mongodb::Client::with_options(staging_client_options).unwrap();

    // Ensure database is defined in URI with `/<database_name>`
    let production_database = production_client
        .default_database()
        .expect("database must be defined in the MONGODB_URI_PRODUCTION URI");
    let staging_database = staging_client
        .default_database()
        .expect("database must be defined in the MONGODB_URI_STAGING URI");

    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        .with_expiry(Expiry::OnInactivity(time::Duration::seconds(10)));

    let production_database = database::Database {
        exam_creator_exam: production_database.collection("ExamCreatorExam"),
        exam: production_database.collection("ExamEnvironmentExam"),
        exam_attempt: production_database.collection("ExamEnvironmentExamAttempt"),
        exam_environment_challenge: production_database.collection("ExamEnvironmentChallenge"),
        generated_exam: production_database.collection("ExamEnvironmentGeneratedExam"),
        exam_creator_user: production_database.collection("ExamCreatorUser"),
        exam_creator_session: production_database.collection("ExamCreatorSession"),
        exam_environment_exam_moderation: production_database
            .collection("ExamEnvironmentExamModeration"),
    };

    let staging_database = database::Database {
        exam_creator_exam: staging_database.collection("ExamCreatorExam"),
        exam: staging_database.collection("ExamEnvironmentExam"),
        exam_attempt: staging_database.collection("ExamEnvironmentExamAttempt"),
        exam_environment_challenge: staging_database.collection("ExamEnvironmentChallenge"),
        generated_exam: staging_database.collection("ExamEnvironmentGeneratedExam"),
        // Should not be used
        exam_creator_user: staging_database.collection("ExamCreatorUser"),
        // Should not be used
        exam_creator_session: staging_database.collection("ExamCreatorSession"),
        exam_environment_exam_moderation: staging_database
            .collection("ExamEnvironmentExamModeration"),
    };

    let client_sync = Arc::new(Mutex::new(ClientSync {
        users: Vec::new(),
        exams: Vec::new(),
    }));

    let exam_metrics_by_id_cache = Arc::new(Mutex::new(vec![]));

    let server_state = ServerState {
        production_database,
        staging_database,
        client_sync,
        key: Key::from(env_vars.cookie_key.as_bytes()),
        env_vars: env_vars.clone(),
        exam_metrics_by_id_cache,
    };

    tokio::spawn(state::cleanup_online_users(
        Arc::clone(&server_state.client_sync),
        std::time::Duration::from_secs(5 * 60),
    ));

    let cors = CorsLayer::new()
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::CONNECT,
            Method::DELETE,
        ])
        .allow_headers([
            AUTHORIZATION,
            ACCEPT,
            ORIGIN,
            X_CONTENT_TYPE_OPTIONS,
            SET_COOKIE,
        ])
        .allow_credentials(true)
        .allow_origin(env_vars.allowed_origins);

    let github_client_id = ClientId::new(env_vars.github_client_id);

    let github_client_secret = ClientSecret::new(env_vars.github_client_secret);

    let auth_url = AuthUrl::new("https://github.com/login/oauth/authorize".to_string())?;
    let token_url = TokenUrl::new("https://github.com/login/oauth/access_token".to_string())?;

    // Set up the config for the GitHub OAuth2 process.
    let github_client = BasicClient::new(github_client_id)
        .set_client_secret(github_client_secret)
        .set_auth_uri(auth_url)
        .set_token_uri(token_url)
        .set_redirect_uri(RedirectUrl::new(env_vars.github_redirect_url)?);

    let http_client = reqwest::ClientBuilder::new()
        // Following redirects opens the client up to SSRF vulnerabilities.
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    let app = if cfg!(debug_assertions) && env_vars.mock_auth {
        warn!("Debug assertions are enabled; adding dev login route.");
        Router::new().route("/auth/login/dev", post(routes::auth::post_dev_login))
    } else {
        Router::new()
    };

    let app = app
        .route("/api/exams", get(routes::exams::get_exams))
        .route("/api/exams", post(routes::exams::post_exam))
        .route("/api/exams/{exam_id}", get(routes::exams::get_exam_by_id))
        .route("/api/exams/{exam_id}", put(routes::exams::put_exam))
        .route(
            "/api/exams/{exam_id}/seed/staging",
            put(routes::exams::put_exam_by_id_to_staging),
        )
        .route(
            "/api/exams/{exam_id}/seed/production",
            put(routes::exams::put_exam_by_id_to_production),
        )
        .route(
            "/api/exams/{exam_id}/generations/{database_environment}",
            get(routes::exams::get_generations_by_exam_id_with_database_environment)
                .put(routes::exams::put_generations_by_exam_id_with_database_environment),
        )
        .route(
            "/api/exams/{exam_id}/config/validate",
            post(routes::exams::post_validate_config_by_exam_id),
        )
        // .route("/api/attempts", get(routes::attempts::get_attempts))
        .route(
            "/api/metrics/exams",
            get(routes::metrics::get_exams_metrics),
        )
        .route(
            "/api/metrics/exams/{exam_id}",
            get(routes::metrics::get_exam_metrics_by_exam_id),
        )
        .route(
            "/api/attempts/{attempt_id}",
            get(routes::attempts::get_attempt_by_id),
        )
        .route(
            "/api/attempts/{attempt_id}/moderation",
            patch(routes::attempts::patch_moderation_status_by_attempt_id),
        )
        .route("/api/attempts", get(routes::moderations::get_moderations))
        .route(
            "/api/exam-challenges/{exam_id}",
            get(routes::exam_challenge::get_exam_challenges)
                .put(routes::exam_challenge::put_exam_challenges), // .delete(routes::exam_challenge::delete_exam_challenge),
        )
        .route("/api/users", get(routes::users::get_users))
        .route("/api/users/session", get(routes::users::get_session_user))
        .route(
            "/api/users/session/settings",
            put(routes::users::put_user_settings),
        )
        .route(
            "/api/state/exams/{exam_id}",
            put(routes::discard_exam_state_by_id),
        )
        .route(
            "/auth/login/github",
            get(routes::auth::github::github_login_handler),
        )
        .route("/auth/github", get(routes::auth::github::github_handler))
        .route("/auth/logout", delete(routes::auth::delete_logout))
        .route("/status/ping", get(routes::get_status_ping))
        .route("/ws/exam/{exam_id}", any(extractor::ws_handler_exam))
        .route("/ws/users", any(extractor::ws_handler_users))
        .route_service("/", ServeFile::new("dist/index.html"))
        .route_service("/auth/callback/github", ServeFile::new("dist/index.html"))
        .route_service("/attempts", ServeFile::new("dist/index.html"))
        .route_service("/attempts/{*id}", ServeFile::new("dist/index.html"))
        .route_service("/exams", ServeFile::new("dist/index.html"))
        .route_service("/exams/{*id}", ServeFile::new("dist/index.html"))
        .route_service("/metrics", ServeFile::new("dist/index.html"))
        .route_service("/metrics/exams/{*id}", ServeFile::new("dist/index.html"))
        .route_service("/login", ServeFile::new("dist/index.html"))
        .fallback_service(ServeDir::new("dist"))
        .layer(cors)
        .layer(session_layer)
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            std::time::Duration::from_millis(env_vars.request_timeout_in_ms),
        ))
        .layer(RequestBodyLimitLayer::new(env_vars.request_body_size_limit))
        .layer(Extension(github_client))
        .layer(Extension(http_client))
        .layer(
            TraceLayer::new_for_http()
                // Create span for the request and include the matched path. The matched
                // path is useful for figuring out which handler the request was routed to.
                .make_span_with(|req: &Request| {
                    let method = req.method();
                    let uri = req.uri();

                    // axum automatically adds this extension.
                    let matched_path = req
                        .extensions()
                        .get::<MatchedPath>()
                        .map(|matched_path| matched_path.as_str());

                    tracing::debug_span!("request", %method, %uri, matched_path)
                })
                .on_request(|request: &Request, _span: &tracing::Span| {
                    let method = request.method();
                    let uri = request.uri();
                    tracing::debug!("--> {} {}", method, uri);
                })
                .on_response(
                    |response: &axum::http::Response<_>,
                     latency: std::time::Duration,
                     _span: &tracing::Span| {
                        tracing::debug!("<-- {} ({} ms)", response.status(), latency.as_millis());
                    },
                )
                // By default `TraceLayer` will log 5xx
                .on_failure(()),
        )
        .with_state(server_state);

    info!("Successfully created app.");
    Ok(app)
}
