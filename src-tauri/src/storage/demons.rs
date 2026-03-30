// Demon CRUD: create directory, read seal/manifest/essence, persist encrypted

use std::fs;

use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};

use crate::api::client::{CLAUDE_HAIKU, CLAUDE_OPUS, CLAUDE_SONNET};
use crate::crypto::cipher;
use crate::storage::paths;

fn default_rank() -> String {
    "minor".to_string()
}

/// Convert demon rank to model ID.
pub fn rank_to_model(rank: &str) -> &'static str {
    match rank {
        "minor" => CLAUDE_HAIKU,
        "major" => CLAUDE_SONNET,
        _ => CLAUDE_OPUS,
    }
}

/// Geometrie ammesse — elenco chiuso, non negoziabile.
const VALID_GEOMETRIES: &[&str] = &[
    "icosahedron",
    "point_cloud",
    "moebius",
    "torus",
    "fragmented_cube",
    "tetrahedron",
];

/// Ranghi ammessi: minor (Haiku), major (Sonnet), prince (Opus).
const VALID_RANKS: &[&str] = &["minor", "major", "prince"];

/// Demon manifest — visual form parameters, immutable after genesis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemonManifest {
    #[serde(default = "default_rank")]
    pub rank: String,
    pub geometry: String,
    pub scale: f64,
    pub color: ColorConfig,
    pub opacity: f64,
    pub glow: GlowConfig,
    pub rotation_speed: f64,
    pub pulse_frequency: f64,
    pub noise_amplitude: f64,
    pub output_modes: Vec<String>,
    pub voice: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorConfig {
    pub base: String,
    pub variance: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlowConfig {
    pub intensity: f64,
    pub color: String,
}

/// Summary info for listing demons without decrypting everything.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemonEntry {
    pub name: String,
}

/// Full demon data (decrypted).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemonData {
    pub name: String,
    pub seal: String,
    pub manifest: DemonManifest,
    pub essence: String,
}

/// List all demon names by scanning the demons directory.
pub fn list_demons() -> Result<Vec<DemonEntry>> {
    let dir = paths::demons_dir()?;
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(&dir).context("Failed to read demons directory")?;

    for entry in read_dir {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            if let Some(name) = entry.file_name().to_str() {
                // Verify it has the expected files
                let seal_path = paths::demon_seal_path(name)?;
                if seal_path.exists() {
                    entries.push(DemonEntry {
                        name: name.to_string(),
                    });
                }
            }
        }
    }

    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

/// Create a new demon from genesis output. Encrypts and persists seal, manifest, and empty essence.
pub fn create_demon(
    master_key: &[u8; 32],
    grimoire_hash: &[u8; 32],
    name: &str,
    seal_content: &str,
    manifest: &DemonManifest,
) -> Result<()> {
    // Validate name (no path traversal, no special chars)
    validate_demon_name(name)?;

    // Validate rank
    if !VALID_RANKS.contains(&manifest.rank.as_str()) {
        bail!(
            "Rango non ammesso: '{}'. Ranghi validi: {}",
            manifest.rank,
            VALID_RANKS.join(", ")
        );
    }

    // Validate geometry — elenco chiuso, rifiuta qualsiasi altra cosa
    if !VALID_GEOMETRIES.contains(&manifest.geometry.as_str()) {
        bail!(
            "Geometria non ammessa: '{}'. Geometrie valide: {}",
            manifest.geometry,
            VALID_GEOMETRIES.join(", ")
        );
    }

    // Check demon doesn't already exist
    let dir = paths::demon_dir(name)?;
    if dir.exists() {
        bail!("Demon '{}' already exists", name);
    }

    // Create directory structure
    paths::ensure_demon_dirs(name)?;

    // Encrypt and write seal
    let seal_path = paths::demon_seal_path(name)?;
    let seal_path_str = seal_path.to_string_lossy().to_string();
    let encrypted_seal =
        cipher::encrypt(master_key, grimoire_hash, &seal_path_str, seal_content.as_bytes())?;
    fs::write(&seal_path, &encrypted_seal).context("Failed to write seal")?;

    // Encrypt and write manifest
    let manifest_json = serde_json::to_vec_pretty(manifest)?;
    let manifest_path = paths::demon_manifest_path(name)?;
    let manifest_path_str = manifest_path.to_string_lossy().to_string();
    let encrypted_manifest =
        cipher::encrypt(master_key, grimoire_hash, &manifest_path_str, &manifest_json)?;
    fs::write(&manifest_path, &encrypted_manifest).context("Failed to write manifest")?;

    // Encrypt and write empty essence
    let essence_path = paths::demon_essence_path(name)?;
    let essence_path_str = essence_path.to_string_lossy().to_string();
    let encrypted_essence =
        cipher::encrypt(master_key, grimoire_hash, &essence_path_str, b"")?;
    fs::write(&essence_path, &encrypted_essence).context("Failed to write essence")?;

    Ok(())
}

