import {Tag, TagId} from "../../nbt/Tag";
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
import {NBTError} from "../../types";

export function deserializeJsonToTag(json: any): Tag {
    return new Tag("", deserializeJsonToPayload(json), true);
}

export function deserializeJsonToPayload(value: any): AbstractPayload<any> {
    switch (typeof value) {
        case "string":
            return new StringPayload(value);
        case "number":
        case "bigint":
            if ((typeof value == "number" && !Number.isFinite(value)) || Number.isNaN(value))
                throw new NBTError(`Invalid number value: ${value}`);
            const number = Number(value);
            if (Number.isInteger(value) || typeof value === "bigint") {
                if (-(2 ** 7) <= value && value <= 2 ** 7 - 1)
                    return new BytePayload(Number(value));
                else if (-(2 ** 15) <= value && value <= 2 ** 15 - 1)
                    return new ShortPayload(Number(value));
                else if (-(2 ** 31) <= value && value <= 2 ** 31 - 1)
                    return new IntPayload(Number(value));
                else if (-(2n ** 63n) <= value && value <= 2n ** 63n - 1n)
                    return new LongPayload(BigInt(value));
            }
            if (new Float32Array([number])[0] == number) return new FloatPayload(number);
            else return new DoublePayload(number);
        case "boolean":
            return new BytePayload(value ? 1 : 0);
        case "object":
            if (value == null) throw new NBTError(`Invalid value type: ${typeof value} (${value})`);
            else if (value instanceof Array) {
                const payloads: AbstractPayload<any>[] = [];
                for (const item of value) {
                    payloads.push(deserializeJsonToPayload(item));
                }
                const firstTag = payloads[0].tagId;
                if (payloads.every(payload => payload.tagId == TagId.BYTE)) {
                    return new ByteArrayPayload(payloads as BytePayload[]);
                } else if (payloads.every(payload => payload.tagId == TagId.INT)) {
                    return new IntArrayPayload(payloads as IntPayload[]);
                } else if (payloads.every(payload => payload.tagId == TagId.LONG)) {
                    return new LongArrayPayload(payloads as LongPayload[]);
                } else if (payloads.every(payload => payload.tagId == firstTag)) {
                    return new ListPayload(payloads);
                }
                throw new NBTError(`List contains different types: ${value} (tag ids: [${value.reduce((acc, cur) => {
                    if (!acc.includes(cur.tagId)) acc.push(cur.tagId);
                    return acc;
                }, [] as number[]).sort().join(", ")}])`);
            } else {
                const compounds: Tag[] = [];
                for (const key of Object.keys(value)) {
                    compounds.push(new Tag(key, deserializeJsonToPayload(value[key])));
                }
                return new CompoundPayload(compounds);
            }
        case "undefined":
        case "function":
        case "symbol":
            throw new NBTError(`Invalid value type: ${typeof value} (${value})`);
    }
}