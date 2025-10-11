mod app;
mod config;
mod database;
mod errors;
mod extractor;
mod generation;
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

    let env_vars = EnvVars::new();

    let port = env_vars.port;

    let app = app(env_vars).await.unwrap();

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    info!(
        "Server listening on 0.0.0.0:{} (accessible from any interface)",
        listener.local_addr().unwrap().port()
    );
    info!("Application: http://127.0.0.1:{port}");

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
                info!("Received SIGINT (Ctrl+C), starting graceful shutdown...");
            },
            _ = terminate => {
                info!("Received SIGTERM, starting graceful shutdown...");
            },
        }
    };

    // Run server with graceful shutdown
    if let Err(err) = server.with_graceful_shutdown(shutdown_signal).await {
        tracing::error!("Server error: {}", err);
    }

    info!("Server shutdown complete.");
}