/// Read and decrypt a demon's seal.
pub fn read_seal(master_key: &[u8; 32], name: &str) -> Result<String> {
    let path = paths::demon_seal_path(name)?;
    let encrypted = fs::read(&path).with_context(|| format!("Failed to read seal for demon '{}'", name))?;
    let path_str = path.to_string_lossy().to_string();
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    Ok(String::from_utf8(plaintext)?)
}

/// Read and decrypt a demon's manifest.
pub fn read_manifest(master_key: &[u8; 32], name: &str) -> Result<DemonManifest> {
    let path = paths::demon_manifest_path(name)?;
    let encrypted =
        fs::read(&path).with_context(|| format!("Failed to read manifest for demon '{}'", name))?;
    let path_str = path.to_string_lossy().to_string();
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    let manifest: DemonManifest = serde_json::from_slice(&plaintext)?;
    Ok(manifest)
}

/// Read and decrypt a demon's essence.
pub fn read_essence(master_key: &[u8; 32], name: &str) -> Result<String> {
    let path = paths::demon_essence_path(name)?;
    let encrypted =
        fs::read(&path).with_context(|| format!("Failed to read essence for demon '{}'", name))?;
    let path_str = path.to_string_lossy().to_string();
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    Ok(String::from_utf8(plaintext)?)
}

/// Update a demon's essence (only the demon can do this, enforced at command level).
pub fn write_essence(
    master_key: &[u8; 32],
    grimoire_hash: &[u8; 32],
    name: &str,
    essence_content: &str,
) -> Result<()> {
    let path = paths::demon_essence_path(name)?;
    let path_str = path.to_string_lossy().to_string();
    let encrypted =
        cipher::encrypt(master_key, grimoire_hash, &path_str, essence_content.as_bytes())?;
    fs::write(&path, &encrypted).context("Failed to write essence")?;
    Ok(())
}

/// Read full demon data (seal + manifest + essence).
pub fn read_demon(master_key: &[u8; 32], name: &str) -> Result<DemonData> {
    let seal = read_seal(master_key, name)?;
    let manifest = read_manifest(master_key, name)?;
    let essence = read_essence(master_key, name)?;
    Ok(DemonData {
        name: name.to_string(),
        seal,
        manifest,
        essence,
    })
}

/// Delete a demon directory entirely (used after secure wipe in banishment).
pub fn delete_demon_dir(name: &str) -> Result<()> {
    let dir = paths::demon_dir(name)?;
    if dir.exists() {
        fs::remove_dir_all(&dir)
            .with_context(|| format!("Failed to remove demon directory: {}", name))?;
    }
    Ok(())
}

/// Validate a demon name: no empty, no path traversal, only alphanumeric + hyphens + underscores.
fn validate_demon_name(name: &str) -> Result<()> {
    if name.is_empty() {
        bail!("Demon name cannot be empty");
    }
    if name.contains('/') || name.contains('\\') || name.contains("..") {
        bail!("Demon name contains invalid characters: {}", name);
    }
    if !name
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        bail!(
            "Demon name must contain only alphanumeric characters, hyphens, and underscores: {}",
            name
        );
    }
    Ok(())
}
