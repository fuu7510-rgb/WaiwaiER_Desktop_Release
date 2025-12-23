---
title: "How to handle Double Quotes - Note Parameter Workshop"
source:
author:
  - "[[MultiTech_Visions]]"
status: "unread"
published: 2024-02-26
created: 2025-10-17
description: "When working with Note Parameters, and any JSON really, it’s vital that you escape any nested double quotes in order to prevent errors.For Example:{\"Key_Name\": \"My Key Value, which includes \\"double quotes\\" inside it…"
tags:
  - "WebClip"
memo:
updated:
---
## How to handle Double Quotes

[Note Parameter Workshop](https://community.appsheet-insider.com/c/note-parameter-workshop/14)

[![](https://yyz1.discourse-cdn.com/flex003/user_avatar/community.appsheet-insider.com/multitech_visions/48/2_2.png)](https://community.appsheet-insider.com/u/multitech_visions)

[MultiTech\_Visions](https://community.appsheet-insider.com/u/multitech_visions)

[Feb 2024](https://community.appsheet-insider.com/t/how-to-handle-double-quotes/25 "Post date")

## When working with Note Parameters, and any JSON really, it’s vital that you escape any nested double quotes in order to prevent errors.

### For Example:

- `{"Key_Name": "My Key Value, which includes \"double quotes\" inside it"}`

---

## How To Escape A Nested Double Quote

You can escape a nested double quotes by including a number of backslashes (ie. `\`) before the double quote, the number depending on the number of layers.

## First Layer

- No escaping *(these would be the quotes encapsulating the key names and the value space in the JSON object)*
	- `{"Key_Name": "My value here"}`
	- *Notice there’s no backslashes for the outer double quotes, and NO inner quotes*

## Second Layer

- One backslash
	- `{"Key_Name": "My value entry here, that includes some \"escaped double quotes\" for example."}`
	- *Notice that the inner quotes have a single backslash*

## Third Layer

- Three backslashes
	- `{"Key_Name": "{ \"Sub_Key_Name\": \"My value entry here, that includes some \\\"escaped double quotes\\\" for example.\" }"}`
	- *Note that there’s an object inside the object, and pay particular attention to the placement of the backslashes.*
	- *Notice that the inner-inner quotes have 3 backslashes, and the inner have 1.*

## Additional Layers

- +2 backslashes for each additional layer.

---

## Why do we need to do this?

If we enter a double quote (ie. "…) then the very next double quote the system comes across will be used to “Close” the one you just opened. You can literally think about it like the first one “Opens” the quote, and the second one “closes” the quote block.

- By including a backslash (ie. `\`) we’re telling the system to NOT use that as the close, and instead include an actual " character as text.

---

## Learn More

To learn more about JSON and how it’s structured, how it works, etc., you can visit the following site: [JSON](https://www.json.org/json-en.html)