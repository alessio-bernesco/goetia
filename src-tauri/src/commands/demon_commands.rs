// Tauri commands: list_demons, get_demon, get_essence, banish_demon

use serde::Serialize;
use tauri::State;

use crate::commands::AppState;
use crate::demons::banishment;
use crate::demons::manifest_generator;
use crate::storage;
use crate::storage::genesis_registry;
use crate::sync::trigger;

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
    let temple_id = state.get_active_temple()?;
    let entries = storage::list_demons(&temple_id).map_err(|e| e.to_string())?;
    let master_key = state.get_master_key().ok();

    let mut result = Vec::new();
    for entry in entries {
        let rank = if let Some(ref key) = master_key {
            storage::read_manifest(key, &temple_id, &entry.name)
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
    let temple_id = state.get_active_temple()?;
    let data = storage::read_demon(&master_key, &temple_id, &name).map_err(|e| e.to_string())?;

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
    let temple_id = state.get_active_temple()?;
    storage::read_essence(&master_key, &temple_id, &name).map_err(|e| e.to_string())
}

/// Banish a demon: Touch ID confirmation + registry removal + secure wipe + remove from local and iCloud.
#[tauri::command]
pub async fn banish_demon(state: State<'_, AppState>, name: String) -> Result<(), String> {
    let master_key = state.get_master_key()?;
    let temple_id = state.get_active_temple()?;
    banishment::banish(&master_key, &temple_id, &name).map_err(|e| e.to_string())?;

    // Remove demon from iCloud mirror
    trigger::remove_demon_from_icloud(&temple_id, &name);

    Ok(())
}

/// Debug: generate a random manifest for the given rank without persisting.
#[tauri::command]
pub fn debug_generate_manifest(
    state: State<'_, AppState>,
    rank: String,
) -> Result<serde_json::Value, String> {
    let master_key = state.get_master_key()?;
    let temple_id = state.get_active_temple()?;
    let registry = genesis_registry::read_registry(&master_key, &temple_id).unwrap_or_default();
    let manifest = manifest_generator::generate_debug_manifest(&rank, &registry);
    serde_json::to_value(&manifest).map_err(|e| e.to_string())
}
