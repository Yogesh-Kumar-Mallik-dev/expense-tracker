const CREDENTIAL_SERVICE: &str = "expense-tracker";
const REFRESH_ACCOUNT: &str = "refresh-token";

#[tauri::command]
fn read_refresh_credential() -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(CREDENTIAL_SERVICE, REFRESH_ACCOUNT)
        .map_err(|error| error.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn write_refresh_credential(value: String) -> Result<(), String> {
    keyring::Entry::new(CREDENTIAL_SERVICE, REFRESH_ACCOUNT)
        .map_err(|error| error.to_string())?
        .set_password(&value)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn clear_refresh_credential() -> Result<(), String> {
    let entry = keyring::Entry::new(CREDENTIAL_SERVICE, REFRESH_ACCOUNT)
        .map_err(|error| error.to_string())?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_powersync::init())
        .invoke_handler(tauri::generate_handler![
            read_refresh_credential,
            write_refresh_credential,
            clear_refresh_credential
        ])
        .run(tauri::generate_context!())
        .expect("error while running Expense Tracker");
}
