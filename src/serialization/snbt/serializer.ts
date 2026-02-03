import {Tag, TagId} from "../../nbt/Tag";
import {NBTError, SNBTCompression} from "../../types";
import {AbstractPayload, CompoundPayload} from "../../nbt/Payload";
import {escapeString} from "./utils";

export function serializeTagToSNBT(tag: Tag, compression: SNBTCompression = "formatted"): string {
    if (tag.root) return serializePayloadToSNBT(tag.payload, compression);
    return serializePayloadToSNBT(new CompoundPayload([tag]), compression);
}

function serializeTagToUnwrappedSNBT(tag: Tag, compression: SNBTCompression) {
    const space = compression == "compressed" ? "" : " ";
    const name = canUseUnquotedString(tag.name) ? tag.name : serializeString(tag.name);
    return `${name}:${space}${serializePayloadToSNBT(tag.payload, compression)}`;
}

export function serializePayloadToSNBT(payload: AbstractPayload<any>, compression: SNBTCompression = "formatted"): string {
    switch (payload.tagId) {
        case TagId.BYTE:
            return `${payload.value}b`;
        case TagId.SHORT:
            return `${payload.value}s`;
        case TagId.INT:
            return `${payload.value}`;
        case TagId.LONG:
            return `${payload.value}l`;
        case TagId.FLOAT:
            return `${payload.value}f`;
        case TagId.DOUBLE:
            return `${payload.value}d`;
        case TagId.BYTE_ARRAY:
            return serializeListPayloadToSNBT(payload, compression, "B;");
        case TagId.STRING:
            return serializeString(payload.value);
        case TagId.LIST:
            return serializeListPayloadToSNBT(payload, compression, "");
        case TagId.COMPOUND:
            return serializeCompoundPayloadToSNBT(payload, compression);
        case TagId.INT_ARRAY:
            return serializeListPayloadToSNBT(payload, compression, "I;");
        case TagId.LONG_ARRAY:
            return serializeListPayloadToSNBT(payload, compression, "L;");
        default:
            throw new NBTError(`Unknown tag id: ${payload.tagId}`);
    }
}

function canUseUnquotedString(string: string) {
    return /^[a-zA-Z_.][a-zA-Z_.\d+-]*$/.test(string);
}

function serializeString(string: string) {
    let quote: "\"" | "'" = "'";
    if (string.includes("'")) quote = "\"";
    return `${quote}${escapeString(string, quote)}${quote}`;
}

function serializeCompoundPayloadToSNBT(payload: AbstractPayload<any>, compression: SNBTCompression): string {
    switch (compression) {
        case "multiline": {
            const formatted = serializeCompoundPayloadToSNBT(payload, "formatted");
            if (formatted.length < 30) return formatted;
            return `{\n    ${payload.value.map((tag: Tag) => serializeTagToUnwrappedSNBT(tag, compression)).join(",\n").replaceAll("\n", "\n    ")}\n}`;
        }
        case "formatted":
            return `{ ${payload.value.map((tag: Tag) => serializeTagToUnwrappedSNBT(tag, compression)).join(", ")} }`;
        case "compressed":
            return `{${payload.value.map((tag: Tag) => serializeTagToUnwrappedSNBT(tag, compression)).join(",")}}`;
        default:
            throw new NBTError(`Unknown compression: ${compression}`);
    }
}

function serializeListPayloadToSNBT(payload: AbstractPayload<any>, compression: SNBTCompression, prefix: string): string {
    switch (compression) {
        case "multiline": {
            const formatted = serializeListPayloadToSNBT(payload, "formatted", prefix);
            if (formatted.length < 30) return formatted;
            return `[${prefix}\n    ${payload.value.map((p: AbstractPayload<any>) => serializePayloadToSNBT(p, compression)).join(",\n").replaceAll("\n", "\n    ")}\n]`;
        }
        case "formatted":
            return `[${prefix} ${payload.value.map((p: AbstractPayload<any>) => serializePayloadToSNBT(p, compression)).join(", ")} ]`;
        case "compressed":
            return `[${prefix}${payload.value.map((p: AbstractPayload<any>) => serializePayloadToSNBT(p, compression)).join(",")}]`;
        default:
            throw new NBTError(`Unknown compression: ${compression}`);
    }
}