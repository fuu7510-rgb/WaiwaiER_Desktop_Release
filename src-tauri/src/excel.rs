use rust_xlsxwriter::{Format, Note, Workbook, XlsxError};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

const RAW_NOTE_OVERRIDE_KEY: &str = "__AppSheetNoteOverride";
const NOTE_PARAM_DEFAULT_KEY: &str = "Default";
const NOTE_PARAM_DEFAULT_KEY_LEGACY: &str = "DEFAULT";

// フロントエンドから受け取るカラム制約の型
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColumnConstraints {
    pub required: Option<bool>,
    pub unique: Option<bool>,
    pub default_value: Option<String>,
    pub min_value: Option<f64>,
    pub max_value: Option<f64>,
    pub min_length: Option<u32>,
    pub max_length: Option<u32>,
    pub pattern: Option<String>,
    pub enum_values: Option<Vec<String>>,
    pub ref_table_id: Option<String>,
    pub ref_column_id: Option<String>,
}

// フロントエンドから受け取るカラムの型
#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Column {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub column_type: String,
    pub is_key: bool,
    pub is_label: bool,
    pub description: Option<String>,
    #[serde(default)]
    pub app_sheet: Option<serde_json::Map<String, Value>>,
    pub constraints: ColumnConstraints,
    pub order: u32,
}

// フロントエンドから受け取るテーブルの型
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Table {
    pub id: String,
    pub name: String,
    pub columns: Vec<Column>,
}

// サンプルデータの型
#[derive(Debug, Deserialize)]
pub struct SampleRow {
    #[serde(flatten)]
    pub values: std::collections::HashMap<String, serde_json::Value>,
}

// エクスポートリクエストの型
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequest {
    pub tables: Vec<Table>,
    pub sample_data: std::collections::HashMap<String, Vec<SampleRow>>,
    pub include_data: bool,
    /// ユーザー設定: Note Parameters 出力設定（キー名: 出力するか）
    #[serde(default)]
    pub note_param_output_settings: Option<HashMap<String, bool>>,
}

// Excelのヘッダーセルに書き込む予定のNote（AppSheet Note Parameters）をプレビュー用に返す。
// export_to_excel() と同じロジック（Labelの正規化 + generate_column_note）を使用して一致させる。
// 戻り値: tableId -> (columnId -> noteText)
pub fn preview_column_notes(request: &ExportRequest) -> HashMap<String, HashMap<String, String>> {
    let mut by_table: HashMap<String, HashMap<String, String>> = HashMap::new();
    let user_settings = request.note_param_output_settings.as_ref();

    for table in &request.tables {
        let effective_label_column_id = pick_effective_label_column_id(table);

        let mut by_column: HashMap<String, String> = HashMap::new();
        for column in &table.columns {
            let mut column_for_note = column.clone();
            column_for_note.is_label = effective_label_column_id
                .is_some_and(|id| id == column_for_note.id);

            let note_text = generate_column_note(&column_for_note, &request.tables, user_settings);
            let has_override = has_user_note_override(&column_for_note);

            // export_to_excel と同様に、実際に書き込まれる場合のみ返す（空は ""）
            if has_override || note_text != "AppSheet:{}" {
                by_column.insert(column.id.clone(), note_text);
            } else {
                by_column.insert(column.id.clone(), String::new());
            }
        }

        by_table.insert(table.id.clone(), by_column);
    }

    by_table
}

// Note Parametersのサポート状況
// docs/AppSheet/NOTE_PARAMETERS_SUPPORT_STATUS.md に検証結果を記録する
//
// ステータス:
// - Verified: AppSheetで正しく認識されることを確認済み
// - Unstable: 環境によって動作したりしなかったりする
// - Unsupported: AppSheetで認識されない、または動作しない
// - Untested: まだテストしていない
#[derive(Debug, Clone, Copy, PartialEq)]
enum NoteParamStatus {
    Verified,  // ✅ 確認済み
    Unstable,  // ⚠️ 不安定
    Unsupported, // ❌ 未対応
    Untested,  // 🔍 未検証
}

