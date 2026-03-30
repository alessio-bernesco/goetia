// Tauri commands: get_model, set_model, list_models

use serde::Serialize;
use tauri::State;

use crate::api::client;
use crate::commands::AppState;

#[derive(Serialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
}

/// List available models.
#[tauri::command]
pub fn list_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo { id: client::CLAUDE_OPUS.to_string(), name: "Opus".to_string() },
        ModelInfo { id: client::CLAUDE_SONNET.to_string(), name: "Sonnet".to_string() },
        ModelInfo { id: client::CLAUDE_HAIKU.to_string(), name: "Haiku".to_string() },
    ]
}

/// Get the currently selected model.
#[tauri::command]
pub fn get_model(state: State<'_, AppState>) -> Result<String, String> {
    state.get_model()
}

/// Get the model used by the active session (evocation or genesis).
#[tauri::command]
pub async fn get_active_model(state: State<'_, AppState>) -> Result<String, String> {
    // Check evocation session first
    if let Some(session) = state.evocation_session.lock().await.as_ref() {
        return Ok(session.model().to_string());
    }
    // Then genesis session
    if let Some(session) = state.genesis_session.lock().await.as_ref() {
        return Ok(session.model().to_string());
    }
    Err("Nessuna sessione attiva".to_string())
}

/// Set the active model.
#[tauri::command]
pub fn set_model(state: State<'_, AppState>, model_id: String) -> Result<(), String> {
    let valid = [client::CLAUDE_OPUS, client::CLAUDE_SONNET, client::CLAUDE_HAIKU];
    if !valid.contains(&model_id.as_str()) {
        return Err(format!("Modello non valido: {}", model_id));
    }
    *state.model.lock().map_err(|e| e.to_string())? = model_id;
    Ok(())
}
