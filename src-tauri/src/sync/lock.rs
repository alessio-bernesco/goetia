// Local PID lock + distributed iCloud lock management

use std::fs;
use std::path::Path;

use anyhow::{bail, Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Local PID lock
// ---------------------------------------------------------------------------

/// Write current PID to `lock_path`. If a lock file already exists and the
/// recorded PID is still running, return an error instead of stealing the lock.
pub fn acquire_pid_lock(lock_path: &Path) -> Result<()> {
    if lock_path.exists() {
        let contents = fs::read_to_string(lock_path)
            .with_context(|| format!("Failed to read PID lock: {}", lock_path.display()))?;

        if let Ok(existing_pid) = contents.trim().parse::<i32>() {
            if is_pid_running(existing_pid) {
                bail!(
                    "Another Goetia instance is running (PID {}). Lock file: {}",
                    existing_pid,
                    lock_path.display()
                );
            }
        }
        // Stale lock — fall through and overwrite.
    }

    let pid = std::process::id();
    if let Some(parent) = lock_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create lock directory: {}", parent.display()))?;
    }
    fs::write(lock_path, pid.to_string())
        .with_context(|| format!("Failed to write PID lock: {}", lock_path.display()))?;

    Ok(())
}

/// Remove the PID lock file. Silently succeeds if the file does not exist.
pub fn release_pid_lock(lock_path: &Path) -> Result<()> {
    if lock_path.exists() {
        fs::remove_file(lock_path)
            .with_context(|| format!("Failed to remove PID lock: {}", lock_path.display()))?;
    }
    Ok(())
}

/// Check whether a process with the given PID is currently running.
/// Uses `libc::kill(pid, 0)` — signal 0 performs the check without sending
/// an actual signal.
pub fn is_pid_running(pid: i32) -> bool {
    // SAFETY: kill with signal 0 is a standard POSIX existence check.
    unsafe { libc::kill(pid, 0) == 0 }
}

// ---------------------------------------------------------------------------
// Distributed iCloud lock
// ---------------------------------------------------------------------------

/// Represents a lock held by a specific device in the iCloud container.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ICloudLock {
    pub device_id: String,
    pub timestamp: i64,
    pub heartbeat: i64,
    pub ttl_seconds: u64,
}

impl ICloudLock {
    /// Default TTL for a lock: 300 seconds (5 minutes).
    const DEFAULT_TTL: u64 = 300;

    pub fn new(device_id: String) -> Self {
        let now = Utc::now().timestamp();
        Self {
            device_id,
            timestamp: now,
            heartbeat: now,
            ttl_seconds: Self::DEFAULT_TTL,
        }
    }
}

/// Returns `true` when the current time exceeds `heartbeat + ttl`.
pub fn is_lock_expired(lock: &ICloudLock) -> bool {
    let now = Utc::now().timestamp();
    now > lock.heartbeat + lock.ttl_seconds as i64
}

/// Try to acquire the iCloud lock at `lock_path` for `device_id`.
///
/// - If no lock file exists, create one.
/// - If a lock file exists but belongs to this device, refresh it.
/// - If a lock file exists for another device and is expired, take over.
/// - Otherwise, fail.
pub fn acquire_icloud_lock(lock_path: &Path, device_id: &str) -> Result<()> {
    if lock_path.exists() {
        let raw = fs::read_to_string(lock_path)
            .with_context(|| format!("Failed to read iCloud lock: {}", lock_path.display()))?;

        let existing: ICloudLock = serde_json::from_str(&raw)
            .with_context(|| "Corrupt iCloud lock file")?;

        if existing.device_id == device_id {
            // Same device — refresh.
            let refreshed = ICloudLock::new(device_id.to_string());
            write_icloud_lock(lock_path, &refreshed)?;
            return Ok(());
        }

        if !is_lock_expired(&existing) {
            bail!(
                "iCloud lock held by device {} (heartbeat {}s ago). Lock file: {}",
                existing.device_id,
                Utc::now().timestamp() - existing.heartbeat,
                lock_path.display()
            );
        }
        // Expired lock from another device — take over.
    }

    let lock = ICloudLock::new(device_id.to_string());
    write_icloud_lock(lock_path, &lock)?;
    Ok(())
}

