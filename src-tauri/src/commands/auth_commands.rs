// Tauri commands: authenticate, store_api_key, has_api_key

use tauri::State;

use crate::auth::{keychain, touchid};
use crate::commands::AppState;

/// Authenticate via Touch ID. On first launch, also generates master key.
#[tauri::command]
pub fn authenticate(state: State<'_, AppState>) -> Result<(), String> {
    touchid::authenticate("Accesso al Grimorio").map_err(|e| e.to_string())?;

    // Ensure master key exists (generate on first launch)
    let master_key = match keychain::get_master_key().map_err(|e| e.to_string())? {
        Some(key) => key,
        None => {
            keychain::generate_master_key().map_err(|e| e.to_string())?;
            keychain::get_master_key()
                .map_err(|e| e.to_string())?
                .ok_or_else(|| "Failed to retrieve generated master key".to_string())?
        }
    };

    // Store master key in app state
    let key: [u8; 32] = master_key
        .try_into()
        .map_err(|_| "Master key has wrong length".to_string())?;
    *state.master_key.lock().map_err(|e| e.to_string())? = Some(key);

    Ok(())
}

/// Store the Anthropic API key in Keychain.
#[tauri::command]
pub fn store_api_key(key: String) -> Result<(), String> {
    keychain::store_api_key(&key).map_err(|e| e.to_string())
}

/// Check if an API key exists in Keychain.
#[tauri::command]
pub fn has_api_key() -> Result<bool, String> {
    keychain::has_api_key().map_err(|e| e.to_string())
}
