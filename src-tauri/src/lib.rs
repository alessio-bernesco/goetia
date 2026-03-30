mod api;
mod auth;
mod commands;
mod crypto;
mod demons;
mod storage;
mod sync;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth_commands::authenticate,
            commands::auth_commands::store_api_key,
            commands::auth_commands::has_api_key,
            // Grimoire
            commands::grimoire_commands::grimoire_exists,
            commands::grimoire_commands::deploy_grimoire,
            commands::grimoire_commands::validate_grimoire,
            // Demons
            commands::demon_commands::list_demons,
            commands::demon_commands::get_demon,
            commands::demon_commands::get_essence,
            commands::demon_commands::banish_demon,
            // Chronicles
            commands::chronicle_commands::list_chronicles,
            commands::chronicle_commands::get_chronicle,
            // Genesis
            commands::genesis_commands::start_genesis,
            commands::genesis_commands::send_genesis_message,
            commands::genesis_commands::accept_demon,
            commands::genesis_commands::reject_genesis,
            // Session (evocation)
            commands::session_commands::start_session,
            commands::session_commands::send_message,
            commands::session_commands::end_session,
            commands::session_commands::inject_chronicle,
            // Config
            commands::config_commands::list_models,
            commands::config_commands::get_model,
            commands::config_commands::get_active_model,
            commands::config_commands::set_model,
            // Sync
            commands::sync_commands::acquire_lock,
            commands::sync_commands::release_lock,
            commands::sync_commands::sync_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
