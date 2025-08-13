import {Tag, TagId} from "../../nbt/Tag";
import {BinaryCompression, Edition, NBTError} from "../../types";
import {deflate, gzip} from "pako";
import {concatUint8Arrays, isLittleEndian} from "../../utils";
import {
    AbstractPayload,
    BytePayload,
    DoublePayload,
    FloatPayload,
    IntPayload,
    LongPayload,
    ShortPayload,
} from "../../nbt/Payload";

export function serializeTagToNBT(tag: Tag, edition: Edition, compression: BinaryCompression = "gzip"): Uint8Array {
    const data = serializeTagToUnzippedNBT(tag, edition);
    switch (compression) {
        case "gzip":
            return gzip(data);
        case "zlib":
            return deflate(data);
        default:
            return data;
    }
}

function serializeTagToUnzippedNBT(tag: Tag, edition: Edition): Uint8Array {
    const nameLength = tag.name.length;
    const nameBytes = new TextEncoder().encode(tag.name);
    const tagData = new Uint8Array(3);
    const tagDataView = new DataView(tagData.buffer);
    tagDataView.setInt8(0, tag.payload.tagId);
    tagDataView.setUint16(1, nameLength, isLittleEndian(edition));
    return concatUint8Arrays(tagData, nameBytes, serializePayloadToNBT(tag.payload, edition));
}

export function serializePayloadToNBT(payload: AbstractPayload<any>, edition: Edition): Uint8Array {
    const littleEndian = isLittleEndian(edition);
    switch (payload.tagId) {
        case TagId.BYTE:
            const byte = new Uint8Array(1);
            new DataView(byte.buffer).setInt8(0, (payload as BytePayload).value);
            return byte;
        case TagId.SHORT:
            const short = new Uint8Array(2);
            new DataView(short.buffer).setInt16(0, (payload as ShortPayload).value, littleEndian);
            return short;
        case TagId.INT:
            const int = new Uint8Array(4);
            new DataView(int.buffer).setInt32(0, (payload as IntPayload).value, littleEndian);
            return int;
        case TagId.LONG:
            const long = new Uint8Array(8);
            new DataView(long.buffer).setBigInt64(0, (payload as LongPayload).value, littleEndian);
            return long;
        case TagId.FLOAT:
            const float = new Uint8Array(4);
            new DataView(float.buffer).setFloat32(0, (payload as FloatPayload).value, littleEndian);
            return float;
        case TagId.DOUBLE:
            const double = new Uint8Array(8);
            new DataView(double.buffer).setFloat64(0, (payload as DoublePayload).value, littleEndian);
            return double;
        case TagId.BYTE_ARRAY:
            const byteArrayLength = payload.value.length;
            const byteArray = new Uint8Array(4 + byteArrayLength);
            const byteArrayView = new DataView(byteArray.buffer);
            byteArrayView.setInt32(0, byteArrayLength, littleEndian);
            for (let i = 0; i < byteArrayLength; i++) {
                byteArrayView.setInt8(4 + i, payload.value[i]);
            }
            return byteArray;
        case TagId.STRING:
            const stringBytes = new TextEncoder().encode(payload.value);
            const stringLength = stringBytes.length;
            const string = new Uint8Array(2 + stringLength);
            const stringView = new DataView(string.buffer);
            stringView.setUint16(0, stringLength, littleEndian);
            for (let i = 0; i < stringLength; i++) {
                stringView.setUint8(2 + i, stringBytes[i]);
            }
            return string;
        case TagId.LIST:
            const listLength = payload.value.length;
            const list = new Uint8Array(1 + 4);
            const listView = new DataView(list.buffer);
            listView.setUint8(0, payload.value[0].tagId);
            listView.setInt32(1, listLength, littleEndian);
            return concatUint8Arrays(
                list,
                ...payload.value.map((p: AbstractPayload<any>) => serializePayloadToNBT(p, edition)),
            );
        case TagId.COMPOUND:
            return concatUint8Arrays(
                ...payload.value.map((tag: Tag) => serializeTagToUnzippedNBT(tag, edition)),
                new Uint8Array([TagId.END]),
            );
        case TagId.INT_ARRAY:
            const intArrayLength = payload.value.length;
            const intArray = new Uint8Array(4 + intArrayLength * 4);
            const intArrayView = new DataView(intArray.buffer);
            intArrayView.setInt32(0, intArrayLength, littleEndian);
            for (let i = 0; i < intArrayLength; i++) {
                intArrayView.setInt32(4 + i * 4, payload.value[i]);
            }
            return intArray;
        case TagId.LONG_ARRAY:
            const longArrayLength = payload.value.length;
            const longArray = new Uint8Array(4 + longArrayLength * 8);
            const longArrayView = new DataView(longArray.buffer);
            longArrayView.setInt32(0, longArrayLength, littleEndian);
            for (let i = 0; i < longArrayLength; i++) {
                longArrayView.setBigInt64(4 + i * 8, payload.value[i]);
            }
            return longArray;
        default:
            throw new NBTError(`Unknown tag id: ${payload.tagId}`);
    }
}