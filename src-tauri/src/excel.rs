use rust_xlsxwriter::{Format, Note, Workbook, XlsxError};
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
}

// Note Parametersのサポート状況
// docs/AppSheet/NOTE_PARAMETERS_SUPPORT_STATUS.md に検証結果を記録する
//
// ステータス:
// - Verified: AppSheetで正しく認識されることを確認済み
// - Unstable: 環境によって動作したりしなかったりする
// - Untested: まだテストしていない
#[derive(Debug, Clone, Copy, PartialEq)]
enum NoteParamStatus {
    Verified,  // ✅ 確認済み
    Unstable,  // ⚠️ 不安定
    Untested,  // 🔍 未検証
}

// 各Note Parameterキーのサポート状況を返す
// NOTE: 検証結果が得られたらここを更新し、NOTE_PARAMETERS_SUPPORT_STATUS.md にも記録する
fn get_note_param_status(key: &str) -> NoteParamStatus {
    match key {
        // 基本設定
        "Type" => NoteParamStatus::Verified,
        "IsRequired" => NoteParamStatus::Untested,
        "Required_If" => NoteParamStatus::Untested,
        "IsHidden" => NoteParamStatus::Untested,
        "Show_If" => NoteParamStatus::Untested,
        "DisplayName" => NoteParamStatus::Untested,
        "Description" => NoteParamStatus::Untested,
        "DEFAULT" => NoteParamStatus::Untested,
        "AppFormula" => NoteParamStatus::Untested,
        
        // 識別・検索設定
        "IsKey" => NoteParamStatus::Untested,
        "IsLabel" => NoteParamStatus::Unstable, // 環境によって反映されないケースあり
        "IsScannable" => NoteParamStatus::Untested,
        "IsNfcScannable" => NoteParamStatus::Untested,
        "Searchable" => NoteParamStatus::Untested,
        "IsSensitive" => NoteParamStatus::Untested,
        
        // バリデーション設定
        "Valid_If" => NoteParamStatus::Untested,
        "Error_Message_If_Invalid" => NoteParamStatus::Untested,
        "Suggested_Values" => NoteParamStatus::Untested,
        "Editable_If" => NoteParamStatus::Untested,
        "Reset_If" => NoteParamStatus::Untested,
        
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

// 指定されたキーを出力すべきかどうかを判定
// 現時点では Verified のみ出力する
fn should_output_note_param(key: &str) -> bool {
    matches!(get_note_param_status(key), NoteParamStatus::Verified)
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

// カラム設定のメモ内容を生成
fn generate_column_note(column: &Column, tables: &[Table]) -> String {
    // docs/AppSheet/MEMO_SETUP.md に従い、AppSheet Note Parameters の形式で出力する
    // 例: AppSheet:{"Type":"Ref","IsRequired":true,"ReferencedTableName":"顧客"}
    //
    // NOTE: should_output_note_param() で Verified と判定されたキーのみ出力する
    // 検証が進んだら get_note_param_status() を更新すること
    
    let mut data = serde_json::Map::<String, Value>::new();
    let user = column.app_sheet.as_ref();

    let user_has = |k: &str| -> bool { user.map(|m| m.contains_key(k)).unwrap_or(false) };

    // Type (✅ Verified)
    // user側で Type が指定されている場合は自動付与しない（userを優先）
    // AppSheet側の型推論の揺れを減らすため、Textも含めて明示する。
    if should_output_note_param("Type") && !user_has("Type") {
        data.insert("Type".to_string(), Value::String(column.column_type.clone()));
    }

    // 基本フラグ
    // user側で IsKey/IsLabel/IsRequired が指定されている場合は自動付与しない（userを優先）
    if should_output_note_param("IsKey") && !user_has("IsKey") && column.is_key {
        data.insert("IsKey".to_string(), Value::Bool(true));
    }
    // IsLabel は不安定なので現時点では出力しない（should_output_note_param が false を返す）
    if should_output_note_param("IsLabel") && !user_has("IsLabel") && column.is_label {
        data.insert("IsLabel".to_string(), Value::Bool(true));
    }
    // Required_If がある場合は IsRequired を出さない（docs/AppSheet/MEMO_SETUP.md の推奨）
    if should_output_note_param("IsRequired") && !user_has("IsRequired") && !user_has("Required_If") && column.constraints.required == Some(true) {
        data.insert("IsRequired".to_string(), Value::Bool(true));
    }

    // 初期値 (🔍 Untested)
    if should_output_note_param("DEFAULT") && !user_has("DEFAULT") {
        if let Some(ref default_value) = column.constraints.default_value {
            if !default_value.is_empty() {
                data.insert("DEFAULT".to_string(), Value::String(default_value.clone()));
            }
        }
    }

    // 説明 (🔍 Untested)
    if should_output_note_param("Description") && !user_has("Description") {
        if let Some(ref desc) = column.description {
            if !desc.is_empty() {
                data.insert("Description".to_string(), Value::String(desc.clone()));
            }
        }
    }

    // Valid_If（正規表現） (🔍 Untested)
    if should_output_note_param("Valid_If") && !user_has("Valid_If") {
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
    if should_output_note_param("MinValue") && !user_has("MinValue") {
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
    if should_output_note_param("MaxValue") && !user_has("MaxValue") {
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
        if should_output_note_param("EnumValues") && !user_has("EnumValues") {
            if let Some(ref enum_values) = column.constraints.enum_values {
                if !enum_values.is_empty() {
                    data.insert(
                        "EnumValues".to_string(),
                        Value::Array(enum_values.iter().cloned().map(Value::String).collect()),
                    );
                    if should_output_note_param("BaseType") && !user_has("BaseType") {
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
                if should_output_note_param("ReferencedTableName") && !user_has("ReferencedTableName") {
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
                    if should_output_note_param("ReferencedKeyColumn") && !user_has("ReferencedKeyColumn") {
                        data.insert(
                            "ReferencedKeyColumn".to_string(),
                            Value::String(rc.name.clone()),
                        );
                    }
                    if should_output_note_param("ReferencedType") && !user_has("ReferencedType") {
                        data.insert(
                            "ReferencedType".to_string(),
                            Value::String(rc.column_type.clone()),
                        );
                    }
                }
            }
        }
    }

    // user指定を最後にマージ（上書き/追加）
    // ただし、Verified でないキーはフィルタリングする（ユーザーが明示的に指定した場合も除外）
    if let Some(user_map) = user {
        for (k, v) in user_map {
            if v.is_null() {
                data.remove(k);
            } else if should_output_note_param(k) {
                // Verified のキーのみマージ
                data.insert(k.clone(), v.clone());
            }
            // Untested/Unstable のキーはユーザー指定でもスキップ（現時点では）
        }
    }

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

            let note_text = generate_column_note(&column_for_note, &request.tables);
            if note_text != "AppSheet:{}" {
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
        // 現時点では Type のみが Verified なので、他のキーは出力されない
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
        
        let note = generate_column_note(&column, &[]);
        assert!(note.starts_with("AppSheet:"));
        // Type は Verified なので出力される
        assert!(note.contains("\"Type\":\"Text\""));
        // IsKey, IsLabel, IsRequired, Description は Untested なので出力されない
        assert!(!note.contains("\"IsKey\""));
        assert!(!note.contains("\"IsLabel\""));
        assert!(!note.contains("\"IsRequired\""));
        assert!(!note.contains("\"Description\""));
    }

    #[test]
    fn test_note_param_status() {
        // Type は Verified
        assert_eq!(get_note_param_status("Type"), NoteParamStatus::Verified);
        // IsLabel は Unstable
        assert_eq!(get_note_param_status("IsLabel"), NoteParamStatus::Unstable);
        // 未知のキーは Untested
        assert_eq!(get_note_param_status("UnknownKey"), NoteParamStatus::Untested);
    }

    #[test]
    fn test_should_output_note_param() {
        // Verified のみ true
        assert!(should_output_note_param("Type"));
        // Unstable は false
        assert!(!should_output_note_param("IsLabel"));
        // Untested は false
        assert!(!should_output_note_param("IsKey"));
    }
}
