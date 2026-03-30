// Grimoire CRUD: read, deploy (import), validate structure

use std::fs;

use anyhow::{bail, Context, Result};

use crate::crypto::cipher;
use crate::crypto::grimoire_hash::{
    compute_grimoire_hash, create_initial_meta, current_hash_bytes, section_names,
    GrimoireMeta,
};
use crate::storage::paths;

/// The 5 grimoire sections in canonical order.
const SECTION_NAMES: [&str; 5] = ["identity.md", "laws.md", "genesis.md", "session.md", "chronicles.md"];

/// Check whether a grimoire exists in the data store.
pub fn grimoire_exists() -> Result<bool> {
    let dir = paths::grimoire_dir()?;
    if !dir.exists() {
        return Ok(false);
    }
    // Check that all section files + meta exist
    for name in &SECTION_NAMES {
        if !paths::grimoire_section_path(name)?.exists() {
            return Ok(false);
        }
    }
    Ok(paths::grimoire_meta_path()?.exists())
}

/// Deploy (import) a grimoire from 5 plaintext markdown sections.
/// Creates the encrypted grimoire files and meta.json in the data store.
/// Returns the computed grimoire hash.
pub fn deploy_grimoire(
    master_key: &[u8; 32],
    sections: &[(&str, &[u8]); 5],
) -> Result<[u8; 32]> {
    // Validate section names match expected order
    for (i, (name, _)) in sections.iter().enumerate() {
        if *name != SECTION_NAMES[i] {
            bail!(
                "Section {} should be '{}', got '{}'",
                i,
                SECTION_NAMES[i],
                name
            );
        }
    }

    // Compute grimoire hash from section contents
    let contents: [&[u8]; 5] = [
        sections[0].1,
        sections[1].1,
        sections[2].1,
        sections[3].1,
        sections[4].1,
    ];
    let hash = compute_grimoire_hash(&contents);

    // Create metadata
    let meta = create_initial_meta(&contents);

    // Ensure grimoire directory exists
    let dir = paths::grimoire_dir()?;
    fs::create_dir_all(&dir)?;

    // Encrypt and write each section
    for (name, content) in sections {
        let path = paths::grimoire_section_path(name)?;
        let path_str = path.to_string_lossy().to_string();
        let encrypted = cipher::encrypt(master_key, &hash, &path_str, content)?;
        fs::write(&path, &encrypted)
            .with_context(|| format!("Failed to write grimoire section: {}", name))?;
    }

    // Encrypt and write meta.json
    let meta_json = serde_json::to_vec(&meta)?;
    let meta_path = paths::grimoire_meta_path()?;
    let meta_path_str = meta_path.to_string_lossy().to_string();
    let encrypted_meta = cipher::encrypt(master_key, &hash, &meta_path_str, &meta_json)?;
    fs::write(&meta_path, &encrypted_meta).context("Failed to write grimoire meta.json")?;

    Ok(hash)
}

/// Read and decrypt the grimoire metadata.
pub fn read_grimoire_meta(master_key: &[u8; 32]) -> Result<GrimoireMeta> {
    let path = paths::grimoire_meta_path()?;
    let encrypted = fs::read(&path).context("Failed to read grimoire meta.json")?;
    let path_str = path.to_string_lossy().to_string();
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    let meta: GrimoireMeta = serde_json::from_slice(&plaintext)?;
    Ok(meta)
}

/// Read and decrypt a single grimoire section by name.
/// Returns the plaintext content.
pub fn read_grimoire_section(master_key: &[u8; 32], section_name: &str) -> Result<Vec<u8>> {
    let path = paths::grimoire_section_path(section_name)?;
    let encrypted =
        fs::read(&path).with_context(|| format!("Failed to read grimoire section: {}", section_name))?;
    let path_str = path.to_string_lossy().to_string();
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    Ok(plaintext)
}

/// Read and decrypt all 5 grimoire sections in canonical order.
/// Returns (sections_as_vec, grimoire_meta).
#[allow(dead_code)]
pub fn read_all_sections(master_key: &[u8; 32]) -> Result<(Vec<Vec<u8>>, GrimoireMeta)> {
    let meta = read_grimoire_meta(master_key)?;
    let mut sections = Vec::with_capacity(5);
    for name in section_names() {
        let content = read_grimoire_section(master_key, name)?;
        sections.push(content);
    }
    Ok((sections, meta))
}

/// Validate grimoire integrity: recompute hash from decrypted sections
/// and verify it matches the current hash in meta.json.
pub fn validate_grimoire(master_key: &[u8; 32]) -> Result<bool> {
    let (sections, meta) = read_all_sections(master_key)?;
    let refs: [&[u8]; 5] = [
        &sections[0],
        &sections[1],
        &sections[2],
        &sections[3],
        &sections[4],
    ];
    let computed = compute_grimoire_hash(&refs);
    let stored = current_hash_bytes(&meta)?;
    Ok(computed == stored)
}
