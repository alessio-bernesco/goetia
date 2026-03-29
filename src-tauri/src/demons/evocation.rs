// Demon evocation — session management
//
// An evocation session loads the demon's context, opens a streaming conversation
// with Claude Opus, and manages the message flow. At session end, the demon
// updates its own essence and the system archives the chronicle.

use std::sync::atomic::{AtomicBool, Ordering};

use anyhow::{bail, Context, Result};
use chrono::Utc;
use futures::StreamExt;
use tokio::pin;

use crate::api::client::{AnthropicClient, Message, MessageRequest, SystemBlock, CLAUDE_OPUS_MODEL};
use crate::api::streaming::{DemonResponse, SSEEvent, StreamAccumulator};
use crate::crypto::grimoire_hash;
use crate::storage;
use crate::storage::chronicles::{Chronicle, ChronicleMetadata, ChronicleTurn, Role};

/// Global flag: only one evocation at a time.
static SESSION_ACTIVE: AtomicBool = AtomicBool::new(false);

/// State for an active evocation session.
pub struct EvocationSession {
    client: AnthropicClient,
    system_prompt: Vec<SystemBlock>,
    messages: Vec<Message>,
    pub demon_name: String,
    turns: Vec<ChronicleTurn>,
    session_start: chrono::DateTime<Utc>,
    master_key: [u8; 32],
    model: String,
}

/// Result of sending a message to the demon.
pub struct DemonTurnResult {
    pub text: String,
    pub response: Option<DemonResponse>,
}

impl EvocationSession {
    /// Start a new evocation session with the named demon.
    /// Returns an error if another session is already active.
    pub fn new(master_key: &[u8; 32], api_key: String, demon_name: &str, model: String) -> Result<Self> {
        // Enforce single-session constraint
        if SESSION_ACTIVE.swap(true, Ordering::SeqCst) {
            bail!("A session is already active. End the current session before evoking another demon.");
        }

        let system_prompt = match super::context::build_evocation_prompt(master_key, demon_name) {
            Ok(prompt) => prompt,
            Err(e) => {
                SESSION_ACTIVE.store(false, Ordering::SeqCst);
                return Err(e);
            }
        };

        let client = AnthropicClient::new(api_key);

        Ok(Self {
            client,
            system_prompt,
            messages: Vec::new(),
            demon_name: demon_name.to_string(),
            turns: Vec::new(),
            session_start: Utc::now(),
            master_key: *master_key,
            model,
        })
    }

