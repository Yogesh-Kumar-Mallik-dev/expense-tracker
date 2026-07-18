use async_trait::async_trait;
use futures_lite::StreamExt;
use powersync::error::PowerSyncError;
use powersync::{BackendConnector, PowerSyncCredentials, PowerSyncDatabase, SyncOptions};
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::{Arc, RwLock};
use tauri::{AppHandle, Runtime, State};
use tauri_plugin_powersync::PowerSyncExt;

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

#[derive(Default)]
struct DesktopSyncState {
    access_token: Arc<RwLock<String>>,
}

#[derive(Clone)]
struct ApiConnector {
    database: PowerSyncDatabase,
    api_url: String,
    access_token: Arc<RwLock<String>>,
    http: reqwest::Client,
}

impl ApiConnector {
    fn token(&self) -> String {
        self.access_token
            .read()
            .expect("access token lock poisoned")
            .clone()
    }

    async fn persist_conflict(
        &self,
        crud_transaction_id: String,
        operations: &[Value],
        payload: &Value,
    ) -> Result<(), PowerSyncError> {
        let conflict = &payload["error"]["conflict"];
        let operation_index = conflict["operationIndex"].as_u64().unwrap_or(0) as usize;
        let operation = operations
            .get(operation_index)
            .or_else(|| operations.first())
            .cloned()
            .unwrap_or_else(|| json!({}));
        let fields = serde_json::to_string(
            conflict["fields"]
                .as_array()
                .cloned()
                .unwrap_or_default()
                .as_slice(),
        )?;
        let writer = self.database.writer().await?;
        writer.execute(
            r#"INSERT INTO "SyncConflict"
               ("id", "crudTransactionId", "entity", "recordId", "operation",
                "kind", "fields", "message", "recovery", "createdAt", "resolvedAt")
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL)"#,
            params![
                uuid::Uuid::new_v4().to_string(),
                crud_transaction_id,
                operation["table"].as_str().unwrap_or("Unknown"),
                operation["id"].as_str().unwrap_or("unknown"),
                operation["op"].as_str().unwrap_or("UNKNOWN"),
                conflict["kind"].as_str().unwrap_or("UNKNOWN"),
                fields,
                payload["error"]["message"]
                    .as_str()
                    .unwrap_or("Synchronization conflict"),
                conflict["recovery"].as_str().unwrap_or("REVIEW"),
                chrono_timestamp(),
            ],
        )?;
        Ok(())
    }
}

fn chrono_timestamp() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[async_trait]
impl BackendConnector for ApiConnector {
    async fn fetch_credentials(&self) -> Result<PowerSyncCredentials, PowerSyncError> {
        let value: Value = self
            .http
            .get(format!(
                "{}/api/powersync/credentials",
                self.api_url.trim_end_matches('/')
            ))
            .bearer_auth(self.token())
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        let data = &value["data"];
        Ok(PowerSyncCredentials {
            endpoint: data["endpoint"].as_str().unwrap_or_default().to_owned(),
            token: data["token"].as_str().unwrap_or_default().to_owned(),
        })
    }

    async fn upload_data(&self) -> Result<(), PowerSyncError> {
        let mut transactions = self.database.crud_transactions();
        while let Some(transaction) = transactions.next().await {
            let transaction = transaction?;
            let operations: Vec<Value> = transaction
                .crud
                .iter()
                .map(|entry| {
                    json!({
                        "op": entry.update_type,
                        "table": entry.table,
                        "id": entry.id,
                        "data": entry.data,
                    })
                })
                .collect();
            let response = self
                .http
                .post(format!(
                    "{}/api/powersync/upload",
                    self.api_url.trim_end_matches('/')
                ))
                .bearer_auth(self.token())
                .json(&json!({ "operations": operations }))
                .send()
                .await?;
            if !response.status().is_success() {
                let status = response.status();
                let payload: Value = response.json().await.unwrap_or_else(|_| json!({}));
                if payload["error"]["code"] == "PERMANENT_SYNC_CONFLICT" {
                    self.persist_conflict(
                        transaction
                            .id
                            .map(|id| id.to_string())
                            .unwrap_or_else(|| transaction.last_item_id.to_string()),
                        &operations,
                        &payload,
                    )
                    .await?;
                    transaction.complete().await?;
                    continue;
                }
                return Err(PowerSyncError::from(rusqlite::Error::InvalidParameterName(
                    format!(
                        "PowerSync upload failed with {status}: {}",
                        payload["error"]["message"]
                            .as_str()
                            .unwrap_or("unknown response")
                    ),
                )));
            }
            transaction.complete().await?;
        }
        Ok(())
    }
}

#[tauri::command]
async fn connect_powersync<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, DesktopSyncState>,
    handle: usize,
    api_url: String,
    access_token: String,
) -> tauri_plugin_powersync::Result<()> {
    *state
        .access_token
        .write()
        .expect("access token lock poisoned") = access_token;
    let database = app.powersync().database_from_javascript_handle(handle)?;
    database
        .connect(SyncOptions::new(ApiConnector {
            database: database.clone(),
            api_url,
            access_token: state.access_token.clone(),
            http: reqwest::Client::new(),
        }))
        .await;
    Ok(())
}

#[tauri::command]
fn update_powersync_access_token(state: State<'_, DesktopSyncState>, access_token: String) {
    *state
        .access_token
        .write()
        .expect("access token lock poisoned") = access_token;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DesktopSyncState::default())
        .plugin(tauri_plugin_powersync::init())
        .invoke_handler(tauri::generate_handler![
            read_refresh_credential,
            write_refresh_credential,
            clear_refresh_credential,
            connect_powersync,
            update_powersync_access_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running Expense Tracker");
}
