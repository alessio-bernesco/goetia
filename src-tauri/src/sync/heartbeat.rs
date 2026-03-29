// Periodic heartbeat for the distributed iCloud lock.
// Updates lock.json every 30 seconds while the app is running.

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use tokio::sync::Notify;
use tokio::task::JoinHandle;

use super::lock;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(30);

/// Handle to a running heartbeat task.
pub struct HeartbeatHandle {
    stop_signal: Arc<Notify>,
    task: JoinHandle<()>,
}

impl HeartbeatHandle {
    /// Start the periodic heartbeat.
    /// The heartbeat updates the iCloud lock.json every 30 seconds.
    pub fn start(icloud_lock_path: PathBuf, device_id: String) -> Self {
        let stop_signal = Arc::new(Notify::new());
        let stop = stop_signal.clone();

        let task = tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = tokio::time::sleep(HEARTBEAT_INTERVAL) => {
                        if let Err(e) = lock::update_heartbeat(&icloud_lock_path, &device_id) {
                            eprintln!("Heartbeat update failed: {}", e);
                        }
                    }
                    _ = stop.notified() => {
                        break;
                    }
                }
            }
        });

        Self { stop_signal, task }
    }

    /// Stop the heartbeat task.
    pub async fn stop(self) {
        self.stop_signal.notify_one();
        let _ = self.task.await;
    }
}
