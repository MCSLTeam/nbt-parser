# NBT-Parser

Minecraft NBT (NamedBinary Tags) parser for Node.js

## Supports
* Java & Bedrock(Not tested) edition
* Parsing NBT / **SNBT** / JSON
* Dumping NBT / SNBT / JSON
* **SNBT Numbers**: `1.1e-2f`, `0b1ub`
* **SNBT Operations**: `bool(1)`, `uuid(00000000-0000-0000-0000-000000000000)`

## WIP

* String escape `\N{Name}`

## Installation
```
npm install nbt-parser
```

## Usage

```typescript
// Import
import { ... } from "nbt-parser";

// Parsing NBT
const tag: Tag = deserializeJsonToTag({key: "value"});
const tag: Tag = deserializeNBTToTag(new Uint8Array([...]), "java");
const tag: Tag = deserializeSNBTToTag("{key:value}");

const payload: AbstractPayload<any> = deserializeJsonToPayload("value");
const payload: AbstractPayload<any> = deserializeNBTToPayload(new Uint8Array([...]), "java");
const payload: AbstractPayload<any> = deserializeSNBTToPayload("true");

// Creating tags and payloads
const payload = new IntPayload(123);
const tag = new Tag("name", payload);
const rootTag = new Tag("", new CompoundPayload([tag]), true); // root tag must be compound with empty name

// Using Tags and Payloads
const tagName: String = tag.name;
const payload: AbstractPayload<any> = tag.payload;
const isRootTag: Boolean = tag.root;
tag.toJSON();
tag.toNBT("gzip", "java");
tag.toSNBT("formatted");

payload.toJSON();
payload.toNBT("gzip", "java");
payload.toSNBT("formatted");
```

## highlight.js
For SNBT highlighting, see [highlightjs-snbt](https://www.npmjs.com/package/highlightjs-snbt)