// 各Note Parameterキーのサポート状況を返す
// NOTE: 検証結果が得られたらここを更新し、NOTE_PARAMETERS_SUPPORT_STATUS.md にも記録する
fn get_note_param_status(key: &str) -> NoteParamStatus {
    match key {
        // 基本設定
        "Type" => NoteParamStatus::Verified,
        "IsRequired" => NoteParamStatus::Verified,
        "Required_If" => NoteParamStatus::Verified,
        "IsHidden" => NoteParamStatus::Unstable,
        "Show_If" => NoteParamStatus::Verified,
        "DisplayName" => NoteParamStatus::Unstable,
        "Description" => NoteParamStatus::Verified,
        // NOTE: Key names are case-sensitive in AppSheet.
        // `Default` is correct; `DEFAULT` is a legacy mistake kept for backward compatibility.
        NOTE_PARAM_DEFAULT_KEY | NOTE_PARAM_DEFAULT_KEY_LEGACY => NoteParamStatus::Verified,
        "AppFormula" => NoteParamStatus::Verified,
        
        // 識別・検索設定
        "IsKey" => NoteParamStatus::Verified,
        "IsLabel" => NoteParamStatus::Unsupported,
        "IsScannable" => NoteParamStatus::Unsupported,
        "IsNfcScannable" => NoteParamStatus::Unsupported,
        "Searchable" => NoteParamStatus::Unsupported,
        "IsSensitive" => NoteParamStatus::Unsupported,
        
        // バリデーション設定
        "Valid_If" => NoteParamStatus::Untested,
        "Error_Message_If_Invalid" => NoteParamStatus::Untested,
        "Suggested_Values" => NoteParamStatus::Untested,
        "Editable_If" => NoteParamStatus::Verified,
        "Reset_If" => NoteParamStatus::Verified,
        
        // 数値型設定
        "MinValue" => NoteParamStatus::Untested,
        "MaxValue" => NoteParamStatus::Untested,
        "DecimalDigits" => NoteParamStatus::Untested,
        "NumericDigits" => NoteParamStatus::Untested,
        "ShowThousandsSeparator" => NoteParamStatus::Untested,
        "NumberDisplayMode" => NoteParamStatus::Untested,
        "StepValue" => NoteParamStatus::Untested,
        
        // Enum型設定
        "EnumValues" => NoteParamStatus::Untested,
        "BaseType" => NoteParamStatus::Untested,
        "EnumInputMode" => NoteParamStatus::Untested,
        "AllowOtherValues" => NoteParamStatus::Untested,
        "AutoCompleteOtherValues" => NoteParamStatus::Untested,
        "ReferencedRootTableName" => NoteParamStatus::Untested,
        
        // Ref型設定
        "ReferencedTableName" => NoteParamStatus::Untested,
        "ReferencedKeyColumn" => NoteParamStatus::Untested,
        "ReferencedType" => NoteParamStatus::Untested,
        "IsAPartOf" => NoteParamStatus::Untested,
        "InputMode" => NoteParamStatus::Untested,
        
        // テキスト型設定
        "LongTextFormatting" => NoteParamStatus::Untested,
        "ItemSeparator" => NoteParamStatus::Untested,
        
        // メタキー
        "TypeAuxData" => NoteParamStatus::Untested,
        "BaseTypeQualifier" => NoteParamStatus::Untested,
        
        // その他
        "UpdateMode" => NoteParamStatus::Untested,
        "ChangeColumns" => NoteParamStatus::Untested,
        "ChangeValues" => NoteParamStatus::Untested,
        
        _ => NoteParamStatus::Untested,
    }
}

// 検証目的でエクスポートを許可するNote Parameterキー。
// NOTE: サポート状況（get_note_param_status）は Untested のまま維持し、
//       “出力できるかどうか” とは分離して扱う。
fn is_export_whitelisted_note_param(_key: &str) -> bool {
    false
}

