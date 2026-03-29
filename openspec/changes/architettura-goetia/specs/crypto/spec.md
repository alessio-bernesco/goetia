## ADDED Requirements

### Requirement: AES-256-GCM encryption for all persisted data
The system SHALL encrypt all persisted data (grimoire, seals, manifests, essences, chronicles) using AES-256-GCM. No plaintext data SHALL ever be written to disk.

#### Scenario: File encryption
- **WHEN** the backend persists any demon artifact or grimoire section
- **THEN** the file SHALL be encrypted with AES-256-GCM using a per-file derived key

#### Scenario: File decryption
- **WHEN** the backend reads any encrypted file
- **THEN** it SHALL decrypt using the per-file derived key and verify the GCM authentication tag

### Requirement: Per-file key derivation via HKDF
The system SHALL derive a unique encryption key for each file using HKDF with the master key as input keying material and the file's canonical path as salt. The same master key MUST never be used directly for encryption.

#### Scenario: Key derivation for a demon seal
- **WHEN** encrypting `demons/astaroth/seal.md`
- **THEN** the encryption key SHALL be `HKDF(master_key, salt="demons/astaroth/seal.md")`

#### Scenario: Different files produce different keys
- **WHEN** encrypting two different files
- **THEN** their derived keys MUST be different (guaranteed by unique paths as salt)

### Requirement: Grimoire hash chain as root of trust
The system SHALL compute a SHA-256 hash of the concatenated grimoire content (all 5 sections in canonical order) and include this hash in the header of every encrypted artifact.

#### Scenario: Grimoire hash computation
- **WHEN** the grimoire is loaded and decrypted
- **THEN** the system SHALL compute `SHA-256(identity.md || laws.md || genesis.md || session.md || chronicles.md)` as the grimoire hash

#### Scenario: Artifact validation against grimoire
- **WHEN** the system decrypts any demon artifact
- **THEN** it SHALL verify that the grimoire_hash in the file header matches the current grimoire hash or exists in the hash chain

#### Scenario: Hash chain versioning on grimoire upgrade
- **WHEN** the grimoire is upgraded (content changes)
- **THEN** the new hash SHALL be appended to the chain in `meta.json`, preserving all previous hashes. Existing demons remain valid.

### Requirement: Encrypted file format
Every `.enc` file SHALL follow the binary format: `[grimoire_hash (32 bytes) | nonce (12 bytes) | ciphertext (variable) | auth_tag (16 bytes)]`.

#### Scenario: File structure verification
- **WHEN** reading an encrypted file
- **THEN** the system SHALL parse the first 32 bytes as grimoire_hash, next 12 as nonce, the last 16 as auth_tag, and everything in between as ciphertext

### Requirement: Secure wipe for banishment
The system SHALL overwrite file contents with cryptographically random data before deletion during banishment. Additionally, the key derivation mapping for the demon's files SHALL be invalidated.

#### Scenario: Demon file destruction
- **WHEN** a demon is banished
- **THEN** each file of the demon SHALL be overwritten with random bytes, then deleted from both local and iCloud storage
