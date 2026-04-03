// Filesystem path resolution for local data store and iCloud container
// All temple-scoped paths require a temple_id (UUID) parameter.

use std::fs;
use std::path::PathBuf;

use anyhow::{Context, Result};

// ---------------------------------------------------------------------------
// Global paths (not temple-scoped)
// ---------------------------------------------------------------------------

/// Local data directory: ~/Library/Application Support/Goetia/
pub fn local_data_dir() -> Result<PathBuf> {
    let home = dirs_base()?.join("Library/Application Support/Goetia");
    Ok(home)
}

/// iCloud Drive directory: ~/Library/Mobile Documents/com~apple~CloudDocs/Goetia/
pub fn icloud_data_dir() -> Result<PathBuf> {
    let home = dirs_base()?.join("Library/Mobile Documents/com~apple~CloudDocs/Goetia");
    Ok(home)
}

/// Lock PID file path: {local}/lock.pid
pub fn lock_pid_path() -> Result<PathBuf> {
    Ok(local_data_dir()?.join("lock.pid"))
}

/// Temple registry path: {local}/temples.json.enc
pub fn temples_registry_path() -> Result<PathBuf> {
    Ok(local_data_dir()?.join("temples.json.enc"))
}

/// iCloud temple registry path: {icloud}/temples.json.enc
pub fn icloud_temples_registry_path() -> Result<PathBuf> {
    Ok(icloud_data_dir()?.join("temples.json.enc"))
}

// ---------------------------------------------------------------------------
// Temple-scoped local paths
// ---------------------------------------------------------------------------

/// Temple root directory: {local}/{temple_id}/
pub fn temple_dir(temple_id: &str) -> Result<PathBuf> {
    Ok(local_data_dir()?.join(temple_id))
}

/// Grimoire directory: {local}/{temple_id}/grimoire/
pub fn grimoire_dir(temple_id: &str) -> Result<PathBuf> {
    Ok(temple_dir(temple_id)?.join("grimoire"))
}

/// All demons directory: {local}/{temple_id}/demons/
pub fn demons_dir(temple_id: &str) -> Result<PathBuf> {
    Ok(temple_dir(temple_id)?.join("demons"))
}

/// Single demon directory: {local}/{temple_id}/demons/{name}/
pub fn demon_dir(temple_id: &str, name: &str) -> Result<PathBuf> {
    Ok(demons_dir(temple_id)?.join(name))
}

/// Demon seal path: {local}/{temple_id}/demons/{name}/seal.md.enc
pub fn demon_seal_path(temple_id: &str, name: &str) -> Result<PathBuf> {
    Ok(demon_dir(temple_id, name)?.join("seal.md.enc"))
}

/// Demon manifest path: {local}/{temple_id}/demons/{name}/manifest.json.enc
pub fn demon_manifest_path(temple_id: &str, name: &str) -> Result<PathBuf> {
    Ok(demon_dir(temple_id, name)?.join("manifest.json.enc"))
}

/// Demon essence path: {local}/{temple_id}/demons/{name}/essence.md.enc
pub fn demon_essence_path(temple_id: &str, name: &str) -> Result<PathBuf> {
    Ok(demon_dir(temple_id, name)?.join("essence.md.enc"))
}

/// Demon chronicles directory: {local}/{temple_id}/demons/{name}/chronicles/
pub fn demon_chronicles_dir(temple_id: &str, name: &str) -> Result<PathBuf> {
    Ok(demon_dir(temple_id, name)?.join("chronicles"))
}

/// Grimoire section path: {local}/{temple_id}/grimoire/{section_name}.enc
pub fn grimoire_section_path(temple_id: &str, section_name: &str) -> Result<PathBuf> {
    Ok(grimoire_dir(temple_id)?.join(format!("{}.enc", section_name)))
}

/// Grimoire meta path: {local}/{temple_id}/grimoire/meta.json.enc
pub fn grimoire_meta_path(temple_id: &str) -> Result<PathBuf> {
    Ok(grimoire_dir(temple_id)?.join("meta.json.enc"))
}

// ---------------------------------------------------------------------------
// Temple-scoped iCloud paths
// ---------------------------------------------------------------------------

/// iCloud temple root: {icloud}/{temple_id}/
pub fn icloud_temple_dir(temple_id: &str) -> Result<PathBuf> {
    Ok(icloud_data_dir()?.join(temple_id))
}

/// iCloud grimoire directory: {icloud}/{temple_id}/grimoire/
pub fn icloud_grimoire_dir(temple_id: &str) -> Result<PathBuf> {
    Ok(icloud_temple_dir(temple_id)?.join("grimoire"))
}

/// iCloud demons directory: {icloud}/{temple_id}/demons/
pub fn icloud_demons_dir(temple_id: &str) -> Result<PathBuf> {
    Ok(icloud_temple_dir(temple_id)?.join("demons"))
}

/// iCloud demon directory: {icloud}/{temple_id}/demons/{name}/
pub fn icloud_demon_dir(temple_id: &str, name: &str) -> Result<PathBuf> {
    Ok(icloud_demons_dir(temple_id)?.join(name))
}

// ---------------------------------------------------------------------------
// Directory creation
// ---------------------------------------------------------------------------

/// Create the top-level local data directory if it doesn't exist.
pub fn ensure_root_dir() -> Result<()> {
    let dir = local_data_dir()?;
    fs::create_dir_all(&dir)
        .with_context(|| format!("Failed to create directory: {}", dir.display()))?;
    Ok(())
}

/// Create all necessary directories for a temple.
pub fn ensure_temple_dirs(temple_id: &str) -> Result<()> {
    let dirs = [
        temple_dir(temple_id)?,
        grimoire_dir(temple_id)?,
        demons_dir(temple_id)?,
    ];

    for dir in &dirs {
        fs::create_dir_all(dir)
            .with_context(|| format!("Failed to create directory: {}", dir.display()))?;
    }

    Ok(())
}

/// Ensure directories exist for a specific demon within a temple.
pub fn ensure_demon_dirs(temple_id: &str, name: &str) -> Result<()> {
    fs::create_dir_all(demon_dir(temple_id, name)?)
        .with_context(|| format!("Failed to create demon directory for: {}", name))?;
    fs::create_dir_all(demon_chronicles_dir(temple_id, name)?)
        .with_context(|| format!("Failed to create chronicles directory for: {}", name))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/// Resolve the user home directory.
fn dirs_base() -> Result<PathBuf> {
    let home = std::env::var("HOME").context("HOME environment variable not set")?;
    Ok(PathBuf::from(home))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_data_dir_ends_with_goetia() {
        let path = local_data_dir().unwrap();
        assert!(path.ends_with("Library/Application Support/Goetia"));
    }

    #[test]
    fn temple_paths_contain_id() {
        let tid = "a3f1b2c4-test";
        let gdir = grimoire_dir(tid).unwrap();
        assert!(gdir.to_string_lossy().contains("a3f1b2c4-test/grimoire"));
    }

    #[test]
    fn demon_paths_contain_temple_and_name() {
        let tid = "a3f1b2c4-test";
        let name = "asmodeus";
        let seal = demon_seal_path(tid, name).unwrap();
        assert!(seal.to_string_lossy().contains("a3f1b2c4-test/demons/asmodeus/seal.md.enc"));
    }
}
