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

export function deserializeNBTToPayload(view: DataView, id: TagId, edition: Edition): [AbstractPayload<any>, number] {
    const littleEndian = isLittleEndian(edition);
    console.log(new Uint8Array(view.buffer));
    let payload: AbstractPayload<any>;
    let length;
    switch (id) {
        case TagId.BYTE:
            payload = new BytePayload(view.getInt8(0));
            length = 1;
            break;
        case TagId.SHORT:
            payload = new ShortPayload(view.getInt16(0, littleEndian));
            length = 2;
            break;
        case TagId.INT:
            payload = new IntPayload(view.getInt32(0, littleEndian));
            length = 4;
            break;
        case TagId.LONG:
            payload = new LongPayload(view.getBigInt64(0, littleEndian));
            length = 8;
            break;
        case TagId.FLOAT:
            payload = new FloatPayload(view.getFloat32(0, littleEndian));
            length = 4;
            break;
        case TagId.DOUBLE:
            payload = new DoublePayload(view.getFloat64(0, littleEndian));
            length = 8;
            break;
        case TagId.BYTE_ARRAY: {
            const len = view.getInt32(0, littleEndian);
            const arr: BytePayload[] = [];
            for (let i = 0; i < len; i++) {
                arr.push(new BytePayload(view.getInt8(i + 4)));
            }
            payload = new ByteArrayPayload(arr);
            length = 4 + len;
            break;
        }
        case TagId.STRING: {
            const len = view.getUint16(0, littleEndian);
            if (littleEndian) {
                payload = new StringPayload(new TextDecoder().decode(view.buffer.slice(2, 2 + len)));
            } else {
                payload = new StringPayload(new TextDecoder().decode(new Uint8Array(view.buffer.slice(2, 2 + len))));
            }
            length = 2 + len;
            break;
        }
        case TagId.LIST: {
            const typ = view.getInt8(0);
            const len = view.getInt32(1, littleEndian);
            const arr: AbstractPayload<any>[] = [];
            let offset = 0;
            for (let i = 0; i < len; i++) {
                const [p, len] = deserializeNBTToPayload(new DataView(view.buffer.slice(5 + offset)), typ, edition);
                console.log(p);
                arr.push(p);
                offset += len;
            }
            payload = new ListPayload(arr);
            length = 5 + offset;
            break;
        }
        case TagId.COMPOUND: {
            let offset = 0;
            const arr: Tag[] = [];
            while (true) {
                if (view.getInt8(offset) == TagId.END) break;
                const [tag, len] = deserializeUnzippedNBTToTag(new Uint8Array(view.buffer.slice(offset)), edition);
                arr.push(tag);
                offset += len;
            }
            payload = new CompoundPayload(arr);
            length = offset + 1;
            break;
        }
        case TagId.INT_ARRAY: {
            const len = view.getInt32(0, littleEndian);
            const arr: IntPayload[] = [];
            for (let i = 0; i < len; i++) {
                arr.push(new IntPayload(view.getInt32(i * 4 + 4, littleEndian)));
            }
            payload = new IntArrayPayload(arr);
            length = 4 + len * 4;
            break;
        }
        case TagId.LONG_ARRAY: {
            const len = view.getInt32(0, littleEndian);
            const arr: LongPayload[] = [];
            for (let i = 0; i < len; i++) {
                arr.push(new LongPayload(view.getBigInt64(i * 8 + 4, littleEndian)));
            }
            payload = new LongArrayPayload(arr);
            length = 4 + len * 8;
            break;
        }
        default:
            throw new NBTError(`Unknown tag id: ${id}`);
    }
    console.log(payload);
    return [payload, length];
}