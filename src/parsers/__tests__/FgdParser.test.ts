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
});
