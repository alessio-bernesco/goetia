use anyhow::{Context, Result};
use security_framework::access_control::{ProtectionMode, SecAccessControl};
use security_framework::passwords::{
    generic_password, set_generic_password_options, AccessControlOptions, PasswordOptions,
};
use security_framework_sys::base::errSecItemNotFound;

const SERVICE_NAME: &str = "com.goetia.app";
const TOUCHID_SENTINEL_ACCOUNT: &str = "touchid-sentinel";
const SENTINEL_VALUE: &[u8] = b"goetia-authenticated";

/// Build password options for the biometric-protected sentinel item.
fn biometric_options() -> PasswordOptions {
    let mut opts = PasswordOptions::new_generic_password(SERVICE_NAME, TOUCHID_SENTINEL_ACCOUNT);
    let access_control = SecAccessControl::create_with_protection(
        Some(ProtectionMode::AccessibleWhenPasscodeSetThisDeviceOnly),
        AccessControlOptions::BIOMETRY_ANY.bits(),
    )
    .expect("Failed to create biometric access control");
    opts.set_access_control(access_control);
    opts
}

/// Ensure the biometric sentinel item exists in the Keychain.
/// This must be called once (e.g. during initial setup) before `authenticate` can work.
/// If the sentinel already exists, this is a no-op.
pub fn ensure_sentinel() -> Result<()> {
    // Check if sentinel already exists by trying a non-biometric lookup first.
    // We just try to store it; set_generic_password_options handles duplicates via update.
    let opts = biometric_options();
    set_generic_password_options(SENTINEL_VALUE, opts)
        .map_err(|e| anyhow::anyhow!("Failed to store Touch ID sentinel: {}", e))
}

/// Authenticate the user via Touch ID.
///
/// This works by attempting to read a biometric-protected Keychain item.
/// macOS will prompt the user for Touch ID (or password fallback) automatically.
/// Returns `Ok(())` on successful authentication, `Err` on failure or cancellation.
pub fn authenticate(_reason: &str) -> Result<()> {
    let opts = biometric_options();

    match generic_password(opts) {
        Ok(_) => Ok(()),
        Err(e) if e.code() == errSecItemNotFound => {
            // Sentinel doesn't exist yet — create it and retry
            ensure_sentinel().context("Touch ID sentinel setup failed")?;
            let opts = biometric_options();
            generic_password(opts)
                .map(|_| ())
                .map_err(|e| anyhow::anyhow!("Touch ID authentication failed: {}", e))
        }
        Err(e) => Err(anyhow::anyhow!("Touch ID authentication failed: {}", e)),
    }
}
