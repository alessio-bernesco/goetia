// Genesis registry — tracks assigned form/color combinations to reduce visual overlap
//
// Encrypted file `genesis_registry.enc` in grimoire directory.
// One entry per active demon. Used by manifest generator for weighted random selection.

use std::fs;

use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::crypto::cipher;
use crate::storage::paths;

/// Single entry in the genesis registry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryEntry {
    pub demon_name: String,
    pub rank: String,
    pub geometry_type: String,
    pub pattern: Option<String>,
    pub body_shapes: Vec<String>,
    pub primary_color_hsl: [f64; 3],
    pub created_at: String,
}

/// Read the genesis registry (decrypt and parse). Returns empty vec if file doesn't exist.
pub fn read_registry(master_key: &[u8; 32], temple_id: &str) -> Result<Vec<RegistryEntry>> {
    let path = registry_path(temple_id)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let encrypted = fs::read(&path).context("Failed to read genesis registry")?;
    let path_str = path.to_string_lossy().to_string();
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    let entries: Vec<RegistryEntry> = serde_json::from_slice(&plaintext)?;
    Ok(entries)
}

/// Write the genesis registry (serialize and encrypt).
pub fn write_registry(
    master_key: &[u8; 32],
    grimoire_hash: &[u8; 32],
    temple_id: &str,
    entries: &[RegistryEntry],
) -> Result<()> {
    let path = registry_path(temple_id)?;
    let path_str = path.to_string_lossy().to_string();
    let json = serde_json::to_vec_pretty(entries)?;
    let encrypted = cipher::encrypt(master_key, grimoire_hash, &path_str, &json)?;
    fs::write(&path, &encrypted).context("Failed to write genesis registry")?;
    Ok(())
}

/// Append a new entry to the registry.
pub fn append_entry(
    master_key: &[u8; 32],
    grimoire_hash: &[u8; 32],
    temple_id: &str,
    entry: RegistryEntry,
) -> Result<()> {
    let mut entries = read_registry(master_key, temple_id)?;
    entries.push(entry);
    write_registry(master_key, grimoire_hash, temple_id, &entries)
}

/// Remove an entry by demon name.
pub fn remove_entry(
    master_key: &[u8; 32],
    grimoire_hash: &[u8; 32],
    temple_id: &str,
    demon_name: &str,
) -> Result<()> {
    let mut entries = read_registry(master_key, temple_id)?;
    entries.retain(|e| e.demon_name != demon_name);
    write_registry(master_key, grimoire_hash, temple_id, &entries)
}

/// Build a RegistryEntry from a demon name, rank, and manifest.
pub fn entry_from_manifest(
    demon_name: &str,
    rank: &str,
    manifest: &super::demons::DemonManifest,
) -> RegistryEntry {
    let geo = &manifest.geometry;
    let geo_type = geo["type"].as_str().unwrap_or("unknown").to_string();

    let (pattern, body_shapes) = if geo_type == "composite" {
        let pat = geo["pattern"].as_str().map(|s| s.to_string());
        let shapes = geo["bodies"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|b| b["shape"].as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();
        (pat, shapes)
    } else {
        (None, vec![geo_type.clone()])
    };

    // Extract primary color HSL — for minor/major from top-level, for prince from first body
    let primary_color_hsl = extract_primary_hsl(rank, manifest);

    RegistryEntry {
        demon_name: demon_name.to_string(),
        rank: rank.to_string(),
        geometry_type: if geo_type == "composite" {
            body_shapes.first().cloned().unwrap_or_default()
        } else {
            geo_type
        },
        pattern,
        body_shapes,
        primary_color_hsl,
        created_at: Utc::now().to_rfc3339(),
    }
}

/// Extract the primary HSL color from a manifest.
fn extract_primary_hsl(rank: &str, manifest: &super::demons::DemonManifest) -> [f64; 3] {
    let hex = if rank == "prince" {
        // Use first body's color
        manifest.geometry["bodies"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|b| b["color"]["base"].as_str())
            .unwrap_or("#888888")
    } else {
        manifest.color.as_ref().map(|c| c.base.as_str()).unwrap_or("#888888")
    };

    hex_to_hsl(hex)
}

/// Convert a hex color string to HSL [H(0-360), S(0-100), L(0-100)].
fn hex_to_hsl(hex: &str) -> [f64; 3] {
    let hex = hex.trim_start_matches('#');
    if hex.len() < 6 {
        return [0.0, 0.0, 50.0];
    }
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(128) as f64 / 255.0;
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(128) as f64 / 255.0;
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(128) as f64 / 255.0;

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if (max - min).abs() < f64::EPSILON {
        return [0.0, 0.0, l * 100.0];
    }

    let d = max - min;
    let s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max + min) };

    let h = if (max - r).abs() < f64::EPSILON {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) / 6.0
    } else if (max - g).abs() < f64::EPSILON {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };

    [h * 360.0, s * 100.0, l * 100.0]
}

/// Path to the genesis registry file.
fn registry_path(temple_id: &str) -> Result<std::path::PathBuf> {
    Ok(paths::grimoire_dir(temple_id)?.join("genesis_registry.enc"))
}
