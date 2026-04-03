// Tauri commands: start_genesis, send_genesis_message, accept_demon, reject_genesis

use tauri::State;

use crate::auth::keychain;
use crate::commands::AppState;
use crate::demons::genesis::{self, GenesisSession};
use crate::sync::trigger;

/// Start a genesis session (demon creation) with the given rank.
#[tauri::command]
pub async fn start_genesis(state: State<'_, AppState>, rank: String) -> Result<(), String> {
    let master_key = state.get_master_key()?;
    let temple_id = state.get_active_temple()?;
    let api_key = keychain::get_api_key()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No API key configured".to_string())?;

    let model = crate::storage::demons::rank_to_model(&rank).to_string();
    let session = GenesisSession::new(&master_key, api_key, model, rank, temple_id).map_err(|e| e.to_string())?;

    let mut lock = state.genesis_session.lock().await;
    if lock.is_some() {
        return Err("A genesis session is already active".to_string());
    }
    *lock = Some(session);
    Ok(())
}

/// Send a message in the active genesis conversation.
#[tauri::command]
pub async fn send_genesis_message(
    state: State<'_, AppState>,
    message: String,
) -> Result<String, String> {
    let mut lock = state.genesis_session.lock().await;
    let session = lock.as_mut().ok_or("No active genesis session")?;
    session
        .send_message(&message)
        .await
        .map_err(|e| e.to_string())
}

/// Accept the generated demon: parse the last response, generate manifest, and persist.
#[tauri::command]
pub async fn accept_demon(
    state: State<'_, AppState>,
    genesis_response: String,
) -> Result<String, String> {
    let master_key = state.get_master_key()?;
    let output =
        GenesisSession::parse_genesis_output(&genesis_response).map_err(|e| e.to_string())?;

    // Get rank and temple_id from genesis session (mago's choice)
    let lock = state.genesis_session.lock().await;
    let rank = lock
        .as_ref()
        .map(|s| s.rank().to_string())
        .unwrap_or_else(|| "minor".to_string());
    let temple_id = lock
        .as_ref()
        .map(|s| s.temple_id().to_string())
        .unwrap_or_else(|| state.get_active_temple().unwrap_or_default());
    drop(lock);

    let name = output.name.clone();
    genesis::accept_demon(&master_key, &temple_id, &rank, &output).map_err(|e| e.to_string())?;

    // Sync new demon to iCloud
    trigger::sync_demon_to_icloud(&temple_id, &name);

    // Clear genesis session
    let mut lock = state.genesis_session.lock().await;
    *lock = None;

    Ok(name)
}

/// Reject genesis: discard everything, no trace.
#[tauri::command]
pub async fn reject_genesis(state: State<'_, AppState>) -> Result<(), String> {
    genesis::reject_genesis();
    let mut lock = state.genesis_session.lock().await;
    *lock = None;
    Ok(())
}
