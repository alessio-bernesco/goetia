use anyhow::Result;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// Grimoire metadata including the hash chain for versioning.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrimoireMeta {
    pub current_hash: String,
    pub hash_chain: Vec<String>,
    pub version: u32,
}

/// The canonical order of grimoire sections for hash computation.
const GRIMOIRE_SECTIONS: &[&str] = &[
    "identity.md",
    "laws.md",
    "genesis.md",
    "session.md",
    "chronicles.md",
];

/// Compute the SHA-256 hash of the grimoire content.
/// Sections must be provided in canonical order (identity, laws, genesis, session, chronicles).
pub fn compute_grimoire_hash(sections: &[&[u8]; 5]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    for section in sections {
        hasher.update(section);
    }
    hasher.finalize().into()
}

/// Validate that a grimoire_hash from a file header is present in the hash chain.
#[allow(dead_code)]
pub fn validate_against_chain(file_hash: &[u8; 32], meta: &GrimoireMeta) -> bool {
    let hex = hex_encode(file_hash);
    meta.hash_chain.contains(&hex)
}

/// Create initial grimoire metadata from sections.
pub fn create_initial_meta(sections: &[&[u8]; 5]) -> GrimoireMeta {
    let hash = compute_grimoire_hash(sections);
    let hex = hex_encode(&hash);
    GrimoireMeta {
        current_hash: hex.clone(),
        hash_chain: vec![hex],
        version: 1,
    }
}

/// Upgrade grimoire metadata with new sections, preserving the hash chain.
#[allow(dead_code)]
pub fn upgrade_meta(existing: &GrimoireMeta, new_sections: &[&[u8]; 5]) -> GrimoireMeta {
    let hash = compute_grimoire_hash(new_sections);
    let hex = hex_encode(&hash);
    let mut chain = existing.hash_chain.clone();
    chain.push(hex.clone());
    GrimoireMeta {
        current_hash: hex,
        hash_chain: chain,
        version: existing.version + 1,
    }
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Get the current grimoire hash as raw bytes from metadata.
pub fn current_hash_bytes(meta: &GrimoireMeta) -> Result<[u8; 32]> {
    hex_decode(&meta.current_hash)
}

fn hex_decode(hex: &str) -> Result<[u8; 32]> {
    if hex.len() != 64 {
        anyhow::bail!("Invalid hex hash length: {}", hex.len());
    }
    let mut bytes = [0u8; 32];
    for i in 0..32 {
        bytes[i] = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16)?;
    }
    Ok(bytes)
}

/// Return the canonical section file names.
pub fn section_names() -> &'static [&'static str] {
    GRIMOIRE_SECTIONS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_deterministic() {
        let sections: [&[u8]; 5] = [b"id", b"laws", b"gen", b"sess", b"chron"];
        let h1 = compute_grimoire_hash(&sections);
        let h2 = compute_grimoire_hash(&sections);
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_hash_chain_validation() {
        let sections: [&[u8]; 5] = [b"id", b"laws", b"gen", b"sess", b"chron"];
        let meta = create_initial_meta(&sections);
        let hash = compute_grimoire_hash(&sections);
        assert!(validate_against_chain(&hash, &meta));

        let fake_hash = [0u8; 32];
        assert!(!validate_against_chain(&fake_hash, &meta));
    }

    #[test]
    fn test_upgrade_preserves_chain() {
        let s1: [&[u8]; 5] = [b"id", b"laws", b"gen", b"sess", b"chron"];
        let meta = create_initial_meta(&s1);

        let s2: [&[u8]; 5] = [b"id_v2", b"laws", b"gen", b"sess", b"chron"];
        let upgraded = upgrade_meta(&meta, &s2);

        assert_eq!(upgraded.hash_chain.len(), 2);
        assert_eq!(upgraded.version, 2);
        // Old hash still valid
        let old_hash = compute_grimoire_hash(&s1);
        assert!(validate_against_chain(&old_hash, &upgraded));
        // New hash also valid
        let new_hash = compute_grimoire_hash(&s2);
        assert!(validate_against_chain(&new_hash, &upgraded));
    }
}
