// Tauri commands: list_temples, select_temple, create_temple

use serde::Serialize;
use tauri::State;
use uuid::Uuid;

use crate::auth::{keychain, touchid};
use crate::commands::AppState;
use crate::crypto::wipe;
use crate::storage::{self, migration, paths, temples};
use crate::sync::{pull, trigger};

/// Temple naming prompt — hardcoded, not configurable.
const TEMPLE_NAMING_PROMPT: &str = r#"You are the naming oracle of a digital grimoire system.

Generate a single name for a new temple — a sealed partition in a vast cybernetic construct. The name should feel like:
- A node designation in a network that predates human memory
- A coordinate in Gibson's cyberspace, post-Neuromancer
- Something an AI would call a subdivision of its own consciousness

Constraints:
- Between 2 and 4 segments
- Use separators like // . ∞ :: → Ø
- May include numbers, roman numerals, or single digits
- All uppercase
- No spaces within segments
- No recognizable English words — use fragments, truncations, invented morphemes
- Must feel alien but pronounceable if you tried
- Maximum 30 characters total

Return ONLY the name. Nothing else."#;

/// Temple info returned to frontend.
#[derive(Serialize)]
pub struct TempleInfo {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub demon_count: usize,
}

/// Initialize temples: pull from iCloud if needed, migrate legacy structure, return temple list.
/// Called once after Touch ID authentication.
#[tauri::command]
pub fn init_temples(state: State<'_, AppState>) -> Result<Vec<TempleInfo>, String> {
    let master_key = state.get_master_key()?;

    // Ensure root data directory exists
    paths::ensure_root_dir().map_err(|e| e.to_string())?;

    // Step 1: Pull from iCloud if local is empty
    let _ = pull::pull_from_icloud_if_needed();

    // Step 2: Migrate legacy flat structure if present
    let _ = migration::migrate_legacy_structure(&master_key);

    // Step 3: Return temple list
    list_temples_inner(&master_key)
}

/// List all temples with demon count.
#[tauri::command]
pub fn list_temples(state: State<'_, AppState>) -> Result<Vec<TempleInfo>, String> {
    let master_key = state.get_master_key()?;
    list_temples_inner(&master_key)
}

fn list_temples_inner(master_key: &[u8; 32]) -> Result<Vec<TempleInfo>, String> {
    let entries = temples::list_temples(master_key).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for entry in entries {
        let demon_count = storage::list_demons(&entry.id)
            .map(|d| d.len())
            .unwrap_or(0);
        result.push(TempleInfo {
            id: entry.id,
            name: entry.name,
            created_at: entry.created_at.to_rfc3339(),
            demon_count,
        });
    }
    Ok(result)
}

/// Select a temple as the active temple.
#[tauri::command]
pub fn select_temple(state: State<'_, AppState>, temple_id: String) -> Result<(), String> {
    let mut lock = state.active_temple.lock().map_err(|e| e.to_string())?;
    *lock = Some(temple_id);
    Ok(())
}

/// Create a new temple: generate name via Opus, create directory, update registry.
#[tauri::command]
pub async fn create_temple(state: State<'_, AppState>) -> Result<TempleInfo, String> {
    let master_key = state.get_master_key()?;
    let api_key = keychain::get_api_key()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No API key configured".to_string())?;

    // Generate temple name via Opus
    let name = generate_temple_name(&api_key).await.map_err(|e| e.to_string())?;

    // Create UUID for the temple
    let temple_id = Uuid::new_v4().to_string();

    // Create directory structure
    paths::ensure_temple_dirs(&temple_id).map_err(|e| e.to_string())?;

    // Add to registry
    let entry = temples::add_temple(&master_key, &temple_id, &name).map_err(|e| e.to_string())?;

    // Sync temple directory and registry to iCloud
    trigger::sync_temple_to_icloud(&temple_id);
    trigger::sync_registry_to_icloud();

    Ok(TempleInfo {
        id: entry.id,
        name: entry.name,
        created_at: entry.created_at.to_rfc3339(),
        demon_count: 0,
    })
}

/// Destroy a temple: Touch ID confirmation, secure wipe, remove from registry and iCloud.
#[tauri::command]
pub async fn destroy_temple(state: State<'_, AppState>, temple_id: String) -> Result<(), String> {
    let master_key = state.get_master_key()?;

    // Verify temple exists
    let registry = temples::list_temples(&master_key).map_err(|e| e.to_string())?;
    if !registry.iter().any(|t| t.id == temple_id) {
        return Err(format!("Tempio '{}' non trovato.", temple_id));
    }

    // Require fresh Touch ID confirmation
    touchid::authenticate("Conferma distruzione del tempio").map_err(|e| e.to_string())?;

    // Secure wipe the temple directory
    let temple_dir = paths::temple_dir(&temple_id).map_err(|e| e.to_string())?;
    wipe::wipe_directory(&temple_dir).map_err(|e| e.to_string())?;

    // Remove from registry
    temples::remove_temple(&master_key, &temple_id).map_err(|e| e.to_string())?;

    // Remove from iCloud mirror
    trigger::remove_temple_from_icloud(&temple_id);
    trigger::sync_registry_to_icloud();

    Ok(())
}

/// Generate a temple name by calling Opus with the hardcoded prompt.
async fn generate_temple_name(api_key: &str) -> anyhow::Result<String> {
    use crate::api::client::{AnthropicClient, Message, MessageRequest, SystemBlock, CLAUDE_OPUS};
    use crate::api::streaming::{SSEEvent, StreamAccumulator};
    use futures::StreamExt;
    use tokio::pin;

    let client = AnthropicClient::new(api_key.to_string());

    let request = MessageRequest {
        model: CLAUDE_OPUS.to_string(),
        max_tokens: 64,
        system: vec![SystemBlock::text(TEMPLE_NAMING_PROMPT)],
        messages: vec![Message::user("Generate.")],
        stream: true,
    };

    let stream = client.create_message(request).await?;
    pin!(stream);
    let mut accumulator = StreamAccumulator::new();

    while let Some(event) = stream.next().await {
        match event? {
            SSEEvent::ContentBlockDelta { text } => accumulator.push(&text),
            SSEEvent::MessageStop => break,
            SSEEvent::Error { message } => {
                anyhow::bail!("API error during temple naming: {}", message);
            }
        }
    }

    let name = accumulator.text().trim().to_string();
    if name.is_empty() {
        anyhow::bail!("Opus returned empty temple name");
    }

    Ok(name)
}
