mod app;
mod config;
mod database;
mod errors;
mod extractor;
mod routes;
mod state;

#[cfg(feature = "docker")]
#[tokio::main]
async fn main() {
    use tracing::info;
    use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

    use crate::{app::app, config::EnvVars};

    dotenvy::dotenv().ok();
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| format!("{}=debug", env!("CARGO_CRATE_NAME")).into()),
        )
        // Log to stdout
        .with(tracing_subscriber::fmt::layer().pretty())
        .init();

    info!("Starting server...");

    let mongodb_uri = std::env::var("MONGODB_URI").unwrap();
    info!("MONGODB_URI={mongodb_uri}");

    let env_vars = EnvVars { mongodb_uri };

    let app = app(env_vars).await.unwrap();

    let port = std::env::var("PORT").unwrap_or("3001".to_string());

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    tracing::info!(
        "Listening on http://127.0.0.1:{}",
        listener.local_addr().unwrap().port()
    );

    axum::serve(listener, app).await.unwrap();
}
