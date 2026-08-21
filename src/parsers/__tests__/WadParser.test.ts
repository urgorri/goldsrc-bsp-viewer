import { describe, it, expect } from 'vitest';
import { WadParser } from '../WadParser';

describe('WadParser', () => {
    it('should throw an error for invalid magic string', () => {
        // Create a 4-byte buffer
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);

        // Write 'WAD2' as the magic string
        view.setUint8(0, 'W'.charCodeAt(0));
        view.setUint8(1, 'A'.charCodeAt(0));
        view.setUint8(2, 'D'.charCodeAt(0));
        view.setUint8(3, '2'.charCodeAt(0));

        const parser = new WadParser(buffer);

        expect(() => parser.parse()).toThrow('Not a WAD3 file: WAD2');
    });

    it('should return null for miptex with offset 0', () => {
        const buffer = new ArrayBuffer(64);
        const view = new DataView(buffer);
        view.setUint32(16, 16, true); // width
        view.setUint32(20, 16, true); // height
        view.setUint32(24, 0, true);  // mipOffsets[0] = 0

        const result = WadParser.parseMiptexFromBuffer(view, 0, 'test');
        expect(result).toBeNull();
    });
});
