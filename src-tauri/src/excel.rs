use rust_xlsxwriter::{Format, Note, Workbook, Worksheet, XlsxError};
use serde::{Deserialize, Serialize};

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
    let mut lines = Vec::new();
    
    // 基本情報
    lines.push(format!("TYPE: {}", column.column_type));
    
    if column.is_key {
        lines.push("KEY: Yes".to_string());
    }
    if column.is_label {
        lines.push("LABEL: Yes".to_string());
    }
    
    // 制約情報
    if column.constraints.required == Some(true) {
        lines.push("REQUIRED: Yes".to_string());
    }
    if column.constraints.unique == Some(true) {
        lines.push("UNIQUE: Yes".to_string());
    }
    if let Some(ref default_value) = column.constraints.default_value {
        lines.push(format!("INITIAL: {}", default_value));
    }
    if let Some(min) = column.constraints.min_value {
        lines.push(format!("MIN: {}", min));
    }
    if let Some(max) = column.constraints.max_value {
        lines.push(format!("MAX: {}", max));
    }
    if let Some(ref pattern) = column.constraints.pattern {
        lines.push(format!("VALID_IF: MATCHES([], \"{}\")", pattern));
    }
    if let Some(ref enum_values) = column.constraints.enum_values {
        lines.push(format!("VALID_IF: IN([], {{\"{}\"}})", enum_values.join("\", \"")));
    }
    
    // Ref型の場合の参照先
    if column.column_type == "Ref" {
        if let Some(ref ref_table_id) = column.constraints.ref_table_id {
            // テーブル名を探す
            if let Some(ref_table) = tables.iter().find(|t| t.id == *ref_table_id) {
                lines.push(format!("REF: {}", ref_table.name));
            }
        }
    }
    
    // 説明
    if let Some(ref desc) = column.description {
        if !desc.is_empty() {
            lines.push(format!("DESCRIPTION: {}", desc));
        }
    }
    
    lines.join("\n")
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
            let note = Note::new(&note_text);
            worksheet.insert_note(0, col, &note)?;
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
        assert!(note.contains("TYPE: Text"));
        assert!(note.contains("KEY: Yes"));
        assert!(note.contains("LABEL: Yes"));
        assert!(note.contains("REQUIRED: Yes"));
    }
}
