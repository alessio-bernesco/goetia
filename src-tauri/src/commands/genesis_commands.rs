// Tauri commands: start_genesis, send_genesis_message, accept_demon, reject_genesis

use tauri::State;

use crate::auth::keychain;
use crate::commands::AppState;
use crate::demons::genesis::{self, GenesisSession};

/// Start a genesis session (demon creation) with the given rank.
#[tauri::command]
pub async fn start_genesis(state: State<'_, AppState>, rank: String) -> Result<(), String> {
    let master_key = state.get_master_key()?;
    let api_key = keychain::get_api_key()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No API key configured".to_string())?;

    let model = crate::storage::demons::rank_to_model(&rank).to_string();
    let session = GenesisSession::new(&master_key, api_key, model, rank).map_err(|e| e.to_string())?;

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

/// Accept the generated demon: parse the last response and persist.
#[tauri::command]
pub async fn accept_demon(
    state: State<'_, AppState>,
    genesis_response: String,
) -> Result<String, String> {
    let master_key = state.get_master_key()?;
    let mut output =
        GenesisSession::parse_genesis_output(&genesis_response).map_err(|e| e.to_string())?;

    // Inject rank from genesis session (mago's choice, not model's)
    let lock = state.genesis_session.lock().await;
    if let Some(session) = lock.as_ref() {
        output.manifest.rank = session.rank().to_string();
    }
    drop(lock);

    let name = output.name.clone();
    genesis::accept_demon(&master_key, &output).map_err(|e| e.to_string())?;

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
