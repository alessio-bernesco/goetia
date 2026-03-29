// Anthropic Claude API client

use futures::stream::Stream;
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE};
use serde::{Deserialize, Serialize};

use super::streaming::SSEEvent;

/// Available models
pub const CLAUDE_OPUS: &str = "claude-opus-4-6";
pub const CLAUDE_SONNET: &str = "claude-sonnet-4-6";
pub const CLAUDE_HAIKU: &str = "claude-haiku-4-5-20251001";

/// Default model
pub const CLAUDE_OPUS_MODEL: &str = CLAUDE_OPUS;

/// API endpoint
const API_URL: &str = "https://api.anthropic.com/v1/messages";

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageRequest {
    pub model: String,
    pub max_tokens: u32,
    pub system: Vec<SystemBlock>,
    pub messages: Vec<Message>,
    pub stream: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemBlock {
    #[serde(rename = "type")]
    pub type_: String,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_control: Option<CacheControl>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheControl {
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

// ---------------------------------------------------------------------------
// Response types (non-streaming, for reference / error decoding)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    #[serde(rename = "type")]
    pub type_: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiErrorResponse {
    #[serde(rename = "type")]
    pub type_: String,
    pub error: ApiError,
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct AnthropicClient {
    http: reqwest::Client,
    api_key: String,
}

impl AnthropicClient {
    /// Create a new client with the given API key.
    pub fn new(api_key: String) -> Self {
        let http = reqwest::Client::new();
        Self { http, api_key }
    }

    /// Build the required headers for the Anthropic API.
    fn headers(&self) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-api-key",
            HeaderValue::from_str(&self.api_key).expect("invalid api key characters"),
        );
        headers.insert(
            "anthropic-version",
            HeaderValue::from_static("2023-06-01"),
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            "anthropic-beta",
            HeaderValue::from_static("prompt-caching-2024-07-31"),
        );
        headers
    }

    /// Send a streaming message request and return a stream of SSE events.
    pub async fn create_message(
        &self,
        request: MessageRequest,
    ) -> anyhow::Result<impl Stream<Item = anyhow::Result<SSEEvent>>> {
        let response = self
            .http
            .post(API_URL)
            .headers(self.headers())
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Anthropic API error (HTTP {}): {}", status, body);
        }

        Ok(super::streaming::sse_stream(response))
    }
}

// ---------------------------------------------------------------------------
// Convenience builders
// ---------------------------------------------------------------------------

impl SystemBlock {
    /// Create a plain text system block.
    pub fn text(text: impl Into<String>) -> Self {
        Self {
            type_: "text".into(),
            text: text.into(),
            cache_control: None,
        }
    }

    /// Create a text system block with ephemeral cache control.
    pub fn cached(text: impl Into<String>) -> Self {
        Self {
            type_: "text".into(),
            text: text.into(),
            cache_control: Some(CacheControl {
                type_: "ephemeral".into(),
            }),
        }
    }
}

impl Message {
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: "user".into(),
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: "assistant".into(),
            content: content.into(),
        }
    }
}
