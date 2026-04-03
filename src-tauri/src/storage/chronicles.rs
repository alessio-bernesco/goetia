// Chronicle data structures and CRUD operations

use std::fs;
use std::path::PathBuf;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::crypto::cipher;
use super::paths;

/// Role in a conversation turn.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Mago,
    Demon,
}

/// A single turn in the conversation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChronicleTurn {
    pub role: Role,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub visual_state: Option<serde_json::Value>,
}

/// Metadata for a chronicle session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChronicleMetadata {
    pub demon_name: String,
    pub date: DateTime<Utc>,
    pub duration_seconds: u64,
    pub turn_count: usize,
    pub topics: Vec<String>,
    pub mood_arc: Vec<String>,
    pub summary: String,
}

/// A full chronicle: metadata plus conversation log.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chronicle {
    pub metadata: ChronicleMetadata,
    pub conversation: Vec<ChronicleTurn>,
}

/// Entry returned when listing chronicles (without decryption).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChronicleEntry {
    pub filename: String,
    pub date: DateTime<Utc>,
    pub path: PathBuf,
}

/// Generate an ISO 8601 timestamp-based filename for a chronicle.
/// Format: `2026-03-29T14-30-00Z.json.enc`
#[allow(dead_code)]
pub fn chronicle_filename() -> String {
    let now = Utc::now();
    format!("{}.json.enc", now.format("%Y-%m-%dT%H-%M-%SZ"))
}

/// Generate a chronicle filename from a specific timestamp.
pub fn chronicle_filename_from(dt: &DateTime<Utc>) -> String {
    format!("{}.json.enc", dt.format("%Y-%m-%dT%H-%M-%SZ"))
}

/// List all chronicle files for a demon, returning basic info without decrypting.
/// Files are sorted by date (newest first).
pub fn list_chronicles(temple_id: &str, demon_name: &str) -> Result<Vec<ChronicleEntry>> {
    let dir = paths::demon_chronicles_dir(temple_id, demon_name)?;

    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut entries: Vec<ChronicleEntry> = Vec::new();

    let read_dir = fs::read_dir(&dir)
        .with_context(|| format!("Failed to read chronicles directory: {}", dir.display()))?;

    for entry in read_dir {
        let entry = entry?;
        let path = entry.path();

        if let Some(filename) = path.file_name().and_then(|n| n.to_str()) {
            if filename.ends_with(".json.enc") {
                // Parse date from filename: 2026-03-29T14-30-00Z.json.enc
                if let Some(date) = parse_date_from_filename(filename) {
                    entries.push(ChronicleEntry {
                        filename: filename.to_string(),
                        date,
                        path: path.clone(),
                    });
                }
            }
        }
    }

    // Sort newest first
    entries.sort_by(|a, b| b.date.cmp(&a.date));

    Ok(entries)
}

/// Write a chronicle to disk (encrypt and persist).
pub fn write_chronicle(
    master_key: &[u8; 32],
    grimoire_hash: &[u8; 32],
    temple_id: &str,
    demon_name: &str,
    chronicle: &Chronicle,
) -> Result<String> {
    let dir = paths::demon_chronicles_dir(temple_id, demon_name)?;
    fs::create_dir_all(&dir)?;

    let filename = chronicle_filename_from(&chronicle.metadata.date);
    let path = dir.join(&filename);
    let path_str = path.to_string_lossy().to_string();

    let json = serde_json::to_vec(chronicle)?;
    let encrypted = cipher::encrypt(master_key, grimoire_hash, &path_str, &json)?;
    fs::write(&path, &encrypted)
        .with_context(|| format!("Failed to write chronicle: {}", filename))?;

    Ok(filename)
}

/// Read and decrypt a single chronicle by filename.
pub fn read_chronicle(
    master_key: &[u8; 32],
    temple_id: &str,
    demon_name: &str,
    filename: &str,
) -> Result<Chronicle> {
    let dir = paths::demon_chronicles_dir(temple_id, demon_name)?;
    let path = dir.join(filename);
    let path_str = path.to_string_lossy().to_string();

    let encrypted =
        fs::read(&path).with_context(|| format!("Failed to read chronicle: {}", filename))?;
    let (_hash, plaintext) = cipher::decrypt(master_key, &path_str, &encrypted)?;
    let chronicle: Chronicle = serde_json::from_slice(&plaintext)?;
    Ok(chronicle)
}

/// Parse a DateTime from a chronicle filename.
/// Expected format: `2026-03-29T14-30-00Z.json.enc`
fn parse_date_from_filename(filename: &str) -> Option<DateTime<Utc>> {
    // Strip the .json.enc suffix
    let stem = filename.strip_suffix(".json.enc")?;
    // Convert the filename format back to ISO 8601: replace position-specific hyphens with colons
    // 2026-03-29T14-30-00Z -> 2026-03-29T14:30:00Z
    let iso = format!(
        "{}:{}:{}",
        &stem[..13],  // 2026-03-29T14
        &stem[14..16], // 30
        &stem[17..],   // 00Z
    );
    iso.parse::<DateTime<Utc>>().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chronicle_filename_format() {
        let name = chronicle_filename();
        assert!(name.ends_with(".json.enc"));
        // Should be parseable
        assert!(parse_date_from_filename(&name).is_some());
    }

    #[test]
    fn parse_known_filename() {
        let dt = parse_date_from_filename("2026-03-29T14-30-00Z.json.enc");
        assert!(dt.is_some());
        let dt = dt.unwrap();
        assert_eq!(dt.format("%Y-%m-%d").to_string(), "2026-03-29");
    }

    #[test]
    fn role_serialization() {
        let mago = serde_json::to_string(&Role::Mago).unwrap();
        assert_eq!(mago, "\"mago\"");
        let demon = serde_json::to_string(&Role::Demon).unwrap();
        assert_eq!(demon, "\"demon\"");
    }
}
