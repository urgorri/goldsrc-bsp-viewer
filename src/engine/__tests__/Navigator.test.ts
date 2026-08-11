import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { Navigator } from '../Navigator';

describe('Navigator', () => {
    let camera: THREE.Camera;
    let navigator: Navigator;

    beforeEach(() => {
        camera = new THREE.PerspectiveCamera();
        navigator = new Navigator(camera);
        // Clear all mock history and add event listeners before each test
        vi.restoreAllMocks();
    });

    afterEach(() => {
        navigator.dispose();
    });

    describe('Initialization and State', () => {
        it('initializes with enabled = false', () => {
            expect(navigator.enabled).toBe(false);
        });

        it('disposes event listeners correctly', () => {
            const addSpy = vi.spyOn(window, 'addEventListener');
            const removeSpy = vi.spyOn(window, 'removeEventListener');

            // Need a new instance to spy on constructor event registration
            const nav = new Navigator(camera);
            expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(addSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

            nav.dispose();
            expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
        });

        it('ignores keyboard input when disabled', () => {
            const startPosition = camera.position.clone();

            // Dispatch a keydown event that would normally cause movement
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));

            navigator.update(0.016);

            expect(camera.position.equals(startPosition)).toBe(true);
        });
    });

    describe('Movement', () => {
        beforeEach(() => {
            navigator.enabled = true;
        });

        it('moves forward when W is pressed', () => {
            const startPosition = camera.position.clone();

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            navigator.update(0.016);

            // Forward is -Z in Three.js default camera orientation
            expect(camera.position.z).toBeLessThan(startPosition.z);
            expect(camera.position.x).toBeCloseTo(startPosition.x);
            expect(camera.position.y).toBeCloseTo(startPosition.y);
        });

        it('moves backward when S is pressed', () => {
            const startPosition = camera.position.clone();

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
            navigator.update(0.016);

            expect(camera.position.z).toBeGreaterThan(startPosition.z);
        });

        it('moves left when A is pressed', () => {
            const startPosition = camera.position.clone();

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
            navigator.update(0.016);

            expect(camera.position.x).toBeLessThan(startPosition.x);
        });

        it('moves right when D is pressed', () => {
            const startPosition = camera.position.clone();

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
            navigator.update(0.016);

            expect(camera.position.x).toBeGreaterThan(startPosition.x);
        });

        it('moves up when Space is pressed', () => {
            const startPosition = camera.position.clone();

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
            navigator.update(0.016);

            expect(camera.position.y).toBeGreaterThan(startPosition.y);
        });

        it('moves down when ControlLeft is pressed', () => {
            const startPosition = camera.position.clone();

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ControlLeft' }));
            navigator.update(0.016);

            expect(camera.position.y).toBeLessThan(startPosition.y);
        });

        it('moves faster when sprinting', () => {
            const normalStart = camera.position.clone();
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            navigator.update(0.016);
            const normalDistance = normalStart.distanceTo(camera.position);

            // Reset
            navigator.dispose();
            camera.position.set(0, 0, 0);
            navigator = new Navigator(camera);
            navigator.enabled = true;

            const sprintStart = camera.position.clone();
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
            navigator.update(0.016);
            const sprintDistance = sprintStart.distanceTo(camera.position);

            expect(sprintDistance).toBeGreaterThan(normalDistance);
        });

        it('stops applying acceleration and decelerates when keys are released', () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            navigator.update(0.016);

            const positionAfterMove = camera.position.clone();

            // Release the key
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));

            // Wait for friction to stop the camera completely
            for (let i = 0; i < 50; i++) {
                 navigator.update(0.016);
            }

            const positionAfterStop = camera.position.clone();

            // Camera should have moved a bit more due to velocity before stopping completely
            expect(positionAfterStop.z).toBeLessThan(positionAfterMove.z);

            // But if we update again, it shouldn't move
            navigator.update(0.016);
            expect(camera.position.z).toBeCloseTo(positionAfterStop.z);
        });

        it('caps delta time to prevent huge jumps', () => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            navigator.update(0.1);
            const positionWithNormalDelta = camera.position.clone();

            // Reset
            navigator.dispose();
            camera.position.set(0, 0, 0);
            navigator = new Navigator(camera);
            navigator.enabled = true;

            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            // Pass an absurdly large delta
            navigator.update(100.0);

            // The position change should be the same as with 0.1 delta (because it's clamped to 0.1)
            expect(camera.position.z).toBeCloseTo(positionWithNormalDelta.z);
        });
    });
});
