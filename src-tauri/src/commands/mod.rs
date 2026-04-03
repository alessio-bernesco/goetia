pub mod auth_commands;
pub mod chronicle_commands;
pub mod config_commands;
pub mod demon_commands;
pub mod genesis_commands;
pub mod grimoire_commands;
pub mod session_commands;
pub mod sync_commands;
pub mod temple_commands;

use std::sync::Mutex;

use crate::demons::evocation::EvocationSession;
use crate::demons::genesis::GenesisSession;

/// Shared application state managed by Tauri.
pub struct AppState {
    /// Master key loaded after Touch ID authentication.
    pub master_key: Mutex<Option<[u8; 32]>>,
    /// Active temple UUID (set after temple selection).
    pub active_temple: Mutex<Option<String>>,
    /// Active genesis session (at most one). Uses tokio::sync::Mutex for async compatibility.
    pub genesis_session: tokio::sync::Mutex<Option<GenesisSession>>,
    /// Active evocation session (at most one). Uses tokio::sync::Mutex for async compatibility.
    pub evocation_session: tokio::sync::Mutex<Option<EvocationSession>>,
    /// Selected model ID.
    pub model: Mutex<String>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            master_key: Mutex::new(None),
            active_temple: Mutex::new(None),
            genesis_session: tokio::sync::Mutex::new(None),
            evocation_session: tokio::sync::Mutex::new(None),
            model: Mutex::new(crate::api::client::CLAUDE_OPUS.to_string()),
        }
    }

    /// Get the master key, returning an error if not authenticated.
    pub fn get_master_key(&self) -> Result<[u8; 32], String> {
        self.master_key
            .lock()
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Non autenticato. Esegui autenticazione Touch ID.".to_string())
    }

    /// Get the active temple ID, returning an error if no temple is selected.
    pub fn get_active_temple(&self) -> Result<String, String> {
        self.active_temple
            .lock()
            .map_err(|e| e.to_string())?
            .clone()
            .ok_or_else(|| "Nessun tempio selezionato.".to_string())
    }

    /// Get the currently selected model ID.
    pub fn get_model(&self) -> Result<String, String> {
        self.model.lock().map_err(|e| e.to_string()).map(|m| m.clone())
    }
}
