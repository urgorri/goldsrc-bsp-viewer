export interface WadEntry {
    name: string;
    width: number;
    height: number;
    data: Uint8Array; // Raw indexed data
    palette: Uint8Array; // 768 bytes (256 * 3)
}

export class WadParser {
    private view: DataView;

    constructor(buffer: ArrayBuffer) {
        this.view = new DataView(buffer);
    }

    public parse(): Map<string, WadEntry> {
        const magic = String.fromCharCode(
            this.view.getUint8(0),
            this.view.getUint8(1),
            this.view.getUint8(2),
            this.view.getUint8(3)
        );

        if (magic !== 'WAD3') {
            throw new Error(`Not a WAD3 file: ${magic}`);
        }

        const numEntries = this.view.getInt32(4, true);
        const dirOffset = this.view.getInt32(8, true);

        const textures = new Map<string, WadEntry>();

        for (let i = 0; i < numEntries; i++) {
            const entryOff = dirOffset + i * 32;
            const offset = this.view.getInt32(entryOff, true);
            const type = this.view.getUint8(entryOff + 12);

            let name = "";
            for (let j = 0; j < 16; j++) {
                const char = this.view.getUint8(entryOff + 16 + j);
                if (char === 0) break;
                name += String.fromCharCode(char);
            }

            // Only care about miptex (0x43)
            if (type === 0x43) {
                try {
                    const texture = this.parseMiptex(offset, name);
                    textures.set(name.toLowerCase(), texture);
                } catch (e) {
                    console.error(`[WadParser] Failed to parse texture ${name}:`, e);
                }
            }
        }

        return textures;
    }

    public static parseMiptexFromBuffer(view: DataView, offset: number, name: string): WadEntry | null {
        try {
            const width = view.getUint32(offset + 16, true);
            const height = view.getUint32(offset + 20, true);

            const mipOffsets = [
                view.getUint32(offset + 24, true),
                view.getUint32(offset + 28, true),
                view.getUint32(offset + 32, true),
                view.getUint32(offset + 36, true)
            ];

            if (mipOffsets[0] === 0) return null;

            const mip3Size = Math.floor(width / 8) * Math.floor(height / 8);
            const paletteOffsetStart = offset + mipOffsets[3] + mip3Size;

            const palette = new Uint8Array(view.buffer, paletteOffsetStart + 2, 768);
            const dataSize = width * height;
            const data = new Uint8Array(view.buffer, offset + mipOffsets[0], dataSize);

            return {
                name,
                width,
                height,
                data: new Uint8Array(data),
                palette: new Uint8Array(palette)
            };
        } catch (e) {
            console.warn(`[WadParser] Failed to parse miptex ${name} at offset ${offset}:`, e);
            return null;
        }
    }

    private parseMiptex(offset: number, name: string): WadEntry {
        const entry = WadParser.parseMiptexFromBuffer(this.view, offset, name);
        if (!entry) {
            throw new Error(`Invalid miptex entry for ${name}`);
        }
        return entry;
    }
}
