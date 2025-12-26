use rusqlite::{params, Connection};
use std::{fs, path::PathBuf};
use tauri::Manager;

type Result<T> = std::result::Result<T, String>;

fn now_unix_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn project_db_path(app: &tauri::AppHandle, project_id: &str) -> Result<PathBuf> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;
    let dir = base.join("projects");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create project db dir: {e}"))?;
    Ok(dir.join(format!("{project_id}.db")))
}

fn open_project_conn(app: &tauri::AppHandle, project_id: &str, _passphrase: Option<&str>) -> Result<Connection> {
    let path = project_db_path(app, project_id)?;
    let conn = Connection::open(path).map_err(|e| format!("Failed to open project db: {e}"))?;

    // NOTE: 暫定の通常SQLiteモードでは、DB自体は暗号化しない。
    // 暗号化プロジェクトはフロント側でペイロード(JSON)を暗号化して保存するため、ここではpassphraseを使わない。

    conn.execute(
        "CREATE TABLE IF NOT EXISTS kv (\
            key TEXT PRIMARY KEY,\
            value TEXT NOT NULL,\
            updated_at INTEGER NOT NULL\
        )",
        [],
    )
    .map_err(|e| format!("Failed to init kv table: {e}"))?;

    Ok(conn)
}

pub fn save_kv(
    app: &tauri::AppHandle,
    project_id: &str,
    passphrase: Option<&str>,
    key: &str,
    value: &str,
) -> Result<()> {
    let conn = open_project_conn(app, project_id, passphrase)?;
    conn.execute(
        "INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?1, ?2, ?3)",
        params![key, value, now_unix_ms()],
    )
    .map_err(|e| format!("Failed to save kv: {e}"))?;
    Ok(())
}

pub fn load_kv(
    app: &tauri::AppHandle,
    project_id: &str,
    passphrase: Option<&str>,
    key: &str,
) -> Result<Option<String>> {
    let conn = open_project_conn(app, project_id, passphrase)?;
    let mut stmt = conn
        .prepare("SELECT value FROM kv WHERE key = ?1")
        .map_err(|e| format!("Failed to prepare kv select: {e}"))?;

    let mut rows = stmt
        .query(params![key])
        .map_err(|e| format!("Failed to query kv: {e}"))?;

    if let Some(row) = rows.next().map_err(|e| format!("Failed to read kv row: {e}"))? {
        let value: String = row.get(0).map_err(|e| format!("Failed to get kv value: {e}"))?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

pub fn delete_project_db(app: &tauri::AppHandle, project_id: &str) -> Result<()> {
    let path = project_db_path(app, project_id)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| format!("Failed to delete project db: {e}"))?;
    }
    Ok(())
}
