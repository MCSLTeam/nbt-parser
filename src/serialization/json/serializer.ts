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

export function serializeTagToJson(tag: Tag): any {
    return {
        [tag.name]: serializePayloadToJson(tag.payload),
    };
}

export function serializePayloadToJson(payload: AbstractPayload<any>): any {
    if (
        payload instanceof BytePayload ||
        payload instanceof ShortPayload ||
        payload instanceof IntPayload ||
        payload instanceof LongPayload ||
        payload instanceof FloatPayload ||
        payload instanceof DoublePayload ||
        payload instanceof StringPayload
    ) {
        return payload.value;
    } else if (
        payload instanceof ByteArrayPayload ||
        payload instanceof IntArrayPayload ||
        payload instanceof LongArrayPayload ||
        payload instanceof ListPayload
    ) {
        const list = [];
        for (const p of payload.value) {
            list.push(serializePayloadToJson(p));
        }
        return list;
    } else if (payload instanceof CompoundPayload) {
        let obj: Record<string, any> = {};
        for (const tag of payload.value) {
            obj = {
                ...obj,
                ...serializeTagToJson(tag),
            };
        }
        return obj;
    }
}