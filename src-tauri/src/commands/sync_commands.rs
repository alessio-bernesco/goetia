// Tauri commands: acquire_lock, release_lock, sync_status

use crate::storage::paths;
use crate::sync::force_sync;
use crate::sync::icloud::{self, SyncStatus};
use crate::sync::lock;

/// Acquire both local PID lock and iCloud distributed lock.
#[tauri::command]
pub fn acquire_lock() -> Result<(), String> {
    let local_lock = paths::lock_pid_path().map_err(|e| e.to_string())?;
    let icloud_dir = paths::icloud_data_dir().map_err(|e| e.to_string())?;
    let icloud_lock = icloud_dir.join("lock.json");

    lock::acquire_locks(&local_lock, &icloud_lock).map_err(|e| e.to_string())
}

/// Release both locks, force-syncing to iCloud first.
#[tauri::command]
pub fn release_lock() -> Result<(), String> {
    let local_lock = paths::lock_pid_path().map_err(|e| e.to_string())?;
    let icloud_dir = paths::icloud_data_dir().map_err(|e| e.to_string())?;
    let icloud_lock = icloud_dir.join("lock.json");

    // Force sync before releasing
    let _ = force_sync::force_sync_to_icloud(&icloud_dir);

    lock::release_locks(&local_lock, &icloud_lock).map_err(|e| e.to_string())
}

/// Get current iCloud sync status.
#[tauri::command]
pub fn sync_status() -> Result<SyncStatus, String> {
    let icloud_dir = paths::icloud_data_dir().map_err(|e| e.to_string())?;
    if icloud::is_icloud_available(&icloud_dir) {
        Ok(SyncStatus::UpToDate)
    } else {
        Ok(SyncStatus::Error("iCloud non disponibile".to_string()))
    }
}
