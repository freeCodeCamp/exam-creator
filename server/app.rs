use anyhow::Context;
use anyhow::Result;
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
use tower_http::trace::TraceLayer;
use tower_http::{
    cors::CorsLayer,
    services::{ServeDir, ServeFile},
};
use tower_sessions::{Expiry, MemoryStore, SessionManagerLayer};
use tracing::info;

use crate::{
    database, extractor, routes,
    state::{self, ClientSync, ServerState},
};

use crate::config::EnvVars;

pub async fn app(env_vars: EnvVars) -> Result<Router> {
    info!("Creating app...");
    let mut client_options = ClientOptions::parse(env_vars.mongodb_uri).await.unwrap();
    client_options.app_name = Some("Exam Creator".to_string());

    let client = mongodb::Client::with_options(client_options).unwrap();

    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        .with_expiry(Expiry::OnInactivity(time::Duration::seconds(10)));

    let database = database::Database {
        temp_env_exam: client.database("freecodecamp").collection("EnvExamTemp"),
        exam_creator_user: client
            .database("freecodecamp")
            .collection("ExamCreatorUser"),
        exam_creator_session: client
            .database("freecodecamp")
            .collection("ExamCreatorSession"),
    };

    let client_sync = Arc::new(Mutex::new(ClientSync {
        users: Vec::new(),
        exams: Vec::new(),
    }));

    let cookie_key = std::env::var("COOKIE_KEY").context("COOKIE_KEY env var not set")?;
    assert_eq!(cookie_key.len(), 64, "COOKIE_KEY env var must be 64 bytes");

    let server_state = ServerState {
        database,
        client_sync,
        key: Key::from(cookie_key.as_bytes()),
    };

    tokio::spawn(state::cleanup_online_users(
        Arc::clone(&server_state.client_sync),
        std::time::Duration::from_secs(5 * 60),
    ));

    let origin = std::env::var("ORIGIN").context("ORIGIN env var not set")?;
    let origins = [origin
        .parse()
        .context("ORIGIN env var not valid HeaderValue")?];

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
        // allow requests from any origin
        .allow_origin(origins);

    let github_client_id = ClientId::new(
        std::env::var("GITHUB_CLIENT_ID")
            .context("Missing the GITHUB_CLIENT_ID environment variable.")?,
    );
    let github_client_secret = ClientSecret::new(
        std::env::var("GITHUB_CLIENT_SECRET")
            .context("Missing the GITHUB_CLIENT_SECRET environment variable.")?,
    );
    let auth_url = AuthUrl::new("https://github.com/login/oauth/authorize".to_string())
        .context("Invalid authorization endpoint URL")?;
    let token_url = TokenUrl::new("https://github.com/login/oauth/access_token".to_string())
        .context("Invalid token endpoint URL")?;

    // Set up the config for the GitHub OAuth2 process.
    let github_client = BasicClient::new(github_client_id)
        .set_client_secret(github_client_secret)
        .set_auth_uri(auth_url)
        .set_token_uri(token_url)
        .set_redirect_uri(
            RedirectUrl::new(format!(
                "{}/auth/callback/github",
                origin.trim_end_matches('/')
            ))
            .context("Invalid redirect URL")?,
        );

    let http_client = reqwest::ClientBuilder::new()
        // Following redirects opens the client up to SSRF vulnerabilities.
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .context("Client should build")?;

    let app = Router::new()
        .route("/exams", get(routes::get_exams))
        .route("/exams/{exam_id}", get(routes::get_exam_by_id))
        .route("/exams", post(routes::post_exam))
        .route("/exams/{exam_id}", put(routes::put_exam))
        .route("/users", get(routes::get_users))
        .route("/users/session", get(routes::get_session_user))
        .route(
            "/state/exams/{exam_id}",
            put(routes::discard_exam_state_by_id),
        )
        .route(
            "/auth/login/github",
            get(routes::github::github_login_handler),
        )
        .route(
            "/auth/callback/github",
            get(routes::github::github_callback_handler),
        )
        .route("/auth/logout", delete(routes::delete_logout))
        .route("/status/ping", get(routes::get_status_ping))
        .route("/ws/exam/{exam_id}", any(extractor::ws_handler_exam))
        .route("/ws/users", any(extractor::ws_handler_users))
        .fallback_service(ServeDir::new("dist").fallback(ServeFile::new("dist/index.html")))
        .layer(cors)
        .layer(session_layer)
        .layer(Extension(github_client))
        .layer(Extension(http_client))
        // Add tracing for all requests
        // .layer(axum::middleware::from_fn(
        //     |req: axum::http::Request<axum::body::Body>, next: axum::middleware::Next| async move {
        //         let uri = req.uri().to_string();
        //         let reduced_uri = uri.split("access_token=").collect::<Vec<_>>();
        //         debug!("{} {}", req.method(), reduced_uri.get(0).unwrap());
        //         let response = next.run(req).await;
        //         debug!("Status: {}", response.status());
        //         response
        //     },
        // ))
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
                // By default `TraceLayer` will log 5xx
                .on_failure(()),
        )
        .with_state(server_state);

    info!("Successfully created app.");
    Ok(app)
}
