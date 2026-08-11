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
});