/// Release the iCloud lock by deleting the lock file.
pub fn release_icloud_lock(lock_path: &Path) -> Result<()> {
    if lock_path.exists() {
        fs::remove_file(lock_path)
            .with_context(|| format!("Failed to remove iCloud lock: {}", lock_path.display()))?;
    }
    Ok(())
}

/// Update the heartbeat timestamp in the lock file. Only succeeds if the
/// current lock belongs to the given `device_id`.
#[allow(dead_code)]
pub fn update_heartbeat(lock_path: &Path, device_id: &str) -> Result<()> {
    let raw = fs::read_to_string(lock_path)
        .with_context(|| format!("Failed to read iCloud lock: {}", lock_path.display()))?;

    let mut lock: ICloudLock = serde_json::from_str(&raw)
        .with_context(|| "Corrupt iCloud lock file")?;

    if lock.device_id != device_id {
        bail!(
            "Cannot update heartbeat: lock belongs to device {}, not {}",
            lock.device_id,
            device_id
        );
    }

    lock.heartbeat = Utc::now().timestamp();
    write_icloud_lock(lock_path, &lock)?;
    Ok(())
}

/// Generate or retrieve a stable device identifier.
///
/// The ID is persisted in `{local_data_dir}/device_id` so it survives restarts.
/// On first call a new UUID v4 is generated.
pub fn get_device_id(persist_path: &Path) -> Result<String> {
    if persist_path.exists() {
        let id = fs::read_to_string(persist_path)
            .with_context(|| "Failed to read device_id file")?;
        let id = id.trim().to_string();
        if !id.is_empty() {
            return Ok(id);
        }
    }

    let id = Uuid::new_v4().to_string();
    if let Some(parent) = persist_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create directory for device_id: {}", parent.display()))?;
    }
    fs::write(persist_path, &id)
        .with_context(|| "Failed to persist device_id")?;

    Ok(id)
}

// ---------------------------------------------------------------------------
// Combined lock
// ---------------------------------------------------------------------------

/// Acquire both the local PID lock and the iCloud distributed lock.
/// If the iCloud lock fails, the PID lock is released before returning
/// the error.
pub fn acquire_locks(local_path: &Path, icloud_path: &Path) -> Result<()> {
    let device_id_path = local_path
        .parent()
        .unwrap_or(Path::new("."))
        .join("device_id");

    let device_id = get_device_id(&device_id_path)?;

    acquire_pid_lock(local_path)?;

    if let Err(e) = acquire_icloud_lock(icloud_path, &device_id) {
        // Roll back the local lock on failure.
        let _ = release_pid_lock(local_path);
        return Err(e);
    }

    Ok(())
}

/// Release both locks. Errors from individual releases are combined.
pub fn release_locks(local_path: &Path, icloud_path: &Path) -> Result<()> {
    let r1 = release_pid_lock(local_path);
    let r2 = release_icloud_lock(icloud_path);

    r1.and(r2)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn write_icloud_lock(lock_path: &Path, lock: &ICloudLock) -> Result<()> {
    if let Some(parent) = lock_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create lock directory: {}", parent.display()))?;
    }
    let json = serde_json::to_string_pretty(lock)
        .context("Failed to serialize iCloud lock")?;
    fs::write(lock_path, json)
        .with_context(|| format!("Failed to write iCloud lock: {}", lock_path.display()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn current_pid_is_running() {
        let pid = std::process::id() as i32;
        assert!(is_pid_running(pid));
    }

    #[test]
    fn bogus_pid_is_not_running() {
        // PID 99999999 almost certainly does not exist.
        assert!(!is_pid_running(99_999_999));
    }

    #[test]
    fn icloud_lock_expires() {
        let mut lock = ICloudLock::new("test-device".into());
        // Push heartbeat far into the past.
        lock.heartbeat = Utc::now().timestamp() - 600;
        lock.ttl_seconds = 300;
        assert!(is_lock_expired(&lock));
    }

    #[test]
    fn icloud_lock_not_expired() {
        let lock = ICloudLock::new("test-device".into());
        assert!(!is_lock_expired(&lock));
    }
}
