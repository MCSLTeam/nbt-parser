import {Tag, TagId} from "../../nbt/Tag";
import {NBTError, SNBTSerializerOptions} from "../../types";
import {AbstractPayload, CompoundPayload} from "../../nbt/Payload";
import {escapeString} from "./utils";

const defaultOptions: SNBTSerializerOptions = {
    format: "pretty",
    preferUnquotedString: true,
    quote: "prefer-double",
    tab: "    ",
    preferBoolean: false,
    breakLine: 33,
};

export function serializeTagToSNBT(tag: Tag, options?: Partial<SNBTSerializerOptions>): string {
    const fullOptions: SNBTSerializerOptions = {
        ...defaultOptions,
        ...options
    };
    if (tag.root) return serializePayloadToSNBT(tag.payload, fullOptions);
    return serializePayloadToSNBT(new CompoundPayload([tag]), fullOptions);
}

function serializeTagToUnwrappedSNBT(tag: Tag, options: SNBTSerializerOptions) {
    const space = options.format == "compressed" ? "" : " ";
    const name = canUseUnquotedString(tag.name, options) ? tag.name : serializeString(tag.name, options);
    return `${name}:${space}${serializePayloadToSNBT(tag.payload, options)}`;
}

export function serializePayloadToSNBT(payload: AbstractPayload<any>, options?: Partial<SNBTSerializerOptions>): string {
    const fullOptions: SNBTSerializerOptions = {
        ...defaultOptions,
        ...options
    };

    switch (payload.tagId) {
        case TagId.BYTE:
            if (fullOptions.preferBoolean && payload.value == 0) return "false";
            if (fullOptions.preferBoolean && payload.value == 1) return "true";
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
            return serializeListPayloadToSNBT(payload, fullOptions, "B;");
        case TagId.STRING:
            return serializeString(payload.value, fullOptions);
        case TagId.LIST:
            return serializeListPayloadToSNBT(payload, fullOptions, "");
        case TagId.COMPOUND:
            return serializeCompoundPayloadToSNBT(payload, fullOptions);
        case TagId.INT_ARRAY:
            return serializeListPayloadToSNBT(payload, fullOptions, "I;");
        case TagId.LONG_ARRAY:
            return serializeListPayloadToSNBT(payload, fullOptions, "L;");
        default:
            throw new NBTError(`Unknown tag id: ${payload.tagId}`);
    }
}

function canUseUnquotedString(string: string, options: SNBTSerializerOptions) {
    return options.preferUnquotedString && /^[a-zA-Z_.][a-zA-Z_.\d+-]*$/.test(string);
}

function serializeString(string: string, options: SNBTSerializerOptions) {
    let quote: "\"" | "'";
    switch (options.quote) {
        case "prefer-double":
            quote = (string.includes("'") && !string.includes("\"")) ? "'" : "\"";
            break;
        case "prefer-single":
            quote = (string.includes("\"") && !string.includes("'")) ? "\"" : "'";
            break;
        case "double":
            quote = "\"";
            break;
        case "single":
            quote = "'";
            break;
        default:
            throw new NBTError(`Unknown quote preference: ${options.quote}`);
    }
    return `${quote}${escapeString(string, quote)}${quote}`;
}

function serializeCompoundPayloadToSNBT(payload: AbstractPayload<any>, options: SNBTSerializerOptions): string {
    switch (options.format) {
        case "multiline": {
            const pretty = serializeCompoundPayloadToSNBT(payload, {
                ...options,
                format: "pretty"
            });
            if (pretty.length < options.breakLine) return pretty;
            return `{\n${options.tab}${
                payload.value
                    .map((tag: Tag) => serializeTagToUnwrappedSNBT(tag, options))
                    .join(",\n")
                    .replaceAll("\n", `\n${options.tab}`)
            }\n}`;
        }
        case "pretty":
            return `{ ${payload.value.map((tag: Tag) => serializeTagToUnwrappedSNBT(tag, options)).join(", ")} }`;
        case "compressed":
            return `{${payload.value.map((tag: Tag) => serializeTagToUnwrappedSNBT(tag, options)).join(",")}}`;
        default:
            throw new NBTError(`Unknown compression: ${options.format}`);
    }
}

function serializeListPayloadToSNBT(payload: AbstractPayload<any>, options: SNBTSerializerOptions, prefix: string): string {
    switch (options.format) {
        case "multiline": {
            const pretty = serializeListPayloadToSNBT(payload, {
                ...options,
                format: "pretty"
            }, prefix);
            if (pretty.length < options.breakLine) return pretty;
            return `[${prefix}\n${options.tab}${
                payload.value
                    .map((p: AbstractPayload<any>) => serializePayloadToSNBT(p, options))
                    .join(",\n")
                    .replaceAll("\n", `\n${options.tab}`)
            }\n]`;
        }
        case "pretty":
            return `[${prefix} ${payload.value.map((p: AbstractPayload<any>) => serializePayloadToSNBT(p, options)).join(", ")} ]`;
        case "compressed":
            return `[${prefix}${payload.value.map((p: AbstractPayload<any>) => serializePayloadToSNBT(p, options)).join(",")}]`;
        default:
            throw new NBTError(`Unknown compression: ${options.format}`);
    }
}