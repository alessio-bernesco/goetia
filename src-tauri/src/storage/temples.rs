// Temple registry — encrypted list of all temples with UUID, name, creation date

use std::fs;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::crypto::cipher;
use crate::storage::paths;

/// Single temple entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempleEntry {
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
}

/// The full temple registry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempleRegistry {
    pub temples: Vec<TempleEntry>,
}

impl TempleRegistry {
    pub fn empty() -> Self {
        Self { temples: Vec::new() }
    }
}

/// Read the temple registry. Returns empty registry if file doesn't exist.
pub fn read_registry(master_key: &[u8; 32]) -> Result<TempleRegistry> {
    let path = paths::temples_registry_path()?;
    if !path.exists() {
        return Ok(TempleRegistry::empty());
    }
    let encrypted = fs::read(&path).context("Failed to read temple registry")?;
    let path_str = path.to_string_lossy().to_string();
    // Use a zero grimoire_hash for registry decryption (registry is not grimoire-scoped)
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    let registry: TempleRegistry = serde_json::from_slice(&plaintext)?;
    Ok(registry)
}

/// Write the temple registry (serialize and encrypt).
pub fn write_registry(master_key: &[u8; 32], registry: &TempleRegistry) -> Result<()> {
    let path = paths::temples_registry_path()?;
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let path_str = path.to_string_lossy().to_string();
    let json = serde_json::to_vec_pretty(registry)?;
    // Use a fixed grimoire_hash for registry encryption (not temple-scoped)
    let registry_hash = registry_encryption_hash();
    let encrypted = cipher::encrypt(master_key, &registry_hash, &path_str, &json)?;
    fs::write(&path, &encrypted).context("Failed to write temple registry")?;
    Ok(())
}

/// Add a new temple to the registry.
pub fn add_temple(master_key: &[u8; 32], id: &str, name: &str) -> Result<TempleEntry> {
    let mut registry = read_registry(master_key)?;
    let entry = TempleEntry {
        id: id.to_string(),
        name: name.to_string(),
        created_at: Utc::now(),
    };
    registry.temples.push(entry.clone());
    write_registry(master_key, &registry)?;
    Ok(entry)
}

/// Remove a temple from the registry by ID.
pub fn remove_temple(master_key: &[u8; 32], temple_id: &str) -> Result<()> {
    let mut registry = read_registry(master_key)?;
    let before = registry.temples.len();
    registry.temples.retain(|t| t.id != temple_id);
    if registry.temples.len() == before {
        anyhow::bail!("Tempio '{}' non trovato nel registro", temple_id);
    }
    write_registry(master_key, &registry)
}

/// List all temples from the registry.
pub fn list_temples(master_key: &[u8; 32]) -> Result<Vec<TempleEntry>> {
    let registry = read_registry(master_key)?;
    Ok(registry.temples)
}

/// Fixed hash used for encrypting the temple registry.
/// The registry lives outside any temple, so it can't use a grimoire hash.
/// We use a deterministic hash derived from a fixed string.
fn registry_encryption_hash() -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(b"goetia-temple-registry-v1");
    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    hash
}
