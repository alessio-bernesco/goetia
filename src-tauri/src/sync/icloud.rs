// iCloud Drive file-level sync operations

use std::fs;
use std::path::Path;

use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Sync status
// ---------------------------------------------------------------------------

/// Represents the current state of an iCloud sync operation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum SyncStatus {
    UpToDate,
    Syncing,
    Error(String),
}

// ---------------------------------------------------------------------------
// Availability check
// ---------------------------------------------------------------------------

/// Returns `true` if the iCloud container directory exists on disk.
pub fn is_icloud_available(icloud_dir: &Path) -> bool {
    icloud_dir.is_dir()
}

// ---------------------------------------------------------------------------
// Single-file operations
// ---------------------------------------------------------------------------

/// Copy an encrypted file from the local store into the iCloud container,
/// creating parent directories as needed.
pub fn sync_file_to_icloud(local_path: &Path, icloud_path: &Path) -> Result<()> {
    if !local_path.exists() {
        bail!("Local file does not exist: {}", local_path.display());
    }

    if let Some(parent) = icloud_path.parent() {
        fs::create_dir_all(parent).with_context(|| {
            format!(
                "Failed to create iCloud directory: {}",
                parent.display()
            )
        })?;
    }

    fs::copy(local_path, icloud_path).with_context(|| {
        format!(
            "Failed to copy {} → {}",
            local_path.display(),
            icloud_path.display()
        )
    })?;

    Ok(())
}

/// Copy an encrypted file from iCloud back to the local store,
/// creating parent directories as needed.
pub fn sync_from_icloud(icloud_path: &Path, local_path: &Path) -> Result<()> {
    if !icloud_path.exists() {
        bail!("iCloud file does not exist: {}", icloud_path.display());
    }

    if let Some(parent) = local_path.parent() {
        fs::create_dir_all(parent).with_context(|| {
            format!(
                "Failed to create local directory: {}",
                parent.display()
            )
        })?;
    }

    fs::copy(icloud_path, local_path).with_context(|| {
        format!(
            "Failed to copy {} → {}",
            icloud_path.display(),
            local_path.display()
        )
    })?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Demon-level sync
// ---------------------------------------------------------------------------

/// Sync all encrypted files of a single demon to iCloud.
///
/// Expects the local demon directory at `local_demons_dir/{demon_name}/`
/// and mirrors it into `icloud_demons_dir/{demon_name}/`.
pub fn sync_demon_to_icloud(
    demon_name: &str,
    local_demons_dir: &Path,
    icloud_demons_dir: &Path,
) -> Result<()> {
    let local_demon = local_demons_dir.join(demon_name);
    if !local_demon.is_dir() {
        bail!("Local demon directory not found: {}", local_demon.display());
    }

    let icloud_demon = icloud_demons_dir.join(demon_name);
    sync_directory_recursive(&local_demon, &icloud_demon)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Full sync
// ---------------------------------------------------------------------------

/// Sync everything (grimoire + all demons) from local to iCloud.
///
/// Caller provides the root local data dir and root iCloud data dir.
pub fn sync_all_to_icloud(local_data_dir: &Path, icloud_data_dir: &Path) -> Result<()> {
    if !local_data_dir.is_dir() {
        bail!(
            "Local data directory not found: {}",
            local_data_dir.display()
        );
    }

    // --- grimoire ---
    let local_grimoire = local_data_dir.join("grimoire");
    let icloud_grimoire = icloud_data_dir.join("grimoire");
    if local_grimoire.is_dir() {
        sync_directory_recursive(&local_grimoire, &icloud_grimoire)?;
    }

    // --- demons ---
    let local_demons = local_data_dir.join("demons");
    let icloud_demons = icloud_data_dir.join("demons");
    if local_demons.is_dir() {
        for entry in fs::read_dir(&local_demons).with_context(|| {
            format!("Failed to list demons in {}", local_demons.display())
        })? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name() {
                    let dest = icloud_demons.join(name);
                    sync_directory_recursive(&path, &dest)?;
                }
            }
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Recursively copy every file from `src` into `dst`, preserving directory
/// structure. Only regular files are copied — symlinks and special files are
/// skipped.
fn sync_directory_recursive(src: &Path, dst: &Path) -> Result<()> {
    fs::create_dir_all(dst).with_context(|| {
        format!("Failed to create directory: {}", dst.display())
    })?;

    for entry in fs::read_dir(src).with_context(|| {
        format!("Failed to read directory: {}", src.display())
    })? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if file_type.is_dir() {
            sync_directory_recursive(&src_path, &dst_path)?;
        } else if file_type.is_file() {
            fs::copy(&src_path, &dst_path).with_context(|| {
                format!(
                    "Failed to copy {} → {}",
                    src_path.display(),
                    dst_path.display()
                )
            })?;
        }
        // Symlinks and other entries are intentionally skipped.
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn icloud_unavailable_when_missing() {
        let tmp = TempDir::new().unwrap();
        let missing = tmp.path().join("nonexistent");
        assert!(!is_icloud_available(&missing));
    }

    #[test]
    fn round_trip_file_sync() {
        let tmp = TempDir::new().unwrap();
        let local = tmp.path().join("local/test.enc");
        let icloud = tmp.path().join("icloud/test.enc");

        fs::create_dir_all(local.parent().unwrap()).unwrap();
        fs::write(&local, b"encrypted-data").unwrap();

        sync_file_to_icloud(&local, &icloud).unwrap();
        assert_eq!(fs::read(&icloud).unwrap(), b"encrypted-data");

        // Modify iCloud copy and sync back.
        fs::write(&icloud, b"updated-data").unwrap();
        sync_from_icloud(&icloud, &local).unwrap();
        assert_eq!(fs::read(&local).unwrap(), b"updated-data");
    }
}