// 指定されたキーを出力すべきかどうかを判定
// ユーザー設定がある場合はそれに従う。ない場合はデフォルト動作（Verified のみ）。
fn should_output_note_param(key: &str, user_settings: Option<&HashMap<String, bool>>) -> bool {
    // ユーザー設定がある場合はそれに従う
    if let Some(settings) = user_settings {
        // 保存された設定を最優先する。
        // 未定義キーは「未チェック（false）」として扱い、新しいデフォルトにフォールバックしない。
        if key == NOTE_PARAM_DEFAULT_KEY {
            return settings
                .get(NOTE_PARAM_DEFAULT_KEY)
                .or_else(|| settings.get(NOTE_PARAM_DEFAULT_KEY_LEGACY))
                .copied()
                .unwrap_or(false);
        }
        if key == NOTE_PARAM_DEFAULT_KEY_LEGACY {
            return settings
                .get(NOTE_PARAM_DEFAULT_KEY)
                .or_else(|| settings.get(NOTE_PARAM_DEFAULT_KEY_LEGACY))
                .copied()
                .unwrap_or(false);
        }
        return settings.get(key).copied().unwrap_or(false);
    }
    // デフォルト: Verified のみ + ホワイトリスト
    matches!(get_note_param_status(key), NoteParamStatus::Verified)
        || is_export_whitelisted_note_param(key)
}

// AppSheetのLabel列はテーブルにつき1つが基本。
// 複数の IsLabel があると反映が不安定になることがあるため、エクスポート時は最小 order の列に正規化する。
fn pick_effective_label_column_id(table: &Table) -> Option<&str> {
    table
        .columns
        .iter()
        .filter(|c| c.is_label)
        .min_by_key(|c| c.order)
        .map(|c| c.id.as_str())
}

fn has_user_note_override(column: &Column) -> bool {
    column
        .app_sheet
        .as_ref()
        .and_then(|m| m.get(RAW_NOTE_OVERRIDE_KEY))
        .and_then(|v| v.as_str())
        .is_some_and(|s| !s.trim().is_empty())
}

fn parse_type_aux_data_object_from_str(s: &str) -> Option<serde_json::Map<String, Value>> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return Some(serde_json::Map::new());
    }

    // Case 1: raw JSON object text: {"Show_If":"..."}
    if let Ok(Value::Object(obj)) = serde_json::from_str::<Value>(trimmed) {
        return Some(obj);
    }

    // Case 2: already-escaped JSON object text copied from docs:
    // {\"Show_If\":\"context(\\\"ViewType\\\") = \\\"Table\\\"\"}
    // Wrap as a JSON string literal to unescape, then parse again.
    if let Ok(unescaped) = serde_json::from_str::<String>(&format!("\"{}\"", trimmed)) {
        if let Ok(Value::Object(obj)) = serde_json::from_str::<Value>(&unescaped) {
            return Some(obj);
        }
    }

    None
}

fn normalize_formula_key_into_type_aux_data(data: &mut serde_json::Map<String, Value>, key: &str) {
    let raw = data.remove(key);
    let formula = match raw {
        None | Some(Value::Null) => return,
        Some(Value::String(s)) => {
            if s.trim().is_empty() {
                return;
            }
            s
        }
        Some(other) => other.to_string(),
    };

    let mut aux_obj = match data.get("TypeAuxData") {
        Some(Value::String(s)) => parse_type_aux_data_object_from_str(s).unwrap_or_else(serde_json::Map::new),
        Some(Value::Object(obj)) => obj.clone(),
        _ => serde_json::Map::new(),
    };

    aux_obj.insert(key.to_string(), Value::String(formula));

    // TypeAuxData must be a JSON string value in Note Parameters.
    let aux_str = serde_json::to_string(&Value::Object(aux_obj)).unwrap_or_else(|_| "{}".to_string());
    data.insert("TypeAuxData".to_string(), Value::String(aux_str));
}

fn normalize_formulas_into_type_aux_data(data: &mut serde_json::Map<String, Value>) {
    // docs/AppSheet/MEMO_SETUP.md の推奨に合わせ、数式系キーは TypeAuxData（JSON文字列）へ入れる。
    // （トップレベルの式キーは環境によって不安定なケースがある）
    normalize_formula_key_into_type_aux_data(data, "Show_If");
    normalize_formula_key_into_type_aux_data(data, "Required_If");
    normalize_formula_key_into_type_aux_data(data, "Editable_If");
    normalize_formula_key_into_type_aux_data(data, "Reset_If");
}

