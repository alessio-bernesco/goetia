// Tauri commands: grimoire_exists, deploy_grimoire, validate_grimoire

use serde::Deserialize;
use tauri::State;

use crate::commands::AppState;
use crate::storage;
use crate::sync::trigger;

/// Check if a grimoire exists in the data store for the active temple.
#[tauri::command]
pub fn grimoire_exists(state: State<'_, AppState>) -> Result<bool, String> {
    let temple_id = state.get_active_temple()?;
    storage::grimoire_exists(&temple_id).map_err(|e| e.to_string())
}

/// Import/deploy a grimoire from 5 plaintext markdown sections.
/// Called during first launch setup.
#[derive(Deserialize)]
pub struct GrimoireSections {
    pub identity: String,
    pub laws: String,
    pub genesis: String,
    pub session: String,
    pub chronicles: String,
}

#[tauri::command]
pub async fn deploy_grimoire(
    state: State<'_, AppState>,
    sections: GrimoireSections,
) -> Result<(), String> {
    let master_key = state.get_master_key()?;
    let temple_id = state.get_active_temple()?;

    let section_array: [(&str, &[u8]); 5] = [
        ("identity.md", sections.identity.as_bytes()),
        ("laws.md", sections.laws.as_bytes()),
        ("genesis.md", sections.genesis.as_bytes()),
        ("session.md", sections.session.as_bytes()),
        ("chronicles.md", sections.chronicles.as_bytes()),
    ];

    storage::deploy_grimoire(&master_key, &temple_id, &section_array).map_err(|e| e.to_string())?;

    // Ensure temple directories exist
    storage::paths::ensure_temple_dirs(&temple_id).map_err(|e| e.to_string())?;

    // Sync grimoire to iCloud
    trigger::sync_grimoire_to_icloud(&temple_id);

    Ok(())
}

/// Validate grimoire integrity.
#[tauri::command]
pub fn validate_grimoire(state: State<'_, AppState>) -> Result<bool, String> {
    let master_key = state.get_master_key()?;
    let temple_id = state.get_active_temple()?;
    storage::validate_grimoire(&master_key, &temple_id).map_err(|e| e.to_string())
}
