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

        console.log(`[WadParser] Parsing WAD with ${numEntries} entries`);

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

        console.log(`[WadParser] Successfully loaded ${textures.size} textures`);
        return textures;
    }

    private parseMiptex(offset: number, name: string): WadEntry {
        const width = this.view.getUint32(offset + 16, true);
        const height = this.view.getUint32(offset + 20, true);

        const mipOffsets = [
            this.view.getUint32(offset + 24, true),
            this.view.getUint32(offset + 28, true),
            this.view.getUint32(offset + 32, true),
            this.view.getUint32(offset + 36, true)
        ];

        // The palette is 256 colors * 3 bytes (RGB)
        // It's located after the last mipmap (mip3)
        const mip3Size = (width / 8) * (height / 8);
        const paletteOffsetStart = offset + mipOffsets[3] + mip3Size;
        
        // Skip 2 bytes (the number of colors, usually 256)
        const palette = new Uint8Array(this.view.buffer, paletteOffsetStart + 2, 768);
        
        const dataSize = width * height;
        const data = new Uint8Array(this.view.buffer, offset + mipOffsets[0], dataSize);

        return {
            name,
            width,
            height,
            data: new Uint8Array(data),
            palette: new Uint8Array(palette)
        };
    }
}
