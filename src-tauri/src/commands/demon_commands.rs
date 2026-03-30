// Tauri commands: list_demons, get_demon, get_essence

use serde::Serialize;
use tauri::State;

use crate::commands::AppState;
use crate::demons::banishment;
use crate::storage;

#[derive(Serialize)]
pub struct DemonInfo {
    pub name: String,
    pub seal: String,
    pub manifest: serde_json::Value,
    pub essence: String,
}

#[derive(Serialize)]
pub struct DemonListEntry {
    pub name: String,
    pub rank: String,
}

/// List all demons with their rank.
#[tauri::command]
pub fn list_demons(state: State<'_, AppState>) -> Result<Vec<DemonListEntry>, String> {
    let entries = storage::list_demons().map_err(|e| e.to_string())?;
    let master_key = state.get_master_key().ok();

    let mut result = Vec::new();
    for entry in entries {
        let rank = if let Some(ref key) = master_key {
            storage::read_manifest(key, &entry.name)
                .map(|m| m.rank)
                .unwrap_or_else(|_| "minor".to_string())
        } else {
            "minor".to_string()
        };
        result.push(DemonListEntry {
            name: entry.name,
            rank,
        });
    }
    Ok(result)
}

/// Get full demon data (seal + manifest + essence).
#[tauri::command]
pub fn get_demon(state: State<'_, AppState>, name: String) -> Result<DemonInfo, String> {
    let master_key = state.get_master_key()?;
    let data = storage::read_demon(&master_key, &name).map_err(|e| e.to_string())?;

    Ok(DemonInfo {
        name: data.name,
        seal: data.seal,
        manifest: serde_json::to_value(&data.manifest).map_err(|e| e.to_string())?,
        essence: data.essence,
    })
}

/// Get a demon's essence (read-only for the user).
#[tauri::command]
pub fn get_essence(state: State<'_, AppState>, name: String) -> Result<String, String> {
    let master_key = state.get_master_key()?;
    storage::read_essence(&master_key, &name).map_err(|e| e.to_string())
}

/// Banish a demon: Touch ID confirmation + secure wipe + remove from local and iCloud.
#[tauri::command]
pub fn banish_demon(name: String) -> Result<(), String> {
    banishment::banish(&name).map_err(|e| e.to_string())
}
