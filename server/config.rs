use std::env::var;

use http::HeaderValue;
use tracing::{error, warn};

pub struct EnvVars {
    pub allowed_origins: Vec<HeaderValue>,
    pub cookie_key: String,
    pub github_client_id: String,
    pub github_client_secret: String,
    pub github_redirect_url: String,
    pub mongodb_uri: String,
    pub port: u16,
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

        let Ok(github_client_id) = var("GITHUB_CLIENT_ID") else {
            error!("GITHUB_CLIENT_ID not set");
            panic!("GITHUB_CLIENT_ID required");
        };

        let Ok(github_client_secret) = var("GITHUB_CLIENT_SECRET") else {
            error!("GITHUB_CLIENT_SECRET not set");
            panic!("GITHUB_CLIENT_SECRET required");
        };

        let github_redirect_url = match var("GITHUB_REDIRECT_URL") {
            Ok(u) => u,
            Err(_e) => {
                let url = format!("http://127.0.0.1:{port}");
                warn!("GITHUB_REDIRECT_URL not set. Defaulting to {url}");
                url
            }
        };

        let Ok(mongodb_uri) = var("MONGODB_URI") else {
            error!("MONGODB_URI not set");
            panic!("MONGODB_URI required");
        };

        let env_vars = Self {
            allowed_origins,
            cookie_key,
            github_client_id,
            github_client_secret,
            github_redirect_url,
            mongodb_uri,
            port,
        };

        env_vars
    }
}
