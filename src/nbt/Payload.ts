import {Edition, NBTError, SNBTCompression} from "../types";
import {Tag, TagId} from "./Tag";
import {serializePayloadToNBT} from "../serialization/nbt/serializer";
import {serializePayloadToJson} from "../serialization/json/serializer";
import {serializePayloadToSNBT} from "../serialization/snbt/serializer";

export abstract class AbstractPayload<T> {
    protected _value: T;

    protected constructor(value: T) {
        this._value = this.validate(value) ?? value;
    }

    abstract get tagId(): TagId;

    protected validate(value: T): T | void {
    }

    get value(): T {
        return this._value;
    }

    set value(value: T) {
        this._value = this.validate(value) ?? value;
    }

    copy(value?: T): AbstractPayload<T> {
        return new (this.constructor as any)(value ?? this.value);
    }

    equals(other: AbstractPayload<T>): boolean {
        return this.tagId == other.tagId && this.value == other.value;
    }

    toNBT(edition: Edition): Uint8Array {
        return serializePayloadToNBT(this, edition);
    }

    toJson(): any {
        return serializePayloadToJson(this);
    }

    toSNBT(compression?: SNBTCompression): string {
        return serializePayloadToSNBT(this, compression);
    }
}


export class BytePayload extends AbstractPayload<number> {
    constructor(value: number) {
        super(value);
    }

    protected validate(value: number) {
        return new Int8Array([value])[0];
    }

    get tagId(): TagId {
        return TagId.BYTE;
    }
}

export class ShortPayload extends AbstractPayload<number> {
    constructor(value: number) {
        super(value);
    }

    protected validate(value: number) {
        return new Int16Array([value])[0];
    }

    get tagId(): TagId {
        return TagId.SHORT;
    }
}

export class IntPayload extends AbstractPayload<number> {
    constructor(value: number) {
        super(value);
    }

    protected validate(value: number) {
        return new Int32Array([value])[0];
    }

    get tagId(): TagId {
        return TagId.INT;
    }
}

export class LongPayload extends AbstractPayload<bigint> {
    constructor(value: bigint) {
        super(value);
    }

    protected validate(value: bigint) {
        return new BigInt64Array([value])[0];
    }

    get tagId(): TagId {
        return TagId.LONG;
    }
}

export class FloatPayload extends AbstractPayload<number> {
    constructor(value: number) {
        super(value);
    }

    protected validate(value: number) {
        if (!Number.isFinite(value) || Number.isNaN(value))
            throw new NBTError(`Invalid number value: ${value}`);
        return new Float32Array([value])[0];
    }

    get tagId(): TagId {
        return TagId.FLOAT;
    }
}

export class DoublePayload extends AbstractPayload<number> {
    protected validate(value: number) {
        if (!Number.isFinite(value) || Number.isNaN(value))
            throw new NBTError(`Invalid number value: ${value}`);
    }

    constructor(value: number) {
        super(value);
    }

    get tagId(): TagId {
        return TagId.DOUBLE;
    }
}

export class ByteArrayPayload extends AbstractPayload<BytePayload[]> {
    constructor(value: BytePayload[]) {
        super(value);
    }

    protected validate(value: BytePayload[]) {
        if (value.length >= 2 ** 31)
            throw new NBTError(`Byte array is longer than 2147483647 items: [${value.map(p => p.toJson()).join(", ")}]`);
    }

    get tagId(): TagId {
        return TagId.BYTE_ARRAY;
    }
}

export class StringPayload extends AbstractPayload<string> {
    constructor(value: string) {
        super(value);
    }

    protected validate(value: string) {
        if (value.length > 65535)
            throw new NBTError(`String is longer than 65535 chars: ${value}`);
    }

    get tagId(): TagId {
        return TagId.STRING;
    }
}

export class ListPayload extends AbstractPayload<AbstractPayload<any>[]> {
    constructor(value: AbstractPayload<any>[]) {
        super(value);
    }

    protected validate(value: AbstractPayload<any>[]) {
        if (value.length >= 2 ** 31)
            throw new NBTError(`List is longer than 65535 items: [${value.map(p => p.toJson()).join()}]`);
        const firstTag = value[0].tagId;
        if (value.some(payload => payload.tagId != firstTag))
            throw new NBTError(`List contains different types, tag ids: [${value.reduce((acc, cur) => {
                if (!acc.includes(cur.tagId)) acc.push(cur.tagId);
                return acc;
            }, [] as number[]).sort().join(", ")}]`);
    }

    get tagId(): TagId {
        return TagId.LIST;
    }
}

export class CompoundPayload extends AbstractPayload<Tag[]> {
    // TODO: Compound和List嵌套深度大于512的报错
    constructor(value: Tag[]) {
        super(value);
    }

    get tagId(): TagId {
        return TagId.COMPOUND;
    }
}

export class IntArrayPayload extends AbstractPayload<IntPayload[]> {
    constructor(value: IntPayload[]) {
        super(value);
    }

    protected validate(value: IntPayload[]) {
        if (value.length >= 2 ** 31)
            throw new NBTError(`Int array is longer than 2147483647 items: [${value.map(p => p.toJson()).join(", ")}]`);
    }

    get tagId(): TagId {
        return TagId.INT_ARRAY;
    }
}

export class LongArrayPayload extends AbstractPayload<LongPayload[]> {
    constructor(value: LongPayload[]) {
        super(value);
    }

    protected validate(value: LongPayload[]) {
        if (value.length >= 2 ** 31)
            throw new NBTError(`Long array is longer than 2147483647 items: [${value.map(p => p.toJson()).join(", ")}]`);
    }

    get tagId(): TagId {
        return TagId.LONG_ARRAY;
    }
}