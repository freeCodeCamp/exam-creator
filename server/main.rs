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

    let mongodb_uri = match std::env::var("MONGODB_URI") {
        Ok(uri) => {
            info!("MONGODB_URI is set");
            uri
        }
        Err(_) => {
            tracing::warn!("MONGODB_URI environment variable is not set");
            panic!("MONGODB_URI environment variable is required");
        }
    };

    let env_vars = EnvVars { mongodb_uri };

    let app = app(env_vars).await.unwrap();

    let port = std::env::var("PORT").unwrap_or("3001".to_string());

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    tracing::info!(
        "Server listening on 0.0.0.0:{} (accessible from any interface)",
        listener.local_addr().unwrap().port()
    );

    // Setup graceful shutdown
    let server = axum::serve(listener, app);

    // Create shutdown signal handler
    let shutdown_signal = async {
        let ctrl_c = async {
            tokio::signal::ctrl_c()
                .await
                .expect("failed to install Ctrl+C handler");
        };

        #[cfg(unix)]
        let terminate = async {
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("failed to install SIGTERM handler")
                .recv()
                .await;
        };

        #[cfg(not(unix))]
        let terminate = std::future::pending::<()>();

        tokio::select! {
            _ = ctrl_c => {
                tracing::info!("Received SIGINT (Ctrl+C), starting graceful shutdown...");
            },
            _ = terminate => {
                tracing::info!("Received SIGTERM, starting graceful shutdown...");
            },
        }
    };

    // Run server with graceful shutdown
    if let Err(err) = server.with_graceful_shutdown(shutdown_signal).await {
        tracing::error!("Server error: {}", err);
    }

    tracing::info!("Server shutdown complete.");
}
