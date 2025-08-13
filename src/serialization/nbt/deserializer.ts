import {inflate} from "pako";
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
import {BinaryCompression, Edition, NBTError} from "../../types";
import {Tag, TagId} from "../../nbt/Tag";
import {isLittleEndian} from "../../utils";

export function deserializeNBTToTag(data: Uint8Array, edition: Edition, compression: BinaryCompression | "auto" = "auto"): Tag {
    if (compression == "auto") {
        if (data[0] == 0x1f && data[1] == 0x8b) // gzip or zlib
            compression = "gzip";
        else if (data[0] <= 0x0c) // not compressed (starting with tag id)
            compression = "none";
        else
            throw new NBTError("Unknown compression type");
    }
    if (compression == "gzip" || compression == "zlib") {
        data = inflate(data);
    }
    const [tag] = deserializeUnzippedNBTToTag(data, edition, true);
    return tag.copy(undefined, undefined, true);
}

function deserializeUnzippedNBTToTag(data: Uint8Array, edition: Edition, root?: boolean): [Tag, number] {
    const id = data[0];
    const nameLength = new DataView(data.slice(1, 5).buffer).getUint16(0, isLittleEndian(edition));
    const name = new TextDecoder().decode(data.slice(3, 3 + nameLength));
    const [payload, payloadLength] = deserializeNBTToPayload(new DataView(data.slice(3 + nameLength).buffer), id, edition);
    return [new Tag(name, payload, root), 1 + 2 + nameLength + payloadLength];
}

export function deserializeNBTToPayload(data: DataView, id: TagId, edition: Edition): [AbstractPayload<any>, number] {
    const littleEndian = isLittleEndian(edition);
    let payload: AbstractPayload<any>;
    let length;
    switch (id) {
        case TagId.BYTE:
            payload = new BytePayload(data.getInt8(0));
            length = 1;
            break;
        case TagId.SHORT:
            payload = new ShortPayload(data.getInt16(0, littleEndian));
            length = 2;
            break;
        case TagId.INT:
            payload = new IntPayload(data.getInt32(0, littleEndian));
            length = 4;
            break;
        case TagId.LONG:
            payload = new LongPayload(data.getBigInt64(0, littleEndian));
            length = 8;
            break;
        case TagId.FLOAT:
            payload = new FloatPayload(data.getFloat32(0, littleEndian));
            length = 4;
            break;
        case TagId.DOUBLE:
            payload = new DoublePayload(data.getFloat64(0, littleEndian));
            length = 8;
            break;
        case TagId.BYTE_ARRAY:
            const byteArrayLength = data.getInt32(0, littleEndian);
            const byteArray: BytePayload[] = [];
            for (let i = 0; i < byteArrayLength; i++) {
                byteArray.push(new BytePayload(data.getInt8(i + 4)));
            }
            payload = new ByteArrayPayload(byteArray);
            length = 4 + byteArrayLength;
            break;
        case TagId.STRING:
            const stringLength = data.getUint16(0, littleEndian);
            if (littleEndian) {
                payload = new StringPayload(new TextDecoder().decode(data.buffer.slice(2, 2 + stringLength)));
            } else {
                payload = new StringPayload(new TextDecoder().decode(new Uint8Array(data.buffer.slice(2, 2 + stringLength))));
            }
            length = 2 + stringLength;
            break;
        case TagId.LIST:
            const listType = data.getInt8(0);
            const listLength = data.getInt32(1, littleEndian);
            const list: AbstractPayload<any>[] = [];
            let listOffset = 0;
            for (let i = 0; i < listLength; i++) {
                const [p, len] = deserializeNBTToPayload(new DataView(data.buffer.slice(5 + listOffset)), listType, edition);
                list.push(p);
                listOffset += len;
            }
            payload = new ListPayload(list);
            length = 5 + listOffset;
            break;
        case TagId.COMPOUND:
            let compoundOffset = 0;
            const compound: Tag[] = [];
            while (true) {
                const [tag, len] = deserializeUnzippedNBTToTag(new Uint8Array(data.buffer.slice(compoundOffset)), edition);
                compound.push(tag);
                compoundOffset += len;
                if (data.getInt8(compoundOffset) == TagId.END) break;
            }
            payload = new CompoundPayload(compound);
            length = compoundOffset + 1;
            break;
        case TagId.INT_ARRAY:
            const intArrayLength = data.getInt32(0, littleEndian);
            const intArray: IntPayload[] = [];
            for (let i = 0; i < intArrayLength; i++) {
                intArray.push(new IntPayload(data.getInt8(i + 4)));
            }
            payload = new IntArrayPayload(intArray);
            length = 4 + intArrayLength;
            break;
        case TagId.LONG_ARRAY:
            const longArrayLength = data.getInt32(0, littleEndian);
            const longArray: LongPayload[] = [];
            for (let i = 0; i < longArrayLength; i++) {
                longArray.push(new LongPayload(data.getBigInt64(i * 8 + 4, littleEndian)));
            }
            payload = new LongArrayPayload(longArray);
            length = 4 + longArrayLength * 8;
            break;
        default:
            throw new NBTError(`Unknown tag id: ${id}`);
    }
    return [payload, length];
}