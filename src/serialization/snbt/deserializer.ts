import {Tag} from "../../nbt/Tag";
import {
    AbstractPayload,
    ByteArrayPayload,
    BytePayload,
    CompoundPayload,
    DoublePayload,
    FloatPayload,
    IntArrayPayload,
    IntPayload,
    ListPayload,
    LongArrayPayload,
    LongPayload,
    ShortPayload,
    StringPayload,
} from "../../nbt/Payload";
import {unescapeString} from "./utils";
import {SNBTStringReader, uuidToIntArray} from "../../utils";
import {deserializeJsonToPayload} from "../json/deserializer";

export function deserializeSNBTToTag(snbt: string): Tag {
    return new Tag("", deserializeSNBTToPayload(snbt), true);
}

export function deserializeSNBTToPayload(snbt: string): AbstractPayload<any> {
    return deserializePayload(new SNBTStringReader(snbt));
}

function deserializePayload(reader: SNBTStringReader): AbstractPayload<any> {
    reader.skipWhitespace();
    const next = reader.peekNext();

    if (next.startsWith("{")) {
        return parseCompound(reader);
    } else if (/^\[\s*B\s*;/.test(next)) {
        return parseByteArray(reader);
    } else if (/^\[\s*I\s*;/.test(next)) {
        return parseIntArray(reader);
    } else if (/^\[\s*L\s*;/.test(next)) {
        return parseLongArray(reader);
    } else if (next.startsWith("[")) {
        return parseList(reader);
    } else if (/^[a-zA-Z]+\s*\(/.test(next)) {
        return parseOperation(reader);
    }

    const bool = /(true|false)(?:[^a-zA-Z_.\d+-]|$)/.exec(next);
    if (bool?.index == 0) {
        reader.moveTo(reader.index + bool[1].length);
        return new BytePayload(bool[1] == "true" ? 1 : 0);
    }

    const quotedString = tryParseQuotedString(reader);
    if (quotedString) return quotedString;

    const number = tryParseNumber(reader);
    if (number) return number;

    const unquotedString = tryParseUnquotedString(reader);
    if (unquotedString) return unquotedString;

    throw reader.newSNBTError(`Expected a value around index ${reader.index}`);
}


function parseCompound(reader: SNBTStringReader) {
    reader.expectNext("{");
    const tags: Tag[] = [];
    while (true) {
        reader.skipWhitespace();
        if (reader.peek() == "}") { // empty compound
            reader.expectNext("}");
            return new CompoundPayload([]);
        }
        const name = parseTagName(reader);
        const payload = deserializePayload(reader);
        tags.push(new Tag(name, payload));
        reader.skipWhitespace();
        if (reader.expectNext(",", "}") == "}")
            return new CompoundPayload(tags);
    }
}

function parseByteArray(reader: SNBTStringReader) {
    reader.nextUnless((c) => c != ";"); // skip [B
    reader.next(); // skip ;
    const payloads: BytePayload[] = [];
    while (true) {
        reader.skipWhitespace();
        if (reader.peek() == "]") { // empty array
            reader.expectNext("]");
            return new ByteArrayPayload([]);
        }
        const payload = deserializePayload(reader);
        if (typeof payload.value != "number" || !(-(2 ** 7) <= payload.value && payload.value <= (2 ** 7) - 1))
            throw reader.newSNBTError(`Expected a byte value around index ${reader.index}`);
        payloads.push(new BytePayload(payload.value));
        reader.skipWhitespace();
        if (reader.expectNext(",", "]") == "]")
            return new ByteArrayPayload(payloads);
    }
}

function parseIntArray(reader: SNBTStringReader) {
    reader.nextUnless((c) => c != ";"); // skip [I
    reader.next(); // skip ;
    const payloads: IntPayload[] = [];
    while (true) {
        reader.skipWhitespace();
        if (reader.peek() == "]") { // empty array
            reader.expectNext("]");
            return new IntArrayPayload([]);
        }
        const payload = deserializePayload(reader);
        if (typeof payload.value != "number" || !(-(2 ** 31) <= payload.value && payload.value <= (2 ** 31) - 1))
            throw reader.newSNBTError(`Expected an int value around index ${reader.index}`);
        payloads.push(new IntPayload(payload.value));
        reader.skipWhitespace();
        if (reader.expectNext(",", "]") == "]")
            return new IntArrayPayload(payloads);
    }
}

function parseLongArray(reader: SNBTStringReader) {
    reader.nextUnless((c) => c != ";"); // skip [L
    reader.next(); // skip ;
    const payloads: LongPayload[] = [];
    while (true) {
        reader.skipWhitespace();
        if (reader.peek() == "]") { // empty array
            reader.expectNext("]");
            return new LongArrayPayload([]);
        }
        const payload = deserializePayload(reader);
        if (
            !(typeof payload.value == "number" || typeof payload.value == "bigint") ||
            !(-(2n ** 63n) <= payload.value && payload.value <= (2n ** 63n) - 1n)
        )
            throw reader.newSNBTError(`Expected a long value around index ${reader.index}`);
        payloads.push(new LongPayload(BigInt(payload.value)));
        reader.skipWhitespace();
        if (reader.expectNext(",", "]") == "]")
            return new LongArrayPayload(payloads);
    }
}

function parseList(reader: SNBTStringReader) {
    reader.expectNext("[");
    const payloads: AbstractPayload<any>[] = [];
    while (true) {
        reader.skipWhitespace();
        if (reader.peek() == "]") { // empty list
            reader.expectNext("]");
            return new ListPayload([]);
        }
        const payload = deserializePayload(reader);
        payloads.push(payload);
        reader.skipWhitespace();
        if (reader.expectNext(",", "]") == "]")
            return new ListPayload(payloads);
    }
}

function parseOperation(reader: SNBTStringReader) {
    const operation = reader.nextUnless((c) => c != "(");
    reader.expectNext("(");
    const param = deserializePayload(reader);
    reader.skipWhitespace();
    reader.expectNext(")");
    switch (operation) {
        case "bool":
            if (!(typeof param.value == "number" || typeof param.value == "bigint"))
                throw reader.newSNBTError(`Operation "bool" can only accept number parameters`);
            return new BytePayload(param.value == 0 ? 0 : 1);
        case "uuid":
            if (typeof param.value != "string")
                throw reader.newSNBTError(`Operation "uuid" can only accept string parameters`);
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(param.value.toLowerCase()))
                throw reader.newSNBTError(`Invalid uuid string "${param.value}"`);
            return deserializeJsonToPayload(uuidToIntArray(param.value));
        default:
            throw reader.newSNBTError(`Unknown operation "${operation}"`);
    }
}

function parseTagName(reader: SNBTStringReader) {
    reader.skipWhitespace();
    const name = tryParseQuotedString(reader) ?? tryParseUnquotedString(reader);
    if (!name)
        throw reader.newSNBTError(`Expected a tag name around index ${reader.index}`);
    reader.skipWhitespace();
    reader.expectNext(":");
    return name.value;
}

function tryParseQuotedString(reader: SNBTStringReader) {
    const quotedString = /"((?:\\"|[^"])*)"|'((?:\\'|[^'])*)'/.exec(reader.peekNext());
    if (quotedString?.index == 0) {
        reader.moveTo(reader.index + quotedString[0].length);
        return new StringPayload(unescapeString(quotedString[1] ?? quotedString[2]));
    }
    return null;
}

function tryParseUnquotedString(reader: SNBTStringReader) {
    const unquotedString = reader.nextUnless(c => /[a-zA-Z_.\d+-]/.test(c));
    if (unquotedString.length > 0) {
        return new StringPayload(unescapeString(unquotedString));
    }
    return null;
}

function tryParseNumber(reader: SNBTStringReader) {
    const index = reader.index;
    const probableNumber = reader.nextUnless(c => /[a-zA-Z_.\d+-]/.test(c));
    const res = tryParseIntNumber(probableNumber) ?? tryParseFloatNumber(probableNumber);
    if (!res) reader.moveTo(index);
    return res;
}

function tryParseIntNumber(string: string) {
    let mode: "decimal" | "binary" | "hex" = "decimal";
    let isNegative = false;
    let isSigned = true;
    let type: "byte" | "short" | "int" | "long" = "int";

    // "0b" will be recognized as something starts with a binary prefix
    const zeroRegex = /^\+?0b\D/.exec(string);
    if (zeroRegex?.index == 0) {
        return new BytePayload(0);
    }

    const hexRegex = /^\+?0x/.exec(string);
    const binaryRegex = /^\+?0b]/.exec(string);
    const signRegex = /^[+-]/.exec(string);
    if (hexRegex?.index == 0) {
        mode = "hex";
        string = string.slice(hexRegex[0].length);
    } else if (binaryRegex?.index == 0) {
        mode = "binary";
        string = string.slice(binaryRegex[0].length);
    } else if (signRegex?.index == 0) {
        isNegative = signRegex[0] == "-";
        string = string.slice(signRegex[0].length);
    }

    const suffixRegex = /([usUS]?)([bsilBSIL])/.exec(string);
    if (suffixRegex && suffixRegex.index + suffixRegex[0].length == string.length) {
        isSigned = suffixRegex[1].toLowerCase() != "u";
        switch (suffixRegex[2].toLowerCase()) {
            case "b":
                type = "byte";
                break;
            case "s":
                type = "short";
                break;
            case "i":
                type = "int";
                break;
            case "l":
                type = "long";
                break;
        }
        string = string.slice(0, string.length - suffixRegex[0].length);
    }

    switch (mode) {
        case "decimal":
            if (!/^\d[_\d]*$/.test(string)) return null;
            break;
        case "binary":
            if (!/^[01][_01]*$/.test(string)) return null;
            string = "0b" + string;
            break;
        case "hex":
            if (!/^[\da-fA-F][_\da-fA-F]*$/.test(string)) return null;
            string = "0x" + string;
            break;
    }
    string = string.replaceAll("_", "");

    let bigint = BigInt(string) * (isNegative ? -1n : 1n);
    let number = Number(bigint);

    switch (type) {
        case "byte":
            return new BytePayload(isSigned ? number : new Uint8Array([number])[0]);
        case "short":
            return new ShortPayload(isSigned ? number : new Uint16Array([number])[0]);
        case "int":
            return new IntPayload(isSigned ? number : new Uint32Array([number])[0]);
        case "long":
            return new LongPayload(isSigned ? bigint : new BigUint64Array([bigint])[0]);
    }
}

function tryParseFloatNumber(string: string) {
    let type: "float" | "double" = "double";

    const suffixRegex = /[fdFD]/.exec(string);
    if (suffixRegex && suffixRegex.index + 1 == string.length) {
        switch (suffixRegex[0].toLowerCase()) {
            case "d":
                type = "double";
                break;
            case "f":
                type = "float";
                break;
        }
        string = string.slice(0, -1);
    }

    const fracRegex = /^([+-]?\d[_\d]*(?:\.\d[_\d]*)?)(?:[eE]([+-]?\d[_\d]*))?$/.exec(string);
    if (fracRegex?.index != 0) return null;

    let number = Number(fracRegex[1].replaceAll("_", ""));
    if (fracRegex[2]) number *= Math.pow(10, Number(fracRegex[2].replaceAll("_", "")));

    switch (type) {
        case "float":
            return new FloatPayload(number);
        case "double":
            return new DoublePayload(number);
    }
}