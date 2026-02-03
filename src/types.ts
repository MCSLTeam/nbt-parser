export type Edition = "bedrock" | "java";
export type BinaryCompression = "gzip" | "zlib" | "none";
export type SNBTCompression = "compressed" | "formatted" | "multiline";

export class NBTError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NBTError";
    }
}

export class SNBTError extends NBTError {
    constructor(message: string, public readonly snbt: string, public readonly index: number) {
        super(message);
        this.name = "SNBTError";
    }
}