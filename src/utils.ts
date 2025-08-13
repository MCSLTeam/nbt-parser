import {Edition, SNBTError} from "./types";

export function concatUint8Arrays(...arrays: Uint8Array[]) {
    let totalLength = 0;
    for (let arr of arrays) {
        totalLength += arr.length;
    }
    let result = new Uint8Array(totalLength);
    let offset = 0;
    for (let arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

export function isLittleEndian(edition: Edition) {
    return edition === "bedrock";
}

export function uuidToIntArray(uuid: string) {
    const hex = uuid.replace(/-/g, "").toLowerCase();
    const parts = [
        hex.substring(0, 8),
        hex.substring(8, 16),
        hex.substring(16, 24),
        hex.substring(24, 32),
    ];
    return parts.map(part => {
        const unsigned = parseInt(part, 16);
        return unsigned > 0x7FFFFFFF ? unsigned - 0x100000000 : unsigned;
    });
}

export function intArrayToUuid(intArray: number[]) {
    const parts = intArray.map(part => {
        const unsigned = part >= 0 ? part : part + 0x100000000;
        return unsigned.toString(16).padStart(8, "0");
    });
    const slashBetween = (part: string) =>
        `${part.slice(0, 4)}-${part.slice(4, 8)}`;
    return `${parts[0]}-${slashBetween(parts[1])}-${slashBetween(parts[2])}${parts[3]}`;
}

export class SNBTStringReader {
    private _index: number = -1;

    /**
     * Creates a new StringReader
     * @param string The string to read
     */
    constructor(public readonly string: string) {
    }

    /**
     * Gets pointer position
     * @returns pointer position
     */
    get index(): number {
        return this._index;
    }

    /**
     * Sets pointer position
     * @param index position
     * @throws Error if position is out of bounds
     */
    set index(index: number) {
        if (index < -1 || index >= this.length)
            throw new Error(`Index ${index} out of string "${this.string}"`);
        this._index = index;
    }

    /**
     * Gets the length of the string
     *
     * Equals to <code>StringReader.string.length</code>
     * @returns the length of the string
     */
    get length(): number {
        return this.string.length;
    }

    /**
     * Reads the character at the specified index
     * @param index the position of the character to get, defaults to the next character
     * @throws Error if position is out of bounds
     * @returns the character at the specified index
     */
    charAt(index: number): string {
        if (index < 0 || index >= this.length) {
            throw new Error(`Index ${index} out of string "${this.string}"`);
        }
        return this.string[index];
    }

    /**
     * Reads the next character
     *
     * Equals to <code>StringReader.charAt(StringReader.index + 1)</code>
     * @throws Error if the next position is out of bounds
     * @returns the character at the next position
     */
    peek(): string {
        return this.charAt(this.index + 1);
    }

    /**
     * Reads all characters starting from the current position
     *
     * Does not read the current character
     * @returns all characters starting from the current position
     */
    peekNext() {
        return this.string.slice(this.index + 1);
    }

    /**
     * Reads the current character
     *
     * Equals to <code>StringReader.charAt(StringReader.index)</code>
     * @returns current character
     */
    curr(): string {
        return this.charAt(this.index);
    }

    /**
     * Reads the previous character
     *
     * Equals to <code>StringReader.charAt(StringReader.index - 1)</code>
     * @throws Error if the previous position is out of bounds
     */
    peekPrev(): string {
        return this.charAt(this.index - 1);
    }

    /**
     * Moves the pointer to the previous character and returns it
     * @throws Error if the previous position is out of bounds
     */
    prev(): string {
        this.index--;
        return this.curr();
    }

    /**
     * Moves the pointer to the next character and returns it
     * @throws Error if the next position is out of bounds
     */
    next(): string {
        this.index++;
        return this.curr();
    }

    /**
     * Reads all characters until the specified test function returns false
     *
     * Does not read the current character
     *
     * Positions the pointer to the last read character
     * @param prediction the test function
     * @returns the read characters
     */
    nextUnless(prediction: (nextChar: string, reader: SNBTStringReader) => boolean) {
        let str = "";
        while (!this.eof() && prediction(this.peek(), this)) {
            str += this.next();
        }
        return str;
    }

    /**
     * Moves the pointer to the specified position and returns it
     * @param pos the position to move to
     * @throws Error if position is out of bounds
     */
    moveTo(pos: number): string {
        this.index = pos;
        return this.curr();
    }

    /**
     * Checks if the current position is at the end of the string
     * @returns true if the current position is at the end of the string, false otherwise
     */
    eof(): boolean {
        return this._index == this.length - 1;
    }

    /**
     * Skips all whitespace characters starting from the current position
     * and position the pointer before the first non-whitespace character
     */
    skipWhitespace(): void {
        this.nextUnless(char => /\s/.test(char));
    }

    /**
     * Expects the characters at the current position
     * @param chars the characters to expect
     * @throws Error if the position is out of bounds
     * @throws Error if the character is not one of the specified characters
     * @returns the expected character
     */
    expect<T extends string[]>(...chars: T): typeof chars[number] {
        const char = this.curr();
        if (!chars.includes(char))
            throw this.newSNBTError(`Expected character ${chars.map(c => `"${c}"`).join(" or ")} at index ${this.index}, but got "${char}"`);
        return char;
    }

    /**
     * Expects the characters at the next position and moves the pointer to the next position
     * @param chars the characters to expect
     * @throws Error if the position is out of bounds
     * @throws Error if the character is not one of the specified characters
     * @returns the expected character
     */
    expectNext<T extends string[]>(...chars: T): typeof chars[number] {
        this.next();
        return this.expect(...chars);
    }

    newSNBTError(message: string): SNBTError {
        return new SNBTError(message, this.string, this.index);
    }
}