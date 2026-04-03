// Secure wipe — overwrite files with random data before deletion

use std::fs;
use std::path::Path;

use anyhow::{Context, Result};

use super::cipher;

/// Secure-wipe all files in a directory recursively, then remove the directory.
pub fn wipe_directory(dir: &Path) -> Result<()> {
    if !dir.exists() {
        return Ok(());
    }

    wipe_recursive(dir)?;

    fs::remove_dir_all(dir)
        .with_context(|| format!("Failed to remove directory: {}", dir.display()))?;

    Ok(())
}

/// Recursively wipe all files in a directory with random data before deletion.
fn wipe_recursive(dir: &Path) -> Result<()> {
    let entries = fs::read_dir(dir)
        .with_context(|| format!("Failed to read directory for wipe: {}", dir.display()))?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            wipe_recursive(&path)?;
        } else if path.is_file() {
            cipher::secure_wipe(&path)?;
        }
    }

    Ok(())
}
