// Tauri commands: list_chronicles, get_chronicle

use tauri::State;

use crate::commands::AppState;
use crate::storage;

/// List all chronicles for a demon (metadata only, no decryption of content).
#[tauri::command]
pub fn list_chronicles(name: String) -> Result<Vec<storage::ChronicleEntry>, String> {
    storage::list_chronicles(&name).map_err(|e| e.to_string())
}

/// Get a single chronicle (full decrypted conversation).
#[tauri::command]
pub fn get_chronicle(
    state: State<'_, AppState>,
    demon_name: String,
    filename: String,
) -> Result<storage::Chronicle, String> {
    let master_key = state.get_master_key()?;
    storage::read_chronicle(&master_key, &demon_name, &filename).map_err(|e| e.to_string())
}
