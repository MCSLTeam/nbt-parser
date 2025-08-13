export const SNBTEscapeCharacters: [string, string][] = [
    ["\\", "\\\\"],
    ["\"", "\\\""],
    ["\'", "\\\'"],
    ["\r", "\\r"],
    ["\n", "\\n"],
    ["\b", "\\b"],
    [" ", "\\s"],
    ["\t", "\\t"],
    ["\f", "\\f"],
];

export function escapeString(string: string, quotes?: "\"" | "'"): string {
    for (const [char, escape] of SNBTEscapeCharacters) {
        if (char != " " && ((char != "'" && char != "\"") || quotes == char)) {
            string = string.replaceAll(char, escape);
        }
    }
    for (let i = 0x00; i <= 0x1F; i++) {
        string.replaceAll(String.fromCharCode(i), "\\x" + toHexString(i));
    }
    return string;
}

export function unescapeString(string: string): string {
    for (const [char, escape] of SNBTEscapeCharacters) {
        string = string.replaceAll(escape, char);
    }
    string = string.replaceAll(/\\x([\da-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    string = string.replaceAll(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    string = string.replaceAll(/\\U([0-9a-fA-F]{8})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    // TODO: Support \N{UnicodeName}
    return string;
}

export function toHexString(number: number) {
    return number.toString(16).toUpperCase();
}