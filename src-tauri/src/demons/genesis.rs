// Demon genesis — model-driven creation protocol
//
// Genesis is a conversation between the user and Claude Opus in "generative entity" mode.
// The model interviews the user, then produces a seal.md and manifest.json.
// The user accepts or rejects; if accepted, the demon is persisted encrypted.

use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};

use crate::api::client::{AnthropicClient, Message, MessageRequest, SystemBlock, CLAUDE_OPUS_MODEL};
use crate::api::streaming::{SSEEvent, StreamAccumulator};
use crate::crypto::grimoire_hash;
use crate::storage;
use crate::storage::demons::DemonManifest;

use futures::StreamExt;
use tokio::pin;

/// State for an in-progress genesis session.
pub struct GenesisSession {
    client: AnthropicClient,
    system_prompt: Vec<SystemBlock>,
    messages: Vec<Message>,
    model: String,
}

/// Parsed genesis output from the model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisOutput {
    pub name: String,
    pub seal: String,
    pub manifest: DemonManifest,
}

impl GenesisSession {
    /// Start a new genesis session.
    /// Loads the grimoire and builds the genesis system prompt.
    pub fn new(master_key: &[u8; 32], api_key: String, model: String) -> Result<Self> {
        let system_prompt = super::context::build_genesis_prompt(master_key)?;
        let client = AnthropicClient::new(api_key);
        Ok(Self {
            client,
            system_prompt,
            messages: Vec::new(),
            model,
        })
    }

    /// Send a message in the genesis conversation and collect the full response.
    pub async fn send_message(&mut self, user_message: &str) -> Result<String> {
        self.messages.push(Message::user(user_message));

        let request = MessageRequest {
            model: self.model.clone(),
            max_tokens: 8192,
            system: self.system_prompt.clone(),
            messages: self.messages.clone(),
            stream: true,
        };

        let stream = self.client.create_message(request).await?;
        pin!(stream);
        let mut accumulator = StreamAccumulator::new();

        while let Some(event) = stream.next().await {
            match event? {
                SSEEvent::ContentBlockDelta { text } => {
                    accumulator.push(&text);
                }
                SSEEvent::MessageStop => break,
                SSEEvent::Error { message } => {
                    bail!("API error during genesis: {}", message);
                }
            }
        }

        let response_text = accumulator.text().to_string();
        self.messages.push(Message::assistant(&response_text));
        Ok(response_text)
    }

    /// Parse the final genesis output from the model's response.
    /// The format is MANDATORY: `{ "name": "...", "seal": "...", "manifest": {...} }`
    /// Any deviation is rejected. No fallback, no adaptation.
    pub fn parse_genesis_output(response: &str) -> Result<GenesisOutput> {
        let json_str = extract_json_block(response)
            .unwrap_or(response);

        let output: GenesisOutput = serde_json::from_str(json_str)
            .context("Il modello non ha rispettato il formato mandatorio di genesi. Atteso: { \"name\", \"seal\", \"manifest\" }")?;

        Ok(output)
    }
}

/// Accept a demon from genesis: encrypt and persist seal, manifest, and empty essence.
pub fn accept_demon(
    master_key: &[u8; 32],
    output: &GenesisOutput,
) -> Result<()> {
    let meta = storage::read_grimoire_meta(master_key)?;
    let grimoire_hash = grimoire_hash::current_hash_bytes(&meta)?;

    storage::create_demon(
        master_key,
        &grimoire_hash,
        &output.name,
        &output.seal,
        &output.manifest,
    )?;

    Ok(())
}

/// Reject a genesis: no files are created, no trace remains.
/// This is a no-op since nothing was persisted during the conversation.
pub fn reject_genesis() {
    // Nothing to clean up — genesis conversation existed only in memory.
}

/// Extract a JSON block from markdown-formatted text (```json ... ```).
fn extract_json_block(text: &str) -> Option<&str> {
    let start_marker = "```json";
    let end_marker = "```";

    let start = text.find(start_marker)?;
    let json_start = start + start_marker.len();
    let remaining = &text[json_start..];
    let end = remaining.find(end_marker)?;
    let json_str = remaining[..end].trim();
    Some(json_str)
}