// カラム設定のメモ内容を生成
fn generate_column_note(column: &Column, tables: &[Table], user_settings: Option<&HashMap<String, bool>>) -> String {
    // docs/AppSheet/MEMO_SETUP.md に従い、AppSheet Note Parameters の形式で出力する
    // 例: AppSheet:{"Type":"Ref","IsRequired":true,"ReferencedTableName":"顧客"}
    //
    // NOTE: should_output_note_param() でユーザー設定またはデフォルト（Verified）に従って出力する
    
    let user = column.app_sheet.as_ref();

    // Raw override: if present, it fully overrides generated Note.
    if let Some(user_map) = user {
        if let Some(Value::String(raw)) = user_map.get(RAW_NOTE_OVERRIDE_KEY) {
            if !raw.trim().is_empty() {
                return raw.clone();
            }
        }
    }

    let mut data = serde_json::Map::<String, Value>::new();

    let user_has = |k: &str| -> bool {
        user.map(|m| {
            if k == NOTE_PARAM_DEFAULT_KEY {
                m.contains_key(NOTE_PARAM_DEFAULT_KEY) || m.contains_key(NOTE_PARAM_DEFAULT_KEY_LEGACY)
            } else {
                m.contains_key(k)
            }
        })
        .unwrap_or(false)
    };

    // Spec: If Required_If is present (non-empty), Require? (IsRequired) should not be output.
    let user_required_if_non_empty = user
        .and_then(|m| m.get("Required_If"))
        .and_then(|v| v.as_str())
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    // Type (✅ Verified)
    // user側で Type が指定されている場合は自動付与しない（userを優先）
    // AppSheet側の型推論の揺れを減らすため、Textも含めて明示する。
    if should_output_note_param("Type", user_settings) && !user_has("Type") {
        data.insert("Type".to_string(), Value::String(column.column_type.clone()));
    }

    // 基本フラグ
    // user側で IsKey/IsLabel/IsRequired が指定されている場合は自動付与しない（userを優先）
    if should_output_note_param("IsKey", user_settings) && !user_has("IsKey") && column.is_key {
        data.insert("IsKey".to_string(), Value::Bool(true));
    }
    // IsLabel は不安定なので現時点ではデフォルトでは出力しない（ユーザー設定で有効にできる）
    if should_output_note_param("IsLabel", user_settings) && !user_has("IsLabel") && column.is_label {
        data.insert("IsLabel".to_string(), Value::Bool(true));
    }
    // Required_If がある場合は IsRequired を出さない（docs/AppSheet/MEMO_SETUP.md の推奨）
    if should_output_note_param("IsRequired", user_settings) && !user_has("IsRequired") && !user_has("Required_If") && column.constraints.required == Some(true) {
        data.insert("IsRequired".to_string(), Value::Bool(true));
    }

    // 初期値 (✅ Verified)
    if should_output_note_param(NOTE_PARAM_DEFAULT_KEY, user_settings) && !user_has(NOTE_PARAM_DEFAULT_KEY) {
        if let Some(ref default_value) = column.constraints.default_value {
            if !default_value.is_empty() {
                data.insert(
                    NOTE_PARAM_DEFAULT_KEY.to_string(),
                    Value::String(default_value.clone()),
                );
            }
        }
    }

    // 説明 (🔍 Untested)
    if should_output_note_param("Description", user_settings) && !user_has("Description") {
        if let Some(ref desc) = column.description {
            if !desc.is_empty() {
                data.insert("Description".to_string(), Value::String(desc.clone()));
            }
        }
    }

    // Valid_If（正規表現） (🔍 Untested)
    if should_output_note_param("Valid_If", user_settings) && !user_has("Valid_If") {
        if let Some(ref pattern) = column.constraints.pattern {
            if !pattern.is_empty() {
                // AppSheetの式で [_THIS] を参照し、MATCHES を使う
                // 文字列リテラル内の " と \ はエスケープする
                let mut escaped = String::with_capacity(pattern.len());
                for ch in pattern.chars() {
                    match ch {
                        '\\' => escaped.push_str("\\\\"),
                        '"' => escaped.push_str("\\\""),
                        _ => escaped.push(ch),
                    }
                }
                let expr = format!("MATCHES([_THIS], \"{}\")", escaped);
                data.insert("Valid_If".to_string(), Value::String(expr));
            }
        }
    }

    // 数値型: Min/Max (🔍 Untested)
    if should_output_note_param("MinValue", user_settings) && !user_has("MinValue") {
        if let Some(min) = column.constraints.min_value {
            data.insert(
                "MinValue".to_string(),
                Value::Number(
                    serde_json::Number::from_f64(min)
                        .unwrap_or_else(|| serde_json::Number::from(0)),
                ),
            );
        }
    }
    if should_output_note_param("MaxValue", user_settings) && !user_has("MaxValue") {
        if let Some(max) = column.constraints.max_value {
            data.insert(
                "MaxValue".to_string(),
                Value::Number(
                    serde_json::Number::from_f64(max)
                        .unwrap_or_else(|| serde_json::Number::from(0)),
                ),
            );
        }
    }

    // Enum/EnumList: EnumValues + BaseType（選択肢がある場合のみ） (🔍 Untested)
    if column.column_type == "Enum" || column.column_type == "EnumList" {
        if should_output_note_param("EnumValues", user_settings) && !user_has("EnumValues") {
            if let Some(ref enum_values) = column.constraints.enum_values {
                if !enum_values.is_empty() {
                    data.insert(
                        "EnumValues".to_string(),
                        Value::Array(enum_values.iter().cloned().map(Value::String).collect()),
                    );
                    if should_output_note_param("BaseType", user_settings) && !user_has("BaseType") {
                        let max_len = enum_values.iter().map(|v| v.chars().count()).max().unwrap_or(0);
                        let base_type = if max_len > 20 { "LongText" } else { "Text" };
                        data.insert("BaseType".to_string(), Value::String(base_type.to_string()));
                    }
                }
            }
        }
    }

    // Ref: 参照先テーブル情報 (🔍 Untested)
    if column.column_type == "Ref" {
        if let Some(ref ref_table_id) = column.constraints.ref_table_id {
            if let Some(ref_table) = tables.iter().find(|t| t.id == *ref_table_id) {
                // Note Parameter Workshop のキー名に合わせて ReferencedTableName / ReferencedKeyColumn / ReferencedType を使う
                if should_output_note_param("ReferencedTableName", user_settings) && !user_has("ReferencedTableName") {
                    data.insert(
                        "ReferencedTableName".to_string(),
                        Value::String(ref_table.name.clone()),
                    );
                }

                // 参照キー列（指定があれば優先、なければ Key、それもなければ先頭）
                let ref_col = column
                    .constraints
                    .ref_column_id
                    .as_ref()
                    .and_then(|cid| ref_table.columns.iter().find(|c| c.id == *cid))
                    .or_else(|| ref_table.columns.iter().find(|c| c.is_key))
                    .or_else(|| ref_table.columns.first());

                if let Some(rc) = ref_col {
                    if should_output_note_param("ReferencedKeyColumn", user_settings) && !user_has("ReferencedKeyColumn") {
                        data.insert(
                            "ReferencedKeyColumn".to_string(),
                            Value::String(rc.name.clone()),
                        );
                    }
                    if should_output_note_param("ReferencedType", user_settings) && !user_has("ReferencedType") {
                        data.insert(
                            "ReferencedType".to_string(),
                            Value::String(rc.column_type.clone()),
                        );
                    }
                }
            }
        }
    }

    // 式系キーは TypeAuxData へ移動するため、should_output_note_param のチェックをバイパスする
    let formula_keys: std::collections::HashSet<&str> = ["Show_If", "Required_If", "Editable_If", "Reset_If"].iter().cloned().collect();

    // user指定を最後にマージ（上書き/追加）
    // ただし、ユーザー設定で無効化されたキーはフィルタリングする
    if let Some(user_map) = user {
        for (k, v) in user_map {
            let normalized_key: &str = if k == NOTE_PARAM_DEFAULT_KEY_LEGACY {
                NOTE_PARAM_DEFAULT_KEY
            } else {
                k
            };
            if normalized_key == "IsRequired" && user_required_if_non_empty {
                // Required_If takes precedence; do not output IsRequired even if explicitly set.
                continue;
            }
            if v.is_null() {
                data.remove(normalized_key);
            } else if formula_keys.contains(normalized_key) {
                // 式系キーは常にマージ（後で TypeAuxData に移動される）
                data.insert(normalized_key.to_string(), v.clone());
            } else if should_output_note_param(normalized_key, user_settings) {
                // ユーザー設定で有効なキーのみマージ
                data.insert(normalized_key.to_string(), v.clone());
            }
        }
    }

    // docs/AppSheet/MEMO_SETUP.md の推奨に合わせ、式キーは TypeAuxData（JSON文字列）へ入れる。
    normalize_formulas_into_type_aux_data(&mut data);

    let body = serialize_note_parameters_object(&data);
    if body == "{}" {
        return "AppSheet:{}".to_string();
    }
    format!("AppSheet:{}", body)
}

