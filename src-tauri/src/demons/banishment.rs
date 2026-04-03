// Demon banishment — irreversible destruction
//
// Banishment permanently destroys all artifacts of a demon:
// seal, manifest, essence, and all chronicles.
// Requires explicit Touch ID confirmation.

use anyhow::Result;

use crate::auth::touchid;
use crate::crypto::{grimoire_hash, wipe};
use crate::storage::{self, genesis_registry, paths};

/// Banish a demon: require Touch ID, remove from registry, secure-wipe all files, remove from local and iCloud.
pub fn banish(master_key: &[u8; 32], temple_id: &str, demon_name: &str) -> Result<()> {
    // Require fresh Touch ID confirmation for this destructive operation
    touchid::authenticate("Conferma bandimento del demone")?;

    // Remove from genesis registry BEFORE deleting files
    if let Ok(meta) = storage::read_grimoire_meta(master_key, temple_id) {
        if let Ok(hash) = grimoire_hash::current_hash_bytes(&meta) {
            let _ = genesis_registry::remove_entry(master_key, &hash, temple_id, demon_name);
        }
    }

    // Wipe local files
    wipe::wipe_directory(&paths::demon_dir(temple_id, demon_name)?)?;

    // Wipe iCloud files if available
    if let Ok(icloud_dir) = paths::icloud_demon_dir(temple_id, demon_name) {
        if icloud_dir.exists() {
            wipe::wipe_directory(&icloud_dir)?;
        }
    }

    Ok(())
}
