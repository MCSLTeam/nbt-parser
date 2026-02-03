export const SNBTEscapeCharacters: [string, string][] = [
    ["\\", String.raw`\\`],
    ["\"", String.raw`\"`],
    ["'", String.raw`\'`],
    ["\r", String.raw`\r`],
    ["\n", String.raw`\n`],
    ["\b", String.raw`\b`],
    [" ", String.raw`\s`],
    ["\t", String.raw`\t`],
    ["\f", String.raw`\f`],
];

export function escapeString(string: string, quote?: "\"" | "'"): string {
    if (string.includes("\\"))
        return string.split("\\").map(s => escapeString(s, quote)).join(String.raw`\\`);
    for (const [char, escape] of SNBTEscapeCharacters) {
        if (char != " " && ((char == "'" || char == "\"") && quote == char)) {
            string = string.replaceAll(char, escape);
        }
    }
    for (let i = 0x00; i <= 0x1F; i++) {
        string.replaceAll(String.fromCodePoint(i), String.raw`\x` + toHexString(i));
    }
    return string;
}

export function unescapeString(string: string): string {
    if (string.includes(String.raw`\\`))
        return string.split(String.raw`\\`).map(unescapeString).join("\\");
    for (const [char, escape] of SNBTEscapeCharacters) {
        string = string.replaceAll(escape, char);
    }
    string = string.replaceAll(/\\x([\da-fA-F]{2})/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
    string = string.replaceAll(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
    string = string.replaceAll(/\\U([0-9a-fA-F]{8})/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
    // TODO: Support \N{UnicodeName}
    return string;
}

export function toHexString(number: number) {
    return number.toString(16).toUpperCase();
}