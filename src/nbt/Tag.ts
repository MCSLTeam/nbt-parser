import {BinaryCompression, Edition, NBTError, SNBTCompression} from "../types";
import {AbstractPayload} from "./Payload";
import {serializeTagToNBT} from "../serialization/nbt/serializer";
import {serializeTagToJson} from "../serialization/json/serializer";
import {serializeTagToSNBT} from "../serialization/snbt/serializer";

export enum TagId {
    END = 0x00,
    BYTE = 0x01,
    SHORT = 0x02,
    INT = 0x03,
    LONG = 0x04,
    FLOAT = 0x05,
    DOUBLE = 0x06,
    BYTE_ARRAY = 0x07,
    STRING = 0x08,
    LIST = 0x09,
    COMPOUND = 0x0a,
    INT_ARRAY = 0x0b,
    LONG_ARRAY = 0x0c,
}

export class Tag {
    private _name: string;

    constructor(name: string, public payload: AbstractPayload<any>, public readonly root: boolean = false) {
        this.validate(name);
        this._name = name;
    }

    validate(name: string) {
        if (name.length > 65535)
            throw new NBTError(`Tag name is longer than 65535 chars: ${name}`);
        if (this.root && name.length != 0)
            throw new NBTError(`Root tag name must be empty`);
        if (this.root && this.payload.tagId != TagId.COMPOUND)
            throw new NBTError(`Root tag must be a compound tag`);
    }

    copy(name?: string, payload?: AbstractPayload<any>, root?: boolean): Tag {
        return new Tag(name ?? this._name, payload ?? this.payload.copy(), root ?? this.root);
    };

    equals(other: Tag): boolean {
        return this._name == other._name && this.payload.equals(other.payload);
    }

    get name(): string {
        return this._name;
    }

    set name(name: string) {
        this.validate(name);
        this._name = name;
    }

    toNBT(edition: Edition, binaryCompression?: BinaryCompression): Uint8Array {
        return serializeTagToNBT(this, edition, binaryCompression);
    }

    toJson(): any {
        if (this.root) return this.payload.toJson();
        else return serializeTagToJson(this);
    }

    toSNBT(compression?: SNBTCompression): string {
        if (this.root) return this.payload.toSNBT(compression);
        else return serializeTagToSNBT(this, compression);
    }
}