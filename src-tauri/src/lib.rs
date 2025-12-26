mod excel;
mod project_db;

use excel::{export_to_excel, ExportRequest};
use project_db::{delete_project_db, load_kv, save_kv};

#[tauri::command]
fn export_excel(request: ExportRequest, file_path: String) -> Result<(), String> {
    export_to_excel(&request, &file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn project_db_save(
  app: tauri::AppHandle,
  project_id: String,
  passphrase: Option<String>,
  key: String,
  value: String,
) -> Result<(), String> {
  save_kv(
    &app,
    &project_id,
    passphrase.as_deref(),
    &key,
    &value,
  )
}

#[tauri::command]
fn project_db_load(
  app: tauri::AppHandle,
  project_id: String,
  passphrase: Option<String>,
  key: String,
) -> Result<Option<String>, String> {
  load_kv(&app, &project_id, passphrase.as_deref(), &key)
}

#[tauri::command]
fn project_db_delete(app: tauri::AppHandle, project_id: String) -> Result<(), String> {
  delete_project_db(&app, &project_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
      export_excel,
      project_db_save,
      project_db_load,
      project_db_delete
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
