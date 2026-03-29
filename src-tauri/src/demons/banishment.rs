// Demon banishment — irreversible destruction
//
// Banishment permanently destroys all artifacts of a demon:
// seal, manifest, essence, and all chronicles.
// Requires explicit Touch ID confirmation.

use std::fs;

use anyhow::{Context, Result};

use crate::auth::touchid;
use crate::crypto::cipher;
use crate::storage::paths;

/// Banish a demon: require Touch ID, secure-wipe all files, remove from local and iCloud.
pub fn banish(demon_name: &str) -> Result<()> {
    // Require fresh Touch ID confirmation for this destructive operation
    touchid::authenticate("Conferma bandimento del demone")?;

    // Wipe local files
    wipe_demon_files(demon_name, &paths::demon_dir(demon_name)?)?;

    // Wipe iCloud files if available
    let icloud_demons = paths::icloud_data_dir()?.join("demons");
    let icloud_demon_dir = icloud_demons.join(demon_name);
    if icloud_demon_dir.exists() {
        wipe_demon_files(demon_name, &icloud_demon_dir)?;
    }

    Ok(())
}

/// Secure-wipe all files in a demon directory, then remove the directory.
fn wipe_demon_files(_demon_name: &str, demon_dir: &std::path::Path) -> Result<()> {
    if !demon_dir.exists() {
        return Ok(());
    }

    // Walk the directory and wipe each file
    wipe_directory_recursive(demon_dir)?;

    // Remove the now-empty directory tree
    fs::remove_dir_all(demon_dir)
        .with_context(|| format!("Failed to remove demon directory: {}", demon_dir.display()))?;

    Ok(())
}

/// Recursively wipe all files in a directory with random data before deletion.
fn wipe_directory_recursive(dir: &std::path::Path) -> Result<()> {
    let entries = fs::read_dir(dir)
        .with_context(|| format!("Failed to read directory for wipe: {}", dir.display()))?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            wipe_directory_recursive(&path)?;
        } else if path.is_file() {
            cipher::secure_wipe(&path)?;
        }
    }

    Ok(())
}
