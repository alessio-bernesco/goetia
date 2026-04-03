// Context building — system prompt composition for genesis and evocation

use crate::api::client::SystemBlock;
use crate::crypto::grimoire_hash::section_names;
use crate::storage;

use anyhow::Result;

/// Build system prompt blocks for genesis mode.
/// Composition: grimoire §1 (identity) + §2 (laws) + §3 (genesis)
/// §1 and §2 are cached (stable across all sessions).
pub fn build_genesis_prompt(master_key: &[u8; 32], temple_id: &str) -> Result<Vec<SystemBlock>> {
    let names = section_names();
    // §1 identity — cached
    let identity = storage::read_grimoire_section(master_key, temple_id, names[0])?;
    // §2 laws — cached (last cached block gets the cache_control marker)
    let laws = storage::read_grimoire_section(master_key, temple_id, names[1])?;
    // §3 genesis — not cached (changes the semantic mode)
    let genesis = storage::read_grimoire_section(master_key, temple_id, names[2])?;

    Ok(vec![
        SystemBlock::cached(String::from_utf8_lossy(&identity)),
        SystemBlock::cached(String::from_utf8_lossy(&laws)),
        SystemBlock::text(String::from_utf8_lossy(&genesis)),
    ])
}

/// Build system prompt blocks for evocation mode.
/// Composition: grimoire §1 (identity) + §2 (laws) + §4 (session) + §5 (chronicles)
///              + demon seal + demon essence
/// §1 and §2 are cached. Seal is cached if stable (which it is — immutable after genesis).
pub fn build_evocation_prompt(
    master_key: &[u8; 32],
    temple_id: &str,
    demon_name: &str,
) -> Result<Vec<SystemBlock>> {
    let names = section_names();

    // §1 identity — cached
    let identity = storage::read_grimoire_section(master_key, temple_id, names[0])?;
    // §2 laws — cached
    let laws = storage::read_grimoire_section(master_key, temple_id, names[1])?;
    // §4 session protocol
    let session = storage::read_grimoire_section(master_key, temple_id, names[3])?;
    // §5 chronicles protocol
    let chronicles = storage::read_grimoire_section(master_key, temple_id, names[4])?;

    // Demon seal — cached (immutable after genesis)
    let seal = storage::read_seal(master_key, temple_id, demon_name)?;
    // Demon essence — not cached (changes every session)
    let essence = storage::read_essence(master_key, temple_id, demon_name)?;

    let mut blocks = vec![
        SystemBlock::cached(String::from_utf8_lossy(&identity)),
        SystemBlock::cached(String::from_utf8_lossy(&laws)),
        SystemBlock::text(String::from_utf8_lossy(&session)),
        SystemBlock::text(String::from_utf8_lossy(&chronicles)),
        SystemBlock::cached(seal),
    ];

    // Only include essence if non-empty (first evocation has no essence yet)
    if !essence.trim().is_empty() {
        blocks.push(SystemBlock::text(essence));
    }

    Ok(blocks)
}
