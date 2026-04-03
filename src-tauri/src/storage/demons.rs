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

/// Geometrie ammesse per rank — elenco chiuso, non negoziabile.
const MINOR_GEOMETRIES: &[&str] = &[
    "tetrahedron",
    "cube",
    "octahedron",
    "icosahedron",
    "point_cloud",
];

const MAJOR_GEOMETRIES: &[&str] = &[
    "torus",
    "moebius",
    "dodecahedron",
    "torus_knot",
    "fragmented_cube",
];

/// Tutte le geometrie ammesse (minor + major), usate per validare i body dei prince.
const ALL_GEOMETRIES: &[&str] = &[
    "tetrahedron", "cube", "octahedron", "icosahedron", "point_cloud",
    "torus", "moebius", "dodecahedron", "torus_knot", "fragmented_cube",
];

/// Pattern compositivi prince ammessi.
const PRINCE_PATTERNS: &[&str] = &[
    "counter_rotating",
    "orbital",
    "nested",
    "crowned",
    "binary",
    "axis",
];

/// Ranghi ammessi: minor (Haiku), major (Sonnet), prince (Opus).
const VALID_RANKS: &[&str] = &["minor", "major", "prince"];

/// Demon manifest — visual form parameters, immutable after genesis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemonManifest {
    #[serde(default = "default_rank")]
    pub rank: String,
    pub geometry: serde_json::Value,
    pub scale: f64,
    #[serde(default)]
    pub color: Option<ColorConfig>,
    #[serde(default)]
    pub opacity: Option<f64>,
    pub glow: GlowConfig,
    pub pulse_frequency: f64,
    pub noise_amplitude: f64,
    pub output_modes: Vec<String>,
    pub voice: serde_json::Value,
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

/// List all demon names by scanning the demons directory for a temple.
pub fn list_demons(temple_id: &str) -> Result<Vec<DemonEntry>> {
    let dir = paths::demons_dir(temple_id)?;
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
                let seal_path = paths::demon_seal_path(temple_id, name)?;
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
    temple_id: &str,
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

    // Validate geometry structure per rank
    validate_geometry(&manifest.rank, &manifest.geometry)?;

    // Check demon doesn't already exist
    let dir = paths::demon_dir(temple_id, name)?;
    if dir.exists() {
        bail!("Demon '{}' already exists", name);
    }

    // Create directory structure
    paths::ensure_demon_dirs(temple_id, name)?;

    // Encrypt and write seal
    let seal_path = paths::demon_seal_path(temple_id, name)?;
    let seal_path_str = seal_path.to_string_lossy().to_string();
    let encrypted_seal =
        cipher::encrypt(master_key, grimoire_hash, &seal_path_str, seal_content.as_bytes())?;
    fs::write(&seal_path, &encrypted_seal).context("Failed to write seal")?;

    // Encrypt and write manifest
    let manifest_json = serde_json::to_vec_pretty(manifest)?;
    let manifest_path = paths::demon_manifest_path(temple_id, name)?;
    let manifest_path_str = manifest_path.to_string_lossy().to_string();
    let encrypted_manifest =
        cipher::encrypt(master_key, grimoire_hash, &manifest_path_str, &manifest_json)?;
    fs::write(&manifest_path, &encrypted_manifest).context("Failed to write manifest")?;

    // Encrypt and write empty essence
    let essence_path = paths::demon_essence_path(temple_id, name)?;
    let essence_path_str = essence_path.to_string_lossy().to_string();
    let encrypted_essence =
        cipher::encrypt(master_key, grimoire_hash, &essence_path_str, b"")?;
    fs::write(&essence_path, &encrypted_essence).context("Failed to write essence")?;

    Ok(())
}

/// Read and decrypt a demon's seal.
pub fn read_seal(master_key: &[u8; 32], temple_id: &str, name: &str) -> Result<String> {
    let path = paths::demon_seal_path(temple_id, name)?;
    let encrypted = fs::read(&path).with_context(|| format!("Failed to read seal for demon '{}'", name))?;
    let path_str = path.to_string_lossy().to_string();
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    Ok(String::from_utf8(plaintext)?)
}

/// Read and decrypt a demon's manifest.
pub fn read_manifest(master_key: &[u8; 32], temple_id: &str, name: &str) -> Result<DemonManifest> {
    let path = paths::demon_manifest_path(temple_id, name)?;
    let encrypted =
        fs::read(&path).with_context(|| format!("Failed to read manifest for demon '{}'", name))?;
    let path_str = path.to_string_lossy().to_string();
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    let manifest: DemonManifest = serde_json::from_slice(&plaintext)?;
    Ok(manifest)
}

/// Read and decrypt a demon's essence.
pub fn read_essence(master_key: &[u8; 32], temple_id: &str, name: &str) -> Result<String> {
    let path = paths::demon_essence_path(temple_id, name)?;
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
    temple_id: &str,
    name: &str,
    essence_content: &str,
) -> Result<()> {
    let path = paths::demon_essence_path(temple_id, name)?;
    let path_str = path.to_string_lossy().to_string();
    let encrypted =
        cipher::encrypt(master_key, grimoire_hash, &path_str, essence_content.as_bytes())?;
    fs::write(&path, &encrypted).context("Failed to write essence")?;
    Ok(())
}

