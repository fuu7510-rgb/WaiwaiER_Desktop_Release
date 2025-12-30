---
title: Key Names For Column Settings - Note Parameter Workshop
source:
author:
  - "[[MultiTech_Visions]]"
status: unread
published: 2024-02-26
created: 2025-10-17
description: KeysThe various column settings are called different things when using Note Parameters.  The following table contains a breakdown of the name of the column element in the AppSheet editor, and it’s corresponding key name…
tags:
  - WebClip
memo:
updated: 2025-10-17T09:03
---
## Key Names For Column Settings

[Note Parameter Workshop](https://community.appsheet-insider.com/c/note-parameter-workshop/14)

[![](https://yyz1.discourse-cdn.com/flex003/user_avatar/community.appsheet-insider.com/multitech_visions/48/2_2.png)](https://community.appsheet-insider.com/u/multitech_visions)

[MultiTech\_Visions](https://community.appsheet-insider.com/u/multitech_visions)

[Feb 2024](https://community.appsheet-insider.com/t/key-names-for-column-settings/26 "Post date")

## Keys

The various column settings are called different things when using Note Parameters. The following table contains a breakdown of the name of the column element in the AppSheet editor, and it’s corresponding key name in Note Parameters.

| Note Parameter Key | AppSheet Name | Data Type | Notes |
| --- | --- | --- | --- |
| Type | Column Type | String | Exact copy from the value in the drop down when selecting the column type in the editor |
| IsHidden | Show? (toggle) | true/false | Exclude if using a formula |
| Show\_If | Show? (formula) | String | Only include if you’re using a formula. |
| IsRequired | Require? (toggle) | true/false | Exclude if using a formula |
| Required\_If | Required? (formula) | String | Only include if you’re using a formula. |
| AppFormula | App formula | String |  |
| DEFAULT | Initial value | String |  |
| DisplayName | Display name | String |  |
| Description | Description | String |  |
| IsLabel | Label | true/false |  |
| IsKey | Key | true/false |  |
| IsScannable | Scannable | true/false |  |
| IsNfcScannable | NFC Scannable | true/false |  |
| Searchable | Searchable | true/false |  |
| IsSensitive | Sensitive data | true/false |  |
| Valid\_If | Valid If | String |  |
| Error\_Message\_If\_Invalid | Invalid value error | String |  |
| Suggested\_Values | Suggested values | String |  |
| Editable\_If | Editable? (formula) | String | Only include if you’re using a formula. |
| Reset\_If | Reset on edit? | String |  |
| LongTextFormatting | Formatting | Enum string | Options: Plain Text, Markdown, HTML |
| ItemSeparator | Item separator | String |  |
| EnumValues | Values | Array | Each option encapsulated with double quotes |
| AllowOtherValues | Allow other values | true/false |  |
| AutoCompleteOtherValues | Auto-complete other values | true/false |  |
| BaseType | Base type | String | Exact copy from the value in the drop down when selecting the column type in the editor |
| ReferencedRootTableName | Referenced table name | String | ***Only used for enum/enumlist base type reference***; Exact copy of the table name |
| EnumInputMode | Input mode | Enum string | Options: Auto, Buttons, Stack, Dropdown |
| ReferencedTableName | Referenced table name | String | ***Only used for REF column types***; Exact copy of the table name |
| ReferencedKeyColumn | n/a | String | Name of the key column from the referenced table |
| ReferencedType | n/a | String | Type of the key column from the referenced table |
| IsAPartOf | Is a part of? | true/false |  |
| InputMode | Input mode | Enum string | Options: Auto, Buttons, Dropdown |
| NumericDigits | Numeric digits | Integer |  |
| ShowThousandsSeparator | Show thousands separator | true/false |  |
| NumberDisplayMode | Display mode | Enum string | Options: Auto, Standard, Range, Label |
| MaxValue | Maximum value | Integer/Decimal |  |
| MinValue | Minimum value | Integer/Decimal |  |
| StepValue | Increase/decrease step | Integer/Decimal |  |
| DecimalDigits | Decimal digits | Integer |  |
| UpdateMode | Update Mode | Enum string | Options: Accumulate, Reset |
| ChangeColumns | Columns | Array of strings |  |
| ChangeValues | Values | Array of strings |  |

## Meta Object Keys

There are a few keys used inside Note Parameters that do not correspond to any element inside the AppSheet editor; they are here to help make the JSON code work.

- TypeAuxData
- BaseTypeQualifier

When you include these, all double quotes nested inside the object must be escaped.