// Note Parameters は JSON と同様に bool を `true/false`（小文字）で出力する。
// AppSheet 側が `TRUE/FALSE`（大文字）を正しく認識しないケースがあるため、
// WaiwaiER Desktop の出力は `true/false` に統一する。
fn serialize_note_parameters_object(map: &serde_json::Map<String, Value>) -> String {
    if map.is_empty() {
        return "{}".to_string();
    }

    let mut parts: Vec<String> = Vec::with_capacity(map.len());
    for (k, v) in map {
        let key = serde_json::to_string(k).unwrap_or_else(|_| format!("\"{}\"", k));
        let value = serialize_note_parameters_value(v);
        parts.push(format!("{}:{}", key, value));
    }
    format!("{{{}}}", parts.join(","))
}

fn serialize_note_parameters_value(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(b) => {
            if *b { "true".to_string() } else { "false".to_string() }
        }
        Value::Number(n) => n.to_string(),
        Value::String(s) => serde_json::to_string(s).unwrap_or_else(|_| format!("\"{}\"", s)),
        Value::Array(arr) => {
            let items: Vec<String> = arr.iter().map(serialize_note_parameters_value).collect();
            format!("[{}]", items.join(","))
        }
        Value::Object(obj) => serialize_note_parameters_object(obj),
    }
}

// サンプル値を文字列に変換
fn json_value_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => String::new(),
        serde_json::Value::Bool(b) => if *b { "Yes".to_string() } else { "No".to_string() },
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Array(arr) => arr
            .iter()
            .map(|v| json_value_to_string(v))
            .collect::<Vec<_>>()
            .join(", "),
        serde_json::Value::Object(_) => "[Object]".to_string(),
    }
}

// Excelファイルを生成
pub fn export_to_excel(request: &ExportRequest, file_path: &str) -> Result<(), XlsxError> {
    let mut workbook = Workbook::new();
    
    // ヘッダー用のフォーマット
    let header_format = Format::new()
        .set_bold()
        .set_background_color(rust_xlsxwriter::Color::RGB(0xE5E7EB))
        .set_border(rust_xlsxwriter::FormatBorder::Thin);
    
    // データ用のフォーマット
    let data_format = Format::new()
        .set_border(rust_xlsxwriter::FormatBorder::Thin);
    
    for table in &request.tables {
        let effective_label_column_id = pick_effective_label_column_id(table);

        let worksheet = workbook.add_worksheet();
        worksheet.set_name(&table.name)?;
        
        // カラム幅を調整
        for (col_idx, column) in table.columns.iter().enumerate() {
            let width = std::cmp::max(column.name.len(), 12) as f64;
            worksheet.set_column_width(col_idx as u16, width)?;
        }
        
        // ヘッダー行を作成
        for (col_idx, column) in table.columns.iter().enumerate() {
            let col = col_idx as u16;
            
            // ヘッダーテキストを書き込み
            worksheet.write_string_with_format(0, col, &column.name, &header_format)?;
            
            // カラム設定をメモとして追加
            // 【重要】write_noteを使用（write_commentではなくGoogleスプレッドシート互換）
            let mut column_for_note = column.clone();
            column_for_note.is_label = effective_label_column_id
                .is_some_and(|id| id == column_for_note.id);

            let note_text = generate_column_note(&column_for_note, &request.tables, request.note_param_output_settings.as_ref());
            let has_override = has_user_note_override(&column_for_note);
            if !note_text.trim().is_empty() && (has_override || note_text != "AppSheet:{}") {
                // AppSheet は Note Parameters の先頭 `AppSheet:` をトリガーに解釈する。
                // rust_xlsxwriter の Note は既定で著者名プレフィックス（例: "Author:\n"）を付与するため、
                // 先頭一致が崩れて AppSheet に読まれないことがある。必ず無効化して `AppSheet:` を先頭に置く。
                let note = Note::new(&note_text).add_author_prefix(false);
                worksheet.insert_note(0, col, &note)?;
            }
        }
        
        // サンプルデータを追加
        if request.include_data {
            if let Some(rows) = request.sample_data.get(&table.id) {
                for (row_idx, row) in rows.iter().enumerate() {
                    let excel_row = (row_idx + 1) as u32; // ヘッダーの次から
                    
                    for (col_idx, column) in table.columns.iter().enumerate() {
                        let col = col_idx as u16;
                        
                        if let Some(value) = row.values.get(&column.id) {
                            let str_value = json_value_to_string(value);
                            worksheet.write_string_with_format(excel_row, col, &str_value, &data_format)?;
                        }
                    }
                }
            }
        }
    }
    
    workbook.save(file_path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_generate_column_note_verified_only() {
        // appSheet未設定の場合は、自動生成される Verified キーのみが出力される
        let column = Column {
            id: "col1".to_string(),
            name: "Name".to_string(),
            column_type: "Text".to_string(),
            is_key: true,
            is_label: true,
            description: Some("Test description".to_string()),
            app_sheet: None,
            constraints: ColumnConstraints {
                required: Some(true),
                unique: None,
                default_value: None,
                min_value: None,
                max_value: None,
                min_length: None,
                max_length: None,
                pattern: None,
                enum_values: None,
                ref_table_id: None,
                ref_column_id: None,
            },
            order: 0,
        };
        
        let note = generate_column_note(&column, &[], None);
        assert!(note.starts_with("AppSheet:"));
        // Type は Verified なので出力される
        assert!(note.contains("\"Type\":\"Text\""));
        // IsKey は Verified なので出力される
        assert!(note.contains("\"IsKey\":true"));
        // IsLabel, IsRequired, Description はデフォルトでは出力されない
        assert!(!note.contains("\"IsLabel\""));
        assert!(!note.contains("\"IsRequired\""));
        assert!(!note.contains("\"Description\""));
    }

    #[test]
    fn test_generate_column_note_raw_override() {
        let mut app_sheet = serde_json::Map::<String, Value>::new();
        app_sheet.insert(
            RAW_NOTE_OVERRIDE_KEY.to_string(),
            Value::String("AppSheet:{\"Type\":\"Text\"}".to_string()),
        );

        let column = Column {
            id: "col1".to_string(),
            name: "Name".to_string(),
            column_type: "Text".to_string(),
            is_key: true,
            is_label: true,
            description: Some("Test description".to_string()),
            app_sheet: Some(app_sheet),
            constraints: ColumnConstraints {
                required: Some(true),
                unique: None,
                default_value: None,
                min_value: None,
                max_value: None,
                min_length: None,
                max_length: None,
                pattern: None,
                enum_values: None,
                ref_table_id: None,
                ref_column_id: None,
            },
            order: 0,
        };

        let note = generate_column_note(&column, &[], None);
        assert_eq!(note, "AppSheet:{\"Type\":\"Text\"}");
    }

    #[test]
    fn test_generate_column_note_export_whitelisted_user_keys() {
        // userが明示的に設定しても、未対応キーは出力しない（誤解を防ぐ）
        let mut app_sheet = serde_json::Map::<String, Value>::new();
        app_sheet.insert("IsScannable".to_string(), Value::Bool(true));
        app_sheet.insert("IsNfcScannable".to_string(), Value::Bool(true));
        app_sheet.insert("Searchable".to_string(), Value::Bool(false));
        app_sheet.insert("IsSensitive".to_string(), Value::Bool(true));

        let column = Column {
            id: "col1".to_string(),
            name: "Name".to_string(),
            column_type: "Text".to_string(),
            is_key: false,
            is_label: false,
            description: None,
            app_sheet: Some(app_sheet),
            constraints: ColumnConstraints {
                required: None,
                unique: None,
                default_value: None,
                min_value: None,
                max_value: None,
                min_length: None,
                max_length: None,
                pattern: None,
                enum_values: None,
                ref_table_id: None,
                ref_column_id: None,
            },
            order: 0,
        };

        let note = generate_column_note(&column, &[], None);
        assert!(note.contains("\"Type\":\"Text\""));
        assert!(!note.contains("\"IsScannable\":true"));
        assert!(!note.contains("\"IsNfcScannable\":true"));
        assert!(!note.contains("\"Searchable\":false"));
        assert!(!note.contains("\"IsSensitive\":true"));
    }

    #[test]
    fn test_generate_column_note_with_user_settings() {
        // Default のキー名は `Default`（大文字小文字を区別）。
        // 旧実装の誤り `DEFAULT` が user/app_sheet/settings に残っていても、出力は `Default` に正規化する。
        let column = Column {
            id: "col1".to_string(),
            name: "Name".to_string(),
            column_type: "Text".to_string(),
            is_key: false,
            is_label: false,
            description: None,
            app_sheet: None,
            constraints: ColumnConstraints {
                required: None,
                unique: None,
                default_value: Some("ABC".to_string()),
                min_value: None,
                max_value: None,
                min_length: None,
                max_length: None,
                pattern: None,
                enum_values: None,
                ref_table_id: None,
                ref_column_id: None,
            },
            order: 0,
        };

        // ユーザー設定で Default を有効に
        let mut user_settings = HashMap::new();
        user_settings.insert("Type".to_string(), true);
        user_settings.insert(NOTE_PARAM_DEFAULT_KEY.to_string(), true);
        let note = generate_column_note(&column, &[], Some(&user_settings));
        assert!(note.contains("\"Default\":\"ABC\""));
        assert!(!note.contains("\"DEFAULT\""));

        // 旧キー名 `DEFAULT` を設定していても、出力は `Default`
        let mut legacy_settings = HashMap::new();
        legacy_settings.insert("Type".to_string(), true);
        legacy_settings.insert(NOTE_PARAM_DEFAULT_KEY_LEGACY.to_string(), true);
        let note_legacy = generate_column_note(&column, &[], Some(&legacy_settings));
        assert!(note_legacy.contains("\"Default\":\"ABC\""));
        assert!(!note_legacy.contains("\"DEFAULT\""));
    }

    #[test]
    fn test_note_param_status() {
        // Type は Verified
        assert_eq!(get_note_param_status("Type"), NoteParamStatus::Verified);
        // IsLabel は Unstable
        assert_eq!(get_note_param_status("IsLabel"), NoteParamStatus::Unsupported);
        // 未知のキーは Untested
        assert_eq!(get_note_param_status("UnknownKey"), NoteParamStatus::Untested);
    }

    #[test]
    fn test_should_output_note_param() {
        // Verified は true (デフォルト設定の場合)
        assert!(should_output_note_param("Type", None));
        // Unstable は false (デフォルト設定の場合)
        assert!(!should_output_note_param("IsLabel", None));
        // Unsupported は false
        assert!(!should_output_note_param("IsScannable", None));
        // Verified は true
        assert!(should_output_note_param("IsKey", None));

        // ユーザー設定で有効にした場合
        let mut user_settings = HashMap::new();
        user_settings.insert("IsKey".to_string(), true);
        assert!(should_output_note_param("IsKey", Some(&user_settings)));

        // ユーザー設定で無効にした場合（Verifiedでも無効化できる）
        user_settings.insert("Type".to_string(), false);
        assert!(!should_output_note_param("Type", Some(&user_settings)));
    }
}
