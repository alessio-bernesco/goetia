use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, AeadCore, Nonce,
};
use anyhow::{Context, Result};
use hkdf::Hkdf;
use sha2::Sha256;

/// Encrypted file format:
/// [grimoire_hash (32 bytes) | nonce (12 bytes) | ciphertext (variable) | auth_tag (16 bytes)]
///
/// AES-256-GCM produces ciphertext with the auth tag appended by the aes-gcm crate.

const GRIMOIRE_HASH_LEN: usize = 32;
const NONCE_LEN: usize = 12;

/// Derive a per-file encryption key from the master key using HKDF-SHA256.
/// The file path is used as salt to ensure unique keys per file.
fn derive_key(master_key: &[u8; 32], file_path: &str) -> [u8; 32] {
    let hk = Hkdf::<Sha256>::new(Some(file_path.as_bytes()), master_key);
    let mut key = [0u8; 32];
    hk.expand(b"goetia-file-key", &mut key)
        .expect("HKDF expand should not fail with 32-byte output");
    key
}

/// Encrypt plaintext data for a specific file path.
/// Returns the full encrypted file contents including grimoire_hash header.
pub fn encrypt(
    master_key: &[u8; 32],
    grimoire_hash: &[u8; 32],
    file_path: &str,
    plaintext: &[u8],
) -> Result<Vec<u8>> {
    let key = derive_key(master_key, file_path);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .context("Failed to create AES-256-GCM cipher")?;
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| anyhow::anyhow!("Encryption failed: {}", e))?;

    let mut output = Vec::with_capacity(GRIMOIRE_HASH_LEN + NONCE_LEN + ciphertext.len());
    output.extend_from_slice(grimoire_hash);
    output.extend_from_slice(&nonce);
    output.extend_from_slice(&ciphertext);
    Ok(output)
}

/// Decrypt an encrypted file. Returns (grimoire_hash_from_header, plaintext).
pub fn decrypt(
    master_key: &[u8; 32],
    file_path: &str,
    encrypted: &[u8],
) -> Result<([u8; 32], Vec<u8>)> {
    if encrypted.len() < GRIMOIRE_HASH_LEN + NONCE_LEN + 16 {
        anyhow::bail!("Encrypted data too short");
    }

    let grimoire_hash: [u8; 32] = encrypted[..GRIMOIRE_HASH_LEN]
        .try_into()
        .context("Failed to extract grimoire hash")?;
    let nonce_bytes = &encrypted[GRIMOIRE_HASH_LEN..GRIMOIRE_HASH_LEN + NONCE_LEN];
    let nonce = Nonce::from_slice(nonce_bytes);
    let ciphertext = &encrypted[GRIMOIRE_HASH_LEN + NONCE_LEN..];

    let key = derive_key(master_key, file_path);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .context("Failed to create AES-256-GCM cipher")?;
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))?;

    Ok((grimoire_hash, plaintext))
}

/// Overwrite a file with random data before deletion (secure wipe).
pub fn secure_wipe(path: &std::path::Path) -> Result<()> {
    use rand::RngCore;
    use std::fs;
    use std::io::Write;

    if path.exists() {
        let metadata = fs::metadata(path)?;
        let size = metadata.len() as usize;
        let mut random_data = vec![0u8; size];
        rand::thread_rng().fill_bytes(&mut random_data);
        let mut file = fs::OpenOptions::new().write(true).open(path)?;
        file.write_all(&random_data)?;
        file.sync_all()?;
        fs::remove_file(path)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let master_key = [42u8; 32];
        let grimoire_hash = [7u8; 32];
        let file_path = "demons/test/seal.md";
        let plaintext = b"This is a test seal document.";

        let encrypted = encrypt(&master_key, &grimoire_hash, file_path, plaintext).unwrap();
        let (recovered_hash, recovered_plaintext) =
            decrypt(&master_key, file_path, &encrypted).unwrap();

        assert_eq!(recovered_hash, grimoire_hash);
        assert_eq!(recovered_plaintext, plaintext);
    }

    #[test]
    fn test_different_paths_different_ciphertext() {
        let master_key = [42u8; 32];
        let grimoire_hash = [7u8; 32];
        let plaintext = b"Same content";

        let enc1 = encrypt(&master_key, &grimoire_hash, "path/a", plaintext).unwrap();
        let enc2 = encrypt(&master_key, &grimoire_hash, "path/b", plaintext).unwrap();

        // Ciphertexts should differ (different keys + different nonces)
        assert_ne!(enc1, enc2);
    }
}
