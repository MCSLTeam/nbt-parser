import {Tag, TagId} from "../../nbt/Tag";
import {NBTError, SNBTCompression} from "../../types";
import {AbstractPayload} from "../../nbt/Payload";
import {escapeString} from "./utils";

export function serializeTagToSNBT(tag: Tag, compression: SNBTCompression = "formated"): string {
    const space = compression == "formated" ? " " : "";
    return `{${space}${serializeTagToUnwrappedSNBT(tag, compression)}${space}}`;
}

function serializeTagToUnwrappedSNBT(tag: Tag, compression: SNBTCompression) {
    const name = canUseUnquotedString(tag.name) ? tag.name : serializeString(tag.name);
    return `${name}:${compression == "formated" ? " " : ""}${serializePayloadToSNBT(tag.payload, compression)}`;
}

export function serializePayloadToSNBT(payload: AbstractPayload<any>, compression: SNBTCompression = "formated"): string {
    const space = compression == "formated" ? " " : "";
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
            return serializeListPayloadToSNBT(payload, compression, "B");
        case TagId.STRING:
            return serializeString(payload.value);
        case TagId.LIST:
            return serializeListPayloadToSNBT(payload, compression);
        case TagId.COMPOUND:
            return `{${space}${payload.value.map((tag: Tag) => serializeTagToUnwrappedSNBT(tag, compression)).join(`,${space}`)}${space}}`;
        case TagId.INT_ARRAY:
            return serializeListPayloadToSNBT(payload, compression, "I");
        case TagId.LONG_ARRAY:
            return serializeListPayloadToSNBT(payload, compression, "L");
        default:
            throw new NBTError(`Unknown tag id: ${payload.tagId}`);
    }
}

function canUseUnquotedString(string: string) {
    return /^[a-zA-Z_.][a-zA-Z_.\d+\-]*$/.test(string);
}

function serializeString(string: string) {
    const quote = string.includes("'") && (
        !string.includes("\"") ||
        string.indexOf("'") < string.indexOf("\"")
    ) ? "'" : "\"";
    return `${quote}${escapeString(string, quote)}${quote}`;
}

function serializeListPayloadToSNBT(payload: AbstractPayload<any>, compression: SNBTCompression, prefix?: string) {
    const space = compression == "formated" ? " " : "";
    return `[${prefix ? `${prefix};${space}` : space}${payload.value.map((p: AbstractPayload<any>) => serializePayloadToSNBT(p, compression)).join(`,${space}`)}${space}]`;
}