// SSE streaming handler for token-by-token response processing

use futures::stream::{self, Stream};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Demon structured output
// ---------------------------------------------------------------------------

/// The structured JSON a demon returns inside its message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemonResponse {
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<DemonVisualState>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice: Option<serde_json::Value>,
}

/// Visual parameters the demon can emit to drive the frontend shader.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemonVisualState {
    pub intensity: f64,
    pub valence: f64,
    pub arousal: f64,
    pub color_shift: [f64; 3],
    pub scale_factor: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pulse_override: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub glow_override: Option<f64>,
}

// ---------------------------------------------------------------------------
// SSE event types
// ---------------------------------------------------------------------------

/// Parsed SSE event from the Anthropic streaming API.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SSEEvent {
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { text: String },

    #[serde(rename = "message_stop")]
    MessageStop,

    #[serde(rename = "error")]
    Error { message: String },
}

// ---------------------------------------------------------------------------
// Raw SSE JSON fragments from the API
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct RawDelta {
    #[serde(rename = "type")]
    type_: Option<String>,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawSSEData {
    #[serde(rename = "type")]
    type_: String,
    delta: Option<RawDelta>,
    error: Option<RawError>,
}

#[derive(Debug, Deserialize)]
struct RawError {
    message: String,
}

// ---------------------------------------------------------------------------
// SSE line parser
// ---------------------------------------------------------------------------

/// Parse a single SSE line (the text after `data: `) into an optional event.
/// Returns `None` for lines that don't produce a meaningful event (e.g.
/// `message_start`, `content_block_start`, `ping`, etc.).
pub fn parse_sse_line(line: &str) -> Option<SSEEvent> {
    let json_str = line.strip_prefix("data: ")?;

    // SSE end-of-stream marker
    if json_str.trim() == "[DONE]" {
        return Some(SSEEvent::MessageStop);
    }

    let raw: RawSSEData = serde_json::from_str(json_str).ok()?;

    match raw.type_.as_str() {
        "content_block_delta" => {
            let delta = raw.delta?;
            if delta.type_.as_deref() == Some("text_delta") {
                let text = delta.text?;
                Some(SSEEvent::ContentBlockDelta { text })
            } else {
                None
            }
        }
        "message_stop" => Some(SSEEvent::MessageStop),
        "error" => {
            let err = raw.error?;
            Some(SSEEvent::Error {
                message: err.message,
            })
        }
        _ => None, // message_start, content_block_start, content_block_stop, ping, …
    }
}

// ---------------------------------------------------------------------------
// Stream adapter — reqwest response → Stream<Item = Result<SSEEvent>>
// ---------------------------------------------------------------------------

/// Convert a streaming `reqwest::Response` into an async stream of `SSEEvent`s.
pub fn sse_stream(
    response: reqwest::Response,
) -> impl Stream<Item = anyhow::Result<SSEEvent>> {
    // We split incoming bytes on newlines and feed them through the parser.
    // reqwest gives us a byte-stream; we need to reassemble lines.
    let byte_stream = response.bytes_stream();

    struct LineBuffer {
        buf: String,
    }

    let state = LineBuffer {
        buf: String::new(),
    };

    // Flatten: each chunk may contain zero, one, or multiple SSE events.
    stream::unfold(
        (byte_stream, state),
        |(mut byte_stream, mut state)| async move {
            use futures::TryStreamExt;
            loop {
                // First, try to drain a complete line from the buffer.
                if let Some(pos) = state.buf.find('\n') {
                    let line = state.buf[..pos].trim_end_matches('\r').to_string();
                    state.buf = state.buf[pos + 1..].to_string();

                    if line.is_empty() {
                        continue; // blank line between events
                    }

                    if let Some(event) = parse_sse_line(&line) {
                        return Some((Ok(event), (byte_stream, state)));
                    }
                    continue;
                }

                // Buffer has no complete line — read more bytes.
                match byte_stream.try_next().await {
                    Ok(Some(chunk)) => {
                        let text = String::from_utf8_lossy(&chunk);
                        state.buf.push_str(&text);
                    }
                    Ok(None) => {
                        // Stream ended. Flush remaining buffer.
                        if !state.buf.is_empty() {
                            let line = std::mem::take(&mut state.buf);
                            let line = line.trim().to_string();
                            if let Some(event) = parse_sse_line(&line) {
                                return Some((Ok(event), (byte_stream, state)));
                            }
                        }
                        return None; // done
                    }
                    Err(e) => {
                        return Some((
                            Err(anyhow::anyhow!("stream read error: {}", e)),
                            (byte_stream, state),
                        ));
                    }
                }
            }
        },
    )
}

// ---------------------------------------------------------------------------
// Stream accumulator
// ---------------------------------------------------------------------------

/// Accumulates text deltas from a streaming response, then parses the
/// complete demon JSON when the stream ends.
pub struct StreamAccumulator {
    accumulated: String,
}

impl StreamAccumulator {
    pub fn new() -> Self {
        Self {
            accumulated: String::new(),
        }
    }

    /// Feed a text delta into the accumulator.
    pub fn push(&mut self, text: &str) {
        self.accumulated.push_str(text);
    }

    /// Return the raw accumulated text so far.
    pub fn text(&self) -> &str {
        &self.accumulated
    }

    /// Try to parse the complete accumulated text as a `DemonResponse`.
    /// Handles both raw JSON and markdown-wrapped ```json blocks.
    pub fn parse_complete(&self) -> Option<DemonResponse> {
        // Try raw JSON first
        if let Ok(resp) = serde_json::from_str(&self.accumulated) {
            return Some(resp);
        }
        // Try extracting from ```json block
        let json_str = extract_json_block(&self.accumulated)?;
        serde_json::from_str(json_str).ok()
    }

    /// Try to extract the `"text"` field progressively from partial JSON.
    /// Useful for showing text to the user before the full JSON is complete.
    #[allow(dead_code)]
    pub fn extract_text_progressive(&self) -> Option<String> {
        extract_text_progressive(&self.accumulated)
    }
}

impl Default for StreamAccumulator {
    fn default() -> Self {
        Self::new()
    }
}

/// Extract a JSON block from markdown-wrapped text (```json ... ```).
fn extract_json_block(text: &str) -> Option<&str> {
    let start = text.find("```json")?;
    let json_start = start + "```json".len();
    let remaining = &text[json_start..];
    let end = remaining.find("```")?;
    Some(remaining[..end].trim())
}

#[allow(dead_code)]
/// Try to extract the `"text"` field from potentially incomplete JSON.
///
/// This handles the common pattern where the demon streams a JSON object and
/// the `"text"` field appears early. We look for `"text"` `:` `"...",` and
/// grab whatever is between the quotes, handling escape sequences.
pub fn extract_text_progressive(accumulated: &str) -> Option<String> {
    // Fast path: if it parses as complete JSON, just grab the field.
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(accumulated) {
        return v.get("text").and_then(|t| t.as_str()).map(String::from);
    }

    // Slow path: manually scan for `"text"` followed by `:` and a string value.
    let needle = "\"text\"";
    let idx = accumulated.find(needle)?;
    let after_key = &accumulated[idx + needle.len()..];

    // Skip whitespace and colon
    let after_colon = after_key.trim_start();
    let after_colon = after_colon.strip_prefix(':')?;
    let after_colon = after_colon.trim_start();

    // Expect a quote to open the string value
    let after_colon = after_colon.strip_prefix('"')?;

    // Walk the string, respecting escape sequences
    let mut result = String::new();
    let mut chars = after_colon.chars();
    loop {
        match chars.next() {
            Some('\\') => {
                // Escaped character — take next char literally (simplified)
                if let Some(c) = chars.next() {
                    match c {
                        'n' => result.push('\n'),
                        't' => result.push('\t'),
                        'r' => result.push('\r'),
                        '"' => result.push('"'),
                        '\\' => result.push('\\'),
                        '/' => result.push('/'),
                        _ => {
                            result.push('\\');
                            result.push(c);
                        }
                    }
                } else {
                    // Incomplete escape at end of stream — return what we have
                    break;
                }
            }
            Some('"') => break, // end of string
            Some(c) => result.push(c),
            None => break, // stream ended mid-string — return partial
        }
    }

    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}
