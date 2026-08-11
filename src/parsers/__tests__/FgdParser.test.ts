import { describe, it, expect } from 'vitest';
import { FgdParser } from '../FgdParser';

describe('FgdParser', () => {
    it('should correctly parse regular class definitions', () => {
        const parser = new FgdParser();
        const text = `@PointClass base(Targetname, Target) color(0 255 0) size(-8 -8 -8, 8 8 8) = info_player_start : "Player start" []\n@SolidClass = func_wall`;
        const result = parser.parse(text);

        expect(result.size).toBe(2);

        const playerStart = result.get('info_player_start');
        expect(playerStart).toBeDefined();
        expect(playerStart?.name).toBe('info_player_start');
        expect(playerStart?.type).toBe('PointClass');
        expect(playerStart?.color).toEqual([0, 255, 0]);
        expect(playerStart?.size).toEqual([[-8, -8, -8], [8, 8, 8]]);

        const funcWall = result.get('func_wall');
        expect(funcWall).toBeDefined();
        expect(funcWall?.name).toBe('func_wall');
        expect(funcWall?.type).toBe('SolidClass');
        expect(funcWall?.color).toBeUndefined();
    });

    it('should fail quickly on ReDoS attempt (no catastrophic backtracking)', () => {
        const parser = new FgdParser();

        // Generate a very long string without an '=' sign that might cause ReDoS with .*?
        const longString = '@PointClass ' + ' '.repeat(50000) + ' no equals sign here';

        const startTime = performance.now();
        const result = parser.parse(longString);
        const endTime = performance.now();

        // Ensure no matches were found
        expect(result.size).toBe(0);

        // Ensure the operation took less than 100ms (should be much faster without catastrophic backtracking)
        expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle empty or invalid input without crashing', () => {
        const parser = new FgdParser();

        expect(parser.parse('').size).toBe(0);
        expect(parser.parse('   \n\t  ').size).toBe(0);
        // @NotAClass will match \w+Class resulting in a class. So test something else to avoid matching \w+Class.
        expect(parser.parse('@NotValid = something').size).toBe(0);
        expect(parser.parse('@PointClass missing equals string').size).toBe(0);
    });

    it('should correctly parse sizes and colors with varying whitespace', () => {
        const parser = new FgdParser();
        const text = `@PointClass color(  255   128 0  ) size( -16   -16  -16 ,   16 16   16 ) = weird_spacing_class : "Test" []`;
        const result = parser.parse(text);

        expect(result.size).toBe(1);
        const weirdClass = result.get('weird_spacing_class');
        expect(weirdClass?.color).toEqual([255, 128, 0]);
        expect(weirdClass?.size).toEqual([[-16, -16, -16], [16, 16, 16]]);
    });

    it('should safely ignore badly formatted size or color', () => {
        const parser = new FgdParser();
        const text = `@PointClass color(255 128) size(-16 -16 -16, 16 16) = bad_format_class : "Test" []`;
        const result = parser.parse(text);

        expect(result.size).toBe(1);
        const badClass = result.get('bad_format_class');
        // Because regex requires 3 numbers for color and 6 for size, these won't match and should be undefined
        expect(badClass?.color).toBeUndefined();
        expect(badClass?.size).toBeUndefined();
    });
});
