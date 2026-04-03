// Migration from legacy flat structure to temple-based structure
//
// Detects if grimoire/ and demons/ exist directly in the root (pre-temple layout)
// and moves them into a new temple directory.

use std::fs;

use anyhow::{Context, Result};
use uuid::Uuid;

use crate::storage::{paths, temples};

/// Check for legacy structure and migrate if found.
/// Returns Some(temple_id) if migration was performed, None otherwise.
/// Called from the frontend boot flow via temple_commands.
#[allow(dead_code)]
pub fn migrate_legacy_structure(master_key: &[u8; 32]) -> Result<Option<String>> {
    let local_dir = paths::local_data_dir()?;
    let legacy_grimoire = local_dir.join("grimoire");
    let legacy_demons = local_dir.join("demons");
    let registry_path = paths::temples_registry_path()?;

    // Only migrate if:
    // 1. No temple registry exists yet
    // 2. Legacy grimoire or demons directory exists
    if registry_path.exists() {
        return Ok(None);
    }

    if !legacy_grimoire.exists() && !legacy_demons.exists() {
        return Ok(None);
    }

    // Generate a new temple UUID
    let temple_id = Uuid::new_v4().to_string();
    let temple_dir = paths::temple_dir(&temple_id)?;

    // Create the temple directory
    fs::create_dir_all(&temple_dir)
        .context("Failed to create temple directory for migration")?;

    // Move grimoire/ into the temple
    if legacy_grimoire.exists() {
        let dest = temple_dir.join("grimoire");
        fs::rename(&legacy_grimoire, &dest)
            .context("Failed to move grimoire directory during migration")?;
    }

    // Move demons/ into the temple
    if legacy_demons.exists() {
        let dest = temple_dir.join("demons");
        fs::rename(&legacy_demons, &dest)
            .context("Failed to move demons directory during migration")?;
    }

    // Ensure demons dir exists even if it wasn't in the legacy layout
    let demons_dir = paths::demons_dir(&temple_id)?;
    fs::create_dir_all(&demons_dir)?;

    // Use a placeholder name — will be replaced by Opus-generated name
    // The caller is responsible for generating the real name via Opus
    let placeholder_name = "MIGRATED//TEMPLE";
    temples::add_temple(master_key, &temple_id, placeholder_name)?;

    Ok(Some(temple_id))
}