/// Read full demon data (seal + manifest + essence).
pub fn read_demon(master_key: &[u8; 32], temple_id: &str, name: &str) -> Result<DemonData> {
    let seal = read_seal(master_key, temple_id, name)?;
    let manifest = read_manifest(master_key, temple_id, name)?;
    let essence = read_essence(master_key, temple_id, name)?;
    Ok(DemonData {
        name: name.to_string(),
        seal,
        manifest,
        essence,
    })
}

/// Delete a demon directory entirely (used after secure wipe in banishment).
#[allow(dead_code)]
pub fn delete_demon_dir(temple_id: &str, name: &str) -> Result<()> {
    let dir = paths::demon_dir(temple_id, name)?;
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

/// Validate geometry JSON structure based on rank.
fn validate_geometry(rank: &str, geometry: &serde_json::Value) -> Result<()> {
    let geo_type = geometry["type"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("geometry.type mancante o non stringa"))?;

    match rank {
        "minor" => {
            if !MINOR_GEOMETRIES.contains(&geo_type) {
                bail!(
                    "Geometria '{}' non ammessa per rank minor. Ammesse: {}",
                    geo_type,
                    MINOR_GEOMETRIES.join(", ")
                );
            }
            validate_rotation(&geometry["rotation"])?;
        }
        "major" => {
            if !MAJOR_GEOMETRIES.contains(&geo_type) {
                bail!(
                    "Geometria '{}' non ammessa per rank major. Ammesse: {}",
                    geo_type,
                    MAJOR_GEOMETRIES.join(", ")
                );
            }
            validate_rotation(&geometry["rotation"])?;
            if geo_type == "torus_knot" {
                if let Some(params) = geometry.get("params") {
                    let p = params["p"].as_i64().unwrap_or(0);
                    let q = params["q"].as_i64().unwrap_or(0);
                    if p == q {
                        bail!("torus_knot: p e q non possono essere uguali (p={}, q={})", p, q);
                    }
                }
            }
        }
        "prince" => {
            if geo_type != "composite" {
                bail!("Prince geometry.type deve essere 'composite', trovato: '{}'", geo_type);
            }
            let pattern = geometry["pattern"]
                .as_str()
                .ok_or_else(|| anyhow::anyhow!("Prince geometry.pattern mancante"))?;
            if !PRINCE_PATTERNS.contains(&pattern) {
                bail!("Pattern '{}' non ammesso. Ammessi: {}", pattern, PRINCE_PATTERNS.join(", "));
            }
            let bodies = geometry["bodies"]
                .as_array()
                .ok_or_else(|| anyhow::anyhow!("Prince geometry.bodies mancante o non array"))?;
            if bodies.len() < 2 || bodies.len() > 3 {
                bail!("Prince deve avere 2-3 bodies, trovati: {}", bodies.len());
            }
            for (i, body) in bodies.iter().enumerate() {
                let shape = body["shape"]
                    .as_str()
                    .ok_or_else(|| anyhow::anyhow!("body[{}].shape mancante", i))?;
                if !ALL_GEOMETRIES.contains(&shape) {
                    bail!("body[{}].shape '{}' non ammessa", i, shape);
                }
                if shape == "torus_knot" {
                    if let Some(params) = body.get("params") {
                        let p = params["p"].as_i64().unwrap_or(0);
                        let q = params["q"].as_i64().unwrap_or(0);
                        if p == q {
                            bail!("body[{}] torus_knot: p e q non possono essere uguali", i);
                        }
                    }
                }
            }
            if let Some(orbits) = geometry["orbits"].as_array() {
                for (i, orbit) in orbits.iter().enumerate() {
                    let body_idx = orbit["body"].as_u64()
                        .ok_or_else(|| anyhow::anyhow!("orbits[{}].body mancante", i))?;
                    if body_idx as usize >= bodies.len() {
                        bail!("orbits[{}].body indice {} fuori range (bodies: {})", i, body_idx, bodies.len());
                    }
                }
            }
            if let Some(rotations) = geometry["rotations"].as_array() {
                for (i, rot) in rotations.iter().enumerate() {
                    let body_idx = rot["body"].as_u64()
                        .ok_or_else(|| anyhow::anyhow!("rotations[{}].body mancante", i))?;
                    if body_idx as usize >= bodies.len() {
                        bail!("rotations[{}].body indice {} fuori range (bodies: {})", i, body_idx, bodies.len());
                    }
                }
            }
        }
        _ => bail!("Rank sconosciuto: '{}'", rank),
    }

    Ok(())
}

/// Validate a rotation object has speed (number) and axis (3-element array).
fn validate_rotation(rotation: &serde_json::Value) -> Result<()> {
    if rotation.is_null() {
        bail!("geometry.rotation mancante");
    }
    rotation["speed"]
        .as_f64()
        .ok_or_else(|| anyhow::anyhow!("geometry.rotation.speed mancante o non numero"))?;
    let axis = rotation["axis"]
        .as_array()
        .ok_or_else(|| anyhow::anyhow!("geometry.rotation.axis mancante o non array"))?;
    if axis.len() != 3 {
        bail!("geometry.rotation.axis deve avere 3 elementi, trovati: {}", axis.len());
    }
    Ok(())
}
