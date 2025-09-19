use axum::extract::MatchedPath;
use axum::extract::Request;
use axum::routing::delete;
use axum::{
    Extension, Router,
    routing::{any, get, post, put},
};
use axum_extra::extract::cookie::Key;
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

use crate::errors::Error;
use crate::{
    database, extractor, routes,
    state::{self, ClientSync, ServerState},
};

use crate::config::EnvVars;

pub async fn app(env_vars: EnvVars) -> Result<Router, Error> {
    info!("Creating app...");
    let mut client_options = ClientOptions::parse(&env_vars.mongodb_uri).await.unwrap();
    client_options.app_name = Some("Exam Creator".to_string());

    let client = mongodb::Client::with_options(client_options).unwrap();

    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        .with_expiry(Expiry::OnInactivity(time::Duration::seconds(10)));

    let database = database::Database {
        exam_creator_exam: client
            .database("freecodecamp")
            .collection("ExamCreatorExam"),
        exam: client
            .database("freecodecamp")
            .collection("ExamEnvironmentExam"),
        exam_attempt: client
            .database("freecodecamp")
            .collection("ExamEnvironmentExamAttempt"),
        exam_environment_challenge: client
            .database("freecodecamp")
            .collection("ExamEnvironmentChallenge"),
        generated_exam: client
            .database("freecodecamp")
            .collection("ExamEnvironmentGeneratedExam"),
        exam_creator_user: client
            .database("freecodecamp")
            .collection("ExamCreatorUser"),
        exam_creator_session: client
            .database("freecodecamp")
            .collection("ExamCreatorSession"),
        exam_environment_exam_moderation: client
            .database("freecodecamp")
            .collection("ExamEnvironmentExamModeration"),
    };

    let client_sync = Arc::new(Mutex::new(ClientSync {
        users: Vec::new(),
        exams: Vec::new(),
    }));

    let server_state = ServerState {
        database,
        client_sync,
        key: Key::from(env_vars.cookie_key.as_bytes()),
        env_vars: env_vars.clone(),
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
            ORIGIN,
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

    let app = Router::new()
        .route("/api/exams", get(routes::exams::get_exams))
        .route("/api/exams", post(routes::exams::post_exam))
        .route("/api/exams/{exam_id}", get(routes::exams::get_exam_by_id))
        .route("/api/exams/{exam_id}", put(routes::exams::put_exam))
        .route("/api/attempts", get(routes::attempts::get_attempts))
        .route(
            "/api/attempts/{attempt_id}",
            get(routes::attempts::get_attempt_by_id),
        )
        .route(
            "/api/moderations",
            get(routes::moderations::get_moderations),
        )
        .route(
            "/api/exam-challenges/{exam_id}",
            get(routes::exam_challenge::get_exam_challenges)
                .put(routes::exam_challenge::put_exam_challenges), // .delete(routes::exam_challenge::delete_exam_challenge),
        )
        .route("/api/users", get(routes::users::get_users))
        .route("/api/users/session", get(routes::users::get_session_user))
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
        .fallback_service(ServeDir::new("dist"))
        .route_service("/", ServeFile::new("dist/index.html"))
        .route_service("/auth/callback/github", ServeFile::new("dist/index.html"))
        .route_service("/moderations", ServeFile::new("dist/index.html"))
        .route_service("/attempts", ServeFile::new("dist/index.html"))
        .route_service("/attempts/{*id}", ServeFile::new("dist/index.html"))
        .route_service("/exams", ServeFile::new("dist/index.html"))
        .route_service("/exams/{*id}", ServeFile::new("dist/index.html"))
        .route_service("/login", ServeFile::new("dist/index.html"))
        .layer(cors)
        .layer(session_layer)
        .layer(TimeoutLayer::new(std::time::Duration::from_secs(
            env_vars.request_timeout_in_ms,
        )))
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
