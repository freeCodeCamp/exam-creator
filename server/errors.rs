use axum::response::{IntoResponse, Response};
use http::StatusCode;
use tracing::error;

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("{0}")]
    Server(StatusCode, String),
    // Froms
    #[error("{0}")]
    MongoDB(#[from] mongodb::error::Error),
    #[error("{0}")]
    ParseError(#[from] url::ParseError),
    #[error("{0}")]
    Reqwest(#[from] reqwest::Error),
    #[error("{0}")]
    SystemTimeError(#[from] std::time::SystemTimeError),
    #[error("{0}")]
    TowerSessions(#[from] tower_sessions::session::Error),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let msg = format!("{}", self.to_string());
        let status: StatusCode = self.into();

        (status, msg).into_response()
    }
}

impl From<Error> for StatusCode {
    fn from(error: Error) -> Self {
        match error {
            Error::Server(c, _) => c,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}
