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

// カラム設定のメモ内容を生成
fn generate_column_note(column: &Column, tables: &[Table]) -> String {
    // docs/AppSheet/MEMO_SETUP.md に従い、AppSheet Note Parameters の形式で出力する
    // 例: AppSheet:{"Type":"Ref","IsRequired":true,"ReferencedTableName":"顧客"}
    let mut data = serde_json::Map::<String, Value>::new();
    let user = column.app_sheet.as_ref();

    let user_has = |k: &str| -> bool { user.map(|m| m.contains_key(k)).unwrap_or(false) };

    // Type
    // user側で Type が指定されている場合は自動付与しない（userを優先）
    // AppSheet側の型推論の揺れを減らすため、Textも含めて明示する。
    if !user_has("Type") {
        data.insert("Type".to_string(), Value::String(column.column_type.clone()));
    }

    // 基本フラグ
    // user側で IsKey/IsLabel/IsRequired が指定されている場合は自動付与しない（userを優先）
    if !user_has("IsKey") && column.is_key {
        data.insert("IsKey".to_string(), Value::Bool(true));
    }
    if !user_has("IsLabel") && column.is_label {
        data.insert("IsLabel".to_string(), Value::Bool(true));
    }
    // Required_If がある場合は IsRequired を出さない（docs/AppSheet/MEMO_SETUP.md の推奨）
    if !user_has("IsRequired") && !user_has("Required_If") && column.constraints.required == Some(true) {
        data.insert("IsRequired".to_string(), Value::Bool(true));
    }

    // 初期値
    if !user_has("DEFAULT") {
        if let Some(ref default_value) = column.constraints.default_value {
            if !default_value.is_empty() {
                data.insert("DEFAULT".to_string(), Value::String(default_value.clone()));
            }
        }
    }

    // 説明
    if !user_has("Description") {
        if let Some(ref desc) = column.description {
            if !desc.is_empty() {
                data.insert("Description".to_string(), Value::String(desc.clone()));
            }
        }
    }

    // Valid_If（正規表現）
    if !user_has("Valid_If") {
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

    // 数値型: Min/Max
    if !user_has("MinValue") {
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
    if !user_has("MaxValue") {
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

    // Enum/EnumList: EnumValues + BaseType（選択肢がある場合のみ）
    if column.column_type == "Enum" || column.column_type == "EnumList" {
        if !user_has("EnumValues") {
            if let Some(ref enum_values) = column.constraints.enum_values {
                if !enum_values.is_empty() {
                    data.insert(
                        "EnumValues".to_string(),
                        Value::Array(enum_values.iter().cloned().map(Value::String).collect()),
                    );
                    if !user_has("BaseType") {
                        let max_len = enum_values.iter().map(|v| v.chars().count()).max().unwrap_or(0);
                        let base_type = if max_len > 20 { "LongText" } else { "Text" };
                        data.insert("BaseType".to_string(), Value::String(base_type.to_string()));
                    }
                }
            }
        }
    }

    // Ref: 参照先テーブル情報
    if column.column_type == "Ref" {
        if !user_has("ReferencedTableName") || !user_has("ReferencedKeyColumn") || !user_has("ReferencedType") {
            if let Some(ref ref_table_id) = column.constraints.ref_table_id {
                if let Some(ref_table) = tables.iter().find(|t| t.id == *ref_table_id) {
                    // Note Parameter Workshop のキー名に合わせて ReferencedTableName / ReferencedKeyColumn / ReferencedType を使う
                    if !user_has("ReferencedTableName") {
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
                        if !user_has("ReferencedKeyColumn") {
                            data.insert(
                                "ReferencedKeyColumn".to_string(),
                                Value::String(rc.name.clone()),
                            );
                        }
                        if !user_has("ReferencedType") {
                            data.insert(
                                "ReferencedType".to_string(),
                                Value::String(rc.column_type.clone()),
                            );
                        }
                    }
                }
            }
        }
    }

    // user指定を最後にマージ（上書き/追加）
    if let Some(user_map) = user {
        for (k, v) in user_map {
            if v.is_null() {
                data.remove(k);
            } else {
                data.insert(k.clone(), v.clone());
            }
        }
    }

    let json_string = serde_json::to_string(&Value::Object(data)).unwrap_or_else(|_| "{}".to_string());
    if json_string == "{}" {
        return "AppSheet:{}".to_string();
    }
    format!("AppSheet:{}", json_string)
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
            let note_text = generate_column_note(column, &request.tables);
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
    fn test_generate_column_note() {
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
        assert!(note.contains("\"IsKey\":true"));
        assert!(note.contains("\"IsLabel\":true"));
        assert!(note.contains("\"IsRequired\":true"));
        assert!(note.contains("\"Description\":\"Test description\""));
    }
}
