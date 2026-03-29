use anyhow::{Context, Result};
use rand::RngCore;
use security_framework::passwords::{
    delete_generic_password, get_generic_password, set_generic_password,
};
use security_framework_sys::base::errSecItemNotFound;

const SERVICE_NAME: &str = "com.goetia.app";
const MASTER_KEY_ACCOUNT: &str = "master-key";
const API_KEY_ACCOUNT: &str = "anthropic-api-key";
const MASTER_KEY_LEN: usize = 32; // 256 bits

/// Store a secret in the macOS Keychain under the given account name.
pub fn store_secret(account: &str, secret: &[u8]) -> Result<()> {
    set_generic_password(SERVICE_NAME, account, secret)
        .map_err(|e| anyhow::anyhow!("Keychain store failed for '{}': {}", account, e))
}

/// Retrieve a secret from the macOS Keychain.
/// Returns `Ok(None)` if the item does not exist.
pub fn retrieve_secret(account: &str) -> Result<Option<Vec<u8>>> {
    match get_generic_password(SERVICE_NAME, account) {
        Ok(data) => Ok(Some(data)),
        Err(e) if e.code() == errSecItemNotFound => Ok(None),
        Err(e) => Err(anyhow::anyhow!(
            "Keychain retrieve failed for '{}': {}",
            account,
            e
        )),
    }
}

/// Check if a secret exists in the Keychain for the given account.
pub fn has_secret(account: &str) -> Result<bool> {
    match get_generic_password(SERVICE_NAME, account) {
        Ok(_) => Ok(true),
        Err(e) if e.code() == errSecItemNotFound => Ok(false),
        Err(e) => Err(anyhow::anyhow!(
            "Keychain check failed for '{}': {}",
            account,
            e
        )),
    }
}

/// Delete a secret from the Keychain.
/// Silently succeeds if the item does not exist.
pub fn delete_secret(account: &str) -> Result<()> {
    match delete_generic_password(SERVICE_NAME, account) {
        Ok(()) => Ok(()),
        Err(e) if e.code() == errSecItemNotFound => Ok(()),
        Err(e) => Err(anyhow::anyhow!(
            "Keychain delete failed for '{}': {}",
            account,
            e
        )),
    }
}

/// Generate a 256-bit random master key and store it in the Keychain.
/// Overwrites any existing master key.
pub fn generate_master_key() -> Result<()> {
    let mut key = vec![0u8; MASTER_KEY_LEN];
    rand::thread_rng().fill_bytes(&mut key);
    store_secret(MASTER_KEY_ACCOUNT, &key)
        .context("Failed to store generated master key in Keychain")
}

/// Retrieve the master key from the Keychain.
/// Returns `Ok(None)` if no master key has been generated yet.
pub fn get_master_key() -> Result<Option<Vec<u8>>> {
    retrieve_secret(MASTER_KEY_ACCOUNT)
}

/// Store the Anthropic API key in the Keychain.
pub fn store_api_key(key: &str) -> Result<()> {
    store_secret(API_KEY_ACCOUNT, key.as_bytes())
        .context("Failed to store API key in Keychain")
}

/// Retrieve the Anthropic API key from the Keychain.
/// Returns `Ok(None)` if no API key has been stored.
pub fn get_api_key() -> Result<Option<String>> {
    match retrieve_secret(API_KEY_ACCOUNT)? {
        Some(bytes) => {
            let key = String::from_utf8(bytes)
                .context("API key in Keychain is not valid UTF-8")?;
            Ok(Some(key))
        }
        None => Ok(None),
    }
}

/// Check if an Anthropic API key exists in the Keychain.
pub fn has_api_key() -> Result<bool> {
    has_secret(API_KEY_ACCOUNT)
}