    /// Send a message to the demon and collect the streamed response.
    pub async fn send_message(&mut self, user_message: &str) -> Result<DemonTurnResult> {
        self.messages.push(Message::user(user_message));
        self.turns.push(ChronicleTurn {
            role: Role::Mago,
            content: user_message.to_string(),
            visual_state: None,
        });

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
                    bail!("API error during evocation: {}", message);
                }
            }
        }

        let response_text = accumulator.text().to_string();
        let parsed = accumulator.parse_complete();

        // Record the demon's turn
        let visual_state = parsed.as_ref().and_then(|r| {
            r.state.as_ref().map(|s| serde_json::to_value(s).ok()).flatten()
        });
        self.turns.push(ChronicleTurn {
            role: Role::Demon,
            content: parsed.as_ref().map(|r| r.text.clone()).unwrap_or_else(|| response_text.clone()),
            visual_state,
        });

        self.messages.push(Message::assistant(&response_text));

        Ok(DemonTurnResult {
            text: parsed.as_ref().map(|r| r.text.clone()).unwrap_or(response_text),
            response: parsed,
        })
    }

    /// Inject a past chronicle's conversation into the context as additional messages.
    pub fn inject_chronicle(&mut self, chronicle: &Chronicle) {
        for turn in &chronicle.conversation {
            let msg = match turn.role {
                Role::Mago => Message::user(&turn.content),
                Role::Demon => Message::assistant(&turn.content),
            };
            self.messages.push(msg);
        }
    }

    /// End the session: request essence update from the demon, archive the chronicle.
    /// Returns the updated essence text.
    pub async fn end_session(&mut self) -> Result<String> {
        // Ask the demon to produce its updated essence and chronicle metadata
        let closure_prompt = concat!(
            "La sessione si conclude. Produci il tuo output di chiusura in formato JSON:\n",
            "```json\n",
            "{\n",
            "  \"essence\": \"<la tua essenza aggiornata — memoria sintetica di questa sessione e delle precedenti>\",\n",
            "  \"chronicle\": {\n",
            "    \"summary\": \"<riassunto della sessione nella tua voce>\",\n",
            "    \"topics\": [\"<argomento1>\", \"<argomento2>\"],\n",
            "    \"mood_arc\": [\"<stato iniziale>\", \"<transizione>\", \"<stato finale>\"]\n",
            "  }\n",
            "}\n",
            "```"
        );

        self.messages.push(Message::user(closure_prompt));
        let request = MessageRequest {
            model: self.model.clone(),
            max_tokens: 4096,
            system: self.system_prompt.clone(),
            messages: self.messages.clone(),
            stream: true,
        };

        let stream = self.client.create_message(request).await?;
        pin!(stream);
        let mut accumulator = StreamAccumulator::new();

        while let Some(event) = stream.next().await {
            match event? {
                SSEEvent::ContentBlockDelta { text } => accumulator.push(&text),
                SSEEvent::MessageStop => break,
                SSEEvent::Error { message } => bail!("API error during session closure: {}", message),
            }
        }

        let response_text = accumulator.text().to_string();
        let closure = parse_closure_output(&response_text)?;

        // Update essence
        let meta = storage::read_grimoire_meta(&self.master_key)?;
        let grimoire_hash = grimoire_hash::current_hash_bytes(&meta)?;
        storage::write_essence(&self.master_key, &grimoire_hash, &self.demon_name, &closure.essence)?;

        // Build and archive chronicle
        let session_end = Utc::now();
        let duration = (session_end - self.session_start).num_seconds().max(0) as u64;

        let chronicle = Chronicle {
            metadata: ChronicleMetadata {
                demon_name: self.demon_name.clone(),
                date: self.session_start,
                duration_seconds: duration,
                turn_count: self.turns.len(),
                topics: closure.chronicle.topics,
                mood_arc: closure.chronicle.mood_arc,
                summary: closure.chronicle.summary,
            },
            conversation: self.turns.clone(),
        };

        storage::write_chronicle(&self.master_key, &grimoire_hash, &self.demon_name, &chronicle)?;

        // Release session lock
        SESSION_ACTIVE.store(false, Ordering::SeqCst);

        Ok(closure.essence)
    }

    /// Check if a session is currently active globally.
    pub fn is_session_active() -> bool {
        SESSION_ACTIVE.load(Ordering::SeqCst)
    }

    /// Force-release the session lock (for crash recovery).
    pub fn force_release() {
        SESSION_ACTIVE.store(false, Ordering::SeqCst);
    }
}

impl Drop for EvocationSession {
    fn drop(&mut self) {
        SESSION_ACTIVE.store(false, Ordering::SeqCst);
    }
}

// ---------------------------------------------------------------------------
// Closure output parsing
// ---------------------------------------------------------------------------

#[derive(serde::Deserialize)]
struct ClosureOutput {
    essence: String,
    chronicle: ClosureChronicle,
}

#[derive(serde::Deserialize)]
struct ClosureChronicle {
    summary: String,
    topics: Vec<String>,
    mood_arc: Vec<String>,
}

fn parse_closure_output(response: &str) -> Result<ClosureOutput> {
    let json_str = extract_json_block(response).unwrap_or(response);
    serde_json::from_str(json_str)
        .context("Il modello non ha rispettato il formato mandatorio di chiusura sessione. Atteso: { \"essence\", \"chronicle\": { \"summary\", \"topics\", \"mood_arc\" } }")
}

fn extract_json_block(text: &str) -> Option<&str> {
    let start_marker = "```json";
    let end_marker = "```";
    let start = text.find(start_marker)?;
    let json_start = start + start_marker.len();
    let remaining = &text[json_start..];
    let end = remaining.find(end_marker)?;
    Some(remaining[..end].trim())
}
