---
title: "Guide: Using Note Parameters with SQL Data Sources in AppSheet - Note Parameter Workshop"
source:
author:
  - "[[MultiTech_Visions]]"
status: unread
published: 2024-11-13
created: 2025-10-17
description: "While Note Parameters currently only work with Google Sheets or Excel tables in AppSheet, there’s a straightforward way to still benefit from them even if your final data source is SQL. Here’s how: Create a Google Shee…"
tags:
  - WebClip
memo:
updated: 2025-11-06T10:38
---
## Guide: Using Note Parameters with SQL Data Sources in AppSheet

[Note Parameter Workshop](https://community.appsheet-insider.com/c/note-parameter-workshop/14)

[![](https://yyz1.discourse-cdn.com/flex003/user_avatar/community.appsheet-insider.com/multitech_visions/48/2_2.png)](https://community.appsheet-insider.com/u/multitech_visions)

[MultiTech\_Visions](https://community.appsheet-insider.com/u/multitech_visions)

[Nov 2024](https://community.appsheet-insider.com/t/guide-using-note-parameters-with-sql-data-sources-in-appsheet/159 "Post date")

While Note Parameters currently only work with Google Sheets or Excel tables in AppSheet, there’s a straightforward way to still benefit from them even if your final data source is SQL. Here’s how:

1. **Create a Google Sheet and Define Columns Using Note Parameters**
2. **Set Up the Table in AppSheet Using the Google Sheet**
3. **Use AppSheet’s Built-In Feature to Copy the Table to SQL**
4. **Switch Your Table’s Data Source to SQL**

## Detailed Steps

#### Step 1: Create Your Google Sheet Table with Note Parameters

Start by creating a new Google Sheet where you’ll define your table columns. Add Note Parameters to the headers of each column to set up attributes like `IsRequired`, `DisplayName`, `Type`, etc.

For example, in the first row of each column, you might add parameters like:

```json
AppSheet: {
  "IsRequired": true,
  "Type": "Text",
  "DEFAULT": "uniqueid()",
  "DisplayName": "Customer ID"
}
```

> **Pro Tip:** Add as many parameters as needed to fully define the behavior and appearance of each column in your app.

#### Step 2: Add the Google Sheet Table to Your App

In AppSheet, go to your app’s Data section, select **Add a table**, and choose the Google Sheet you just created. AppSheet will read the Note Parameters you added and configure the columns according to your specifications.

By doing this, you ensure that your table is set up in the app exactly as you want before moving it to SQL.

#### Step 3: Copy the Table to SQL Using AppSheet’s Built-In Feature

Once your table is set up and working with Note Parameters, you can transfer it to SQL.

Here’s how:

- Go to the Data section in AppSheet, find your table, and click on the **Table Settings** icon (see the images you provided for reference).
- Scroll down to find the **Copy Data to New Source** button. This option allows you to create a new table in SQL with the same columns and settings as your Google Sheet table.
	> **Note:** Make sure your SQL server is connected as a data source in AppSheet. AppSheet will automatically create a new table, set up the columns with the correct data types (e.g., dates, numbers, text), and copy over your records.
- Click on **Copy Data to New Source**. Select your SQL server from the dropdown list and confirm the copy.

#### Step 4: Switch the Table’s Data Source to SQL

Once the table has been successfully created in SQL:

- Go back to **Table Settings**.
- Change the **Data Source** for your table to point to the new SQL source.

AppSheet will seamlessly transition the data source without breaking any connections, as the column names and data types remain the same.

---

## Troubleshooting Tips

- **Data Type Conflicts:** If AppSheet encounters issues with a specific record due to data type conflicts, the copying process may stop. However, the SQL table and any successfully copied records will remain intact. Review the problematic data and retry if necessary.
- **Verification:** After switching the data source, verify that all settings work as expected in the app, especially any validations or formulas tied to specific columns.

## Why This Works

This approach leverages the initial flexibility of Google Sheets and Note Parameters, letting you fully configure your columns before committing to SQL. By defining everything in the Google Sheet first, you simplify the setup process and avoid manually configuring each column in SQL.