export interface FgdClass {
    name: string;
    type: string;
    color?: [number, number, number];
    size?: [[number, number, number], [number, number, number]];
}

export class FgdParser {
    public parse(text: string): Map<string, FgdClass> {
        const classes = new Map<string, FgdClass>();
        // Simple regex-based parsing for colors and class names
        // Example: @PointClass base(Targetname, Target) color(0 255 0) size(-8 -8 -8, 8 8 8) = info_player_start : "Player start" []

        const classRegex = /@(\w+Class)[^=]*=\s*(\w+)/g;
        let match;

        while ((match = classRegex.exec(text)) !== null) {
            const type = match[1];
            const name = match[2];

            // Find the full definition block for this class
            const startIdx = match.index;
            const endIdx = text.indexOf('=', startIdx);
            const header = text.substring(startIdx, endIdx);

            const colorMatch = header.match(/color\((\d+)\s+(\d+)\s+(\d+)\)/);
            const color: [number, number, number] | undefined = colorMatch
                ? [parseInt(colorMatch[1]), parseInt(colorMatch[2]), parseInt(colorMatch[3])]
                : undefined;

            classes.set(name, { name, type, color });
        }

        return classes;
    }
}
