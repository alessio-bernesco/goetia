// Filesystem path resolution for local data store and iCloud container

use std::fs;
use std::path::PathBuf;

use anyhow::{Context, Result};

/// Local data directory: ~/Library/Application Support/Goetia/
pub fn local_data_dir() -> Result<PathBuf> {
    let home = dirs_base()?.join("Library/Application Support/Goetia");
    Ok(home)
}

/// iCloud container directory: ~/Library/Mobile Documents/iCloud~com~goetia~app/
pub fn icloud_data_dir() -> Result<PathBuf> {
    let home = dirs_base()?.join("Library/Mobile Documents/iCloud~com~goetia~app");
    Ok(home)
}

/// Grimoire directory: {local}/grimoire/
pub fn grimoire_dir() -> Result<PathBuf> {
    Ok(local_data_dir()?.join("grimoire"))
}

/// All demons directory: {local}/demons/
pub fn demons_dir() -> Result<PathBuf> {
    Ok(local_data_dir()?.join("demons"))
}

/// Single demon directory: {local}/demons/{name}/
pub fn demon_dir(name: &str) -> Result<PathBuf> {
    Ok(demons_dir()?.join(name))
}

/// Demon seal path: {local}/demons/{name}/seal.md.enc
pub fn demon_seal_path(name: &str) -> Result<PathBuf> {
    Ok(demon_dir(name)?.join("seal.md.enc"))
}

/// Demon manifest path: {local}/demons/{name}/manifest.json.enc
pub fn demon_manifest_path(name: &str) -> Result<PathBuf> {
    Ok(demon_dir(name)?.join("manifest.json.enc"))
}

/// Demon essence path: {local}/demons/{name}/essence.md.enc
pub fn demon_essence_path(name: &str) -> Result<PathBuf> {
    Ok(demon_dir(name)?.join("essence.md.enc"))
}

/// Demon chronicles directory: {local}/demons/{name}/chronicles/
pub fn demon_chronicles_dir(name: &str) -> Result<PathBuf> {
    Ok(demon_dir(name)?.join("chronicles"))
}

/// Lock PID file path: {local}/lock.pid
pub fn lock_pid_path() -> Result<PathBuf> {
    Ok(local_data_dir()?.join("lock.pid"))
}

/// Grimoire section path: {local}/grimoire/{section_name}.enc
pub fn grimoire_section_path(section_name: &str) -> Result<PathBuf> {
    Ok(grimoire_dir()?.join(format!("{}.enc", section_name)))
}

/// Grimoire meta path: {local}/grimoire/meta.json.enc
pub fn grimoire_meta_path() -> Result<PathBuf> {
    Ok(grimoire_dir()?.join("meta.json.enc"))
}

/// Create all necessary directories if they don't exist.
pub fn ensure_dirs() -> Result<()> {
    let dirs = [
        local_data_dir()?,
        grimoire_dir()?,
        demons_dir()?,
    ];

    for dir in &dirs {
        fs::create_dir_all(dir)
            .with_context(|| format!("Failed to create directory: {}", dir.display()))?;
    }

    Ok(())
}

/// Ensure directories exist for a specific demon.
pub fn ensure_demon_dirs(name: &str) -> Result<()> {
    fs::create_dir_all(demon_dir(name)?)
        .with_context(|| format!("Failed to create demon directory for: {}", name))?;
    fs::create_dir_all(demon_chronicles_dir(name)?)
        .with_context(|| format!("Failed to create chronicles directory for: {}", name))?;
    Ok(())
}

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
    fn demon_paths_contain_name() {
        let name = "asmodeus";
        let seal = demon_seal_path(name).unwrap();
        assert!(seal.to_string_lossy().contains("asmodeus/seal.md.enc"));
    }
}
