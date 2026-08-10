import { describe, it, expect, beforeEach } from 'vitest';
import { FgdParser } from '../FgdParser';

describe('FgdParser', () => {
    let parser: FgdParser;

    beforeEach(() => {
        parser = new FgdParser();
    });

    it('should return an empty map for empty text', () => {
        const result = parser.parse('');
        expect(result.size).toBe(0);
    });

    it('should handle a basic class without color', () => {
        const text = `@PointClass base(Targetname, Target) = info_player_start : "Player start" []`;
        const result = parser.parse(text);

        expect(result.size).toBe(1);
        expect(result.get('info_player_start')).toEqual({
            name: 'info_player_start',
            type: 'PointClass',
            color: undefined
        });
    });

    it('should handle a basic class with color', () => {
        const text = `@PointClass base(Targetname, Target) color(0 255 0) = info_player_start : "Player start" []`;
        const result = parser.parse(text);

        expect(result.size).toBe(1);
        expect(result.get('info_player_start')).toEqual({
            name: 'info_player_start',
            type: 'PointClass',
            color: [0, 255, 0]
        });
    });

    it('should not parse size even if provided', () => {
        const text = `@PointClass base(Targetname, Target) color(0 255 0) size(-8 -8 -8, 8 8 8) = info_player_start : "Player start" []`;
        const result = parser.parse(text);

        expect(result.size).toBe(1);
        expect(result.get('info_player_start')).toEqual({
            name: 'info_player_start',
            type: 'PointClass',
            color: [0, 255, 0]
        });
        expect(result.get('info_player_start')?.size).toBeUndefined();
    });

    it('should handle multiple classes correctly', () => {
        const text = `
            @PointClass base(Targetname, Target) color(0 255 0) = info_player_start : "Player start" []
            @SolidClass = func_wall : "Basic solid wall" []
            @PointClass color(255 0 0) = light : "Invisible light source" []
        `;
        const result = parser.parse(text);

        expect(result.size).toBe(3);

        expect(result.get('info_player_start')).toEqual({
            name: 'info_player_start',
            type: 'PointClass',
            color: [0, 255, 0]
        });

        expect(result.get('func_wall')).toEqual({
            name: 'func_wall',
            type: 'SolidClass',
            color: undefined
        });

        expect(result.get('light')).toEqual({
            name: 'light',
            type: 'PointClass',
            color: [255, 0, 0]
        });
    });
});
