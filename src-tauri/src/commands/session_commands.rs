// Tauri commands: start_session, send_message, end_session, inject_chronicle

use serde::Serialize;
use tauri::State;

use crate::auth::keychain;
use crate::commands::AppState;
use crate::demons::evocation::EvocationSession;
use crate::storage;

#[derive(Serialize)]
pub struct MessageResult {
    pub text: String,
    pub state: Option<serde_json::Value>,
}

/// Start an evocation session with the named demon.
#[tauri::command]
pub async fn start_session(state: State<'_, AppState>, demon_name: String) -> Result<(), String> {
    let master_key = state.get_master_key()?;
    let api_key = keychain::get_api_key()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No API key configured".to_string())?;

    // Read demon's rank from manifest to determine model
    let manifest = crate::storage::demons::read_manifest(&master_key, &demon_name)
        .map_err(|e| e.to_string())?;
    let model = crate::storage::demons::rank_to_model(&manifest.rank).to_string();

    let session =
        EvocationSession::new(&master_key, api_key, &demon_name, model).map_err(|e| e.to_string())?;

    let mut lock = state.evocation_session.lock().await;
    *lock = Some(session);
    Ok(())
}

/// Send a message to the evoked demon.
#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    message: String,
) -> Result<MessageResult, String> {
    let mut lock = state.evocation_session.lock().await;
    let session = lock.as_mut().ok_or("No active evocation session")?;

    let result = session
        .send_message(&message)
        .await
        .map_err(|e| e.to_string())?;

    let visual_state = result
        .response
        .as_ref()
        .and_then(|r| r.state.as_ref())
        .and_then(|s| serde_json::to_value(s).ok());

    Ok(MessageResult {
        text: result.text,
        state: visual_state,
    })
}

/// End the current evocation session. The demon updates its essence and the chronicle is archived.
#[tauri::command]
pub async fn end_session(state: State<'_, AppState>) -> Result<String, String> {
    let mut lock = state.evocation_session.lock().await;
    let session = lock.as_mut().ok_or("No active evocation session")?;

    let essence = session.end_session().await.map_err(|e| e.to_string())?;

    // Clear session
    *lock = None;

    Ok(essence)
}

/// Inject a past chronicle into the active session's context.
#[tauri::command]
pub async fn inject_chronicle(
    state: State<'_, AppState>,
    demon_name: String,
    filename: String,
) -> Result<(), String> {
    let master_key = state.get_master_key()?;

    let chronicle =
        storage::read_chronicle(&master_key, &demon_name, &filename).map_err(|e| e.to_string())?;

    let mut lock = state.evocation_session.lock().await;
    let session = lock.as_mut().ok_or("No active evocation session")?;

    session.inject_chronicle(&chronicle);
    Ok(())
}
