import { describe, it, expect } from 'vitest';
import { BspParser, HEADER_LUMPS, LUMP_ENTITIES } from '../BspParser';

function createMockBspBuffer(entityText: string): ArrayBuffer {
    const textEncoder = new TextEncoder();
    const entityBytes = textEncoder.encode(entityText);
    const headerSize = 4 + HEADER_LUMPS * 8;
    const totalSize = headerSize + entityBytes.length;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Write BSP version
    view.setInt32(0, 30, true);

    // Initialize all lumps to 0 offset, 0 length
    for (let i = 0; i < HEADER_LUMPS; i++) {
        view.setInt32(4 + i * 8, 0, true); // offset
        view.setInt32(8 + i * 8, 0, true); // length
    }

    // Set entity lump
    view.setInt32(4 + LUMP_ENTITIES * 8, headerSize, true);
    view.setInt32(8 + LUMP_ENTITIES * 8, entityBytes.length, true);

    // Write entity data
    const uint8View = new Uint8Array(buffer);
    uint8View.set(entityBytes, headerSize);

    return buffer;
}

describe('BspParser.parseEntities', () => {
    it('should parse a single entity with multiple properties', () => {
        const entityText = `{
"classname" "worldspawn"
"message" "Welcome to Half-Life"
"skyname" "desert"
}`;
        const buffer = createMockBspBuffer(entityText);
        const parser = new BspParser(buffer);
        const bsp = parser.parse();

        expect(bsp.entities.length).toBe(1);
        expect(bsp.entities[0]).toEqual({
            classname: 'worldspawn',
            message: 'Welcome to Half-Life',
            skyname: 'desert'
        });
    });

    it('should parse multiple entities', () => {
        const entityText = `{
"classname" "worldspawn"
}
{
"classname" "info_player_start"
"origin" "0 0 0"
}`;
        const buffer = createMockBspBuffer(entityText);
        const parser = new BspParser(buffer);
        const bsp = parser.parse();

        expect(bsp.entities.length).toBe(2);
        expect(bsp.entities[0].classname).toBe('worldspawn');
        expect(bsp.entities[1].classname).toBe('info_player_start');
        expect(bsp.entities[1].origin).toBe('0 0 0');
    });

    it('should return empty array for empty lump', () => {
        const buffer = createMockBspBuffer('');
        const parser = new BspParser(buffer);
        const bsp = parser.parse();

        expect(bsp.entities.length).toBe(0);
    });

    it('should handle whitespace and empty lines properly', () => {
        const entityText = `

{
   "classname"   "light"
   "light"       "255 255 255"
}

`;
        const buffer = createMockBspBuffer(entityText);
        const parser = new BspParser(buffer);
        const bsp = parser.parse();

        expect(bsp.entities.length).toBe(1);
        expect(bsp.entities[0].classname).toBe('light');
        expect(bsp.entities[0].light).toBe('255 255 255');
    });

    it('should ignore entities missing a classname', () => {
        const entityText = `{
"somekey" "somevalue"
}`;
        const buffer = createMockBspBuffer(entityText);
        const parser = new BspParser(buffer);
        const bsp = parser.parse();

        expect(bsp.entities.length).toBe(0);
    });
});
