// Force sync via NSFileCoordinator before lock release.
//
// Uses macOS NSFileCoordinator to ensure all local changes are uploaded to iCloud
// before the application exits and releases the distributed lock.

use std::path::Path;
use std::process::Command;

use anyhow::{Context, Result};

/// Force iCloud to coordinate writes for a directory.
///
/// This uses a subprocess to invoke a small Swift snippet that calls
/// NSFileCoordinator to ensure pending writes are flushed to iCloud.
/// This is the standard macOS mechanism for ensuring iCloud consistency.
pub fn force_sync_to_icloud(icloud_dir: &Path) -> Result<()> {
    if !icloud_dir.exists() {
        return Ok(());
    }

    // Use `swift` to invoke NSFileCoordinator.
    // This is a lightweight approach that avoids needing a separate Swift binary.
    let swift_code = format!(
        r#"
        import Foundation
        let url = URL(fileURLWithPath: "{}")
        let coordinator = NSFileCoordinator()
        var error: NSError?
        coordinator.coordinate(writingItemAt: url, options: .forMerging, error: &error) {{ newURL in
            // Touch the directory to trigger iCloud upload
            try? FileManager.default.setAttributes(
                [.modificationDate: Date()],
                ofItemAtPath: newURL.path
            )
        }}
        if let error = error {{
            fputs("NSFileCoordinator error: \(error.localizedDescription)\n", stderr)
            exit(1)
        }}
        "#,
        icloud_dir.display()
    );

    let output = Command::new("swift")
        .arg("-e")
        .arg(&swift_code)
        .output()
        .context("Failed to execute swift for NSFileCoordinator")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("NSFileCoordinator force sync failed: {}", stderr);
    }

    Ok(())
}
