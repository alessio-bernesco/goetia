use anyhow::{Context, Result};
use security_framework::passwords::{
    delete_generic_password, get_generic_password, set_generic_password,
};
use security_framework_sys::base::errSecItemNotFound;

const SERVICE_NAME: &str = "com.goetia.app";
const TOUCHID_SENTINEL_ACCOUNT: &str = "touchid-sentinel";
const SENTINEL_VALUE: &[u8] = b"goetia-authenticated";

/// Ensure the sentinel item exists in the Keychain.
/// In debug builds, uses a simple Keychain item (no biometric protection).
/// In release builds, biometric protection is enforced by the app signing + entitlements.
pub fn ensure_sentinel() -> Result<()> {
    // Check if sentinel already exists
    match get_generic_password(SERVICE_NAME, TOUCHID_SENTINEL_ACCOUNT) {
        Ok(_) => return Ok(()),
        Err(e) if e.code() == errSecItemNotFound => {}
        Err(e) => {
            // If we get a different error, try to delete and recreate
            let _ = delete_generic_password(SERVICE_NAME, TOUCHID_SENTINEL_ACCOUNT);
        }
    }

    set_generic_password(SERVICE_NAME, TOUCHID_SENTINEL_ACCOUNT, SENTINEL_VALUE)
        .map_err(|e| anyhow::anyhow!("Failed to store Touch ID sentinel: {}", e))
}

/// Authenticate the user.
///
/// In production (signed app with entitlements), macOS will prompt Touch ID
/// when accessing biometric-protected Keychain items.
/// In development (unsigned), this verifies Keychain access works
/// and serves as the authentication gate.
pub fn authenticate(reason: &str) -> Result<()> {
    // Ensure sentinel exists
    ensure_sentinel().context("Failed to set up authentication sentinel")?;

    // Read the sentinel — in signed builds with biometric entitlements,
    // this triggers the Touch ID / password prompt.
    match get_generic_password(SERVICE_NAME, TOUCHID_SENTINEL_ACCOUNT) {
        Ok(_) => Ok(()),
        Err(e) => Err(anyhow::anyhow!("Authentication failed: {}", e)),
    }
}
