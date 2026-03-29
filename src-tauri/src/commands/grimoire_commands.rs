// Tauri commands: grimoire_exists, deploy_grimoire, validate_grimoire

use serde::Deserialize;
use tauri::State;

use crate::commands::AppState;
use crate::storage;

/// Check if a grimoire exists in the data store.
#[tauri::command]
pub fn grimoire_exists() -> Result<bool, String> {
    storage::grimoire_exists().map_err(|e| e.to_string())
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
pub fn deploy_grimoire(
    state: State<'_, AppState>,
    sections: GrimoireSections,
) -> Result<(), String> {
    let master_key = state.get_master_key()?;

    let section_array: [(&str, &[u8]); 5] = [
        ("identity.md", sections.identity.as_bytes()),
        ("laws.md", sections.laws.as_bytes()),
        ("genesis.md", sections.genesis.as_bytes()),
        ("session.md", sections.session.as_bytes()),
        ("chronicles.md", sections.chronicles.as_bytes()),
    ];

    storage::deploy_grimoire(&master_key, &section_array).map_err(|e| e.to_string())?;

    // Ensure directories exist
    storage::paths::ensure_dirs().map_err(|e| e.to_string())?;

    Ok(())
}

/// Validate grimoire integrity.
#[tauri::command]
pub fn validate_grimoire(state: State<'_, AppState>) -> Result<bool, String> {
    let master_key = state.get_master_key()?;
    storage::validate_grimoire(&master_key).map_err(|e| e.to_string())
}
