// Tauri commands: authenticate, store_api_key, has_api_key,
// validate_api_key, delete_api_key, update_api_key, verify_stored_api_key

use tauri::State;

use crate::api::client;
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

/// Validate an API key against the Anthropic API (GET /v1/models, free).
#[tauri::command]
pub async fn validate_api_key(key: String) -> Result<bool, String> {
    client::validate_key(&key).await.map_err(|e| e.to_string())
}

/// Delete the stored API key from Keychain.
#[tauri::command]
pub fn delete_api_key() -> Result<(), String> {
    keychain::delete_api_key().map_err(|e| e.to_string())
}

/// Validate a new key, then atomically replace the stored key.
/// If validation fails, the existing key remains untouched.
#[tauri::command]
pub async fn update_api_key(key: String) -> Result<(), String> {
    let valid = client::validate_key(&key)
        .await
        .map_err(|e| e.to_string())?;
    if !valid {
        return Err("API key non valida".to_string());
    }
    // Delete old key (silently succeeds if none exists)
    keychain::delete_api_key().map_err(|e| e.to_string())?;
    keychain::store_api_key(&key).map_err(|e| e.to_string())
}

/// Verify the currently stored API key is still valid.
#[tauri::command]
pub async fn verify_stored_api_key() -> Result<bool, String> {
    let key = keychain::get_api_key()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Nessuna API key configurata".to_string())?;
    client::validate_key(&key).await.map_err(|e| e.to_string())
}
