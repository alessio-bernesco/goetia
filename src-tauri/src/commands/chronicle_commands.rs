// Tauri commands: list_chronicles, get_chronicle

use tauri::State;

use crate::commands::AppState;
use crate::storage;

/// List all chronicles for a demon (metadata only, no decryption of content).
#[tauri::command]
pub fn list_chronicles(state: State<'_, AppState>, name: String) -> Result<Vec<storage::ChronicleEntry>, String> {
    let temple_id = state.get_active_temple()?;
    storage::list_chronicles(&temple_id, &name).map_err(|e| e.to_string())
}

/// Get a single chronicle (full decrypted conversation).
#[tauri::command]
pub fn get_chronicle(
    state: State<'_, AppState>,
    demon_name: String,
    filename: String,
) -> Result<storage::Chronicle, String> {
    let master_key = state.get_master_key()?;
    let temple_id = state.get_active_temple()?;
    storage::read_chronicle(&master_key, &temple_id, &demon_name, &filename).map_err(|e| e.to_string())
}
