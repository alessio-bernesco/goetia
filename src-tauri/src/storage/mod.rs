pub mod chronicles;
pub mod demons;
pub mod grimoire;
pub mod paths;

pub use chronicles::{
    Chronicle, ChronicleEntry, ChronicleMetadata, ChronicleTurn, Role,
    chronicle_filename, chronicle_filename_from, list_chronicles,
    read_chronicle, write_chronicle,
};

pub use demons::{
    DemonData, DemonEntry, DemonManifest,
    create_demon, delete_demon_dir, list_demons,
    read_demon, read_essence, read_manifest, read_seal, write_essence,
};

pub use grimoire::{
    deploy_grimoire, grimoire_exists, read_all_sections, read_grimoire_meta,
    read_grimoire_section, validate_grimoire,
};

pub use paths::{
    demon_chronicles_dir, demon_dir, demon_essence_path, demon_manifest_path, demon_seal_path,
    demons_dir, ensure_demon_dirs, ensure_dirs, grimoire_dir, grimoire_meta_path,
    grimoire_section_path, icloud_data_dir, local_data_dir, lock_pid_path,
};
