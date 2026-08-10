import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { BspViewer } from '../BspViewer';

// Mock WebGLRenderer to avoid "Error creating WebGL context"
vi.mock('three', async (importOriginal) => {
    const actual = await importOriginal<typeof THREE>();
    return {
        ...actual,
        WebGLRenderer: class {
            domElement = document.createElement('canvas');
            setSize = vi.fn();
            render = vi.fn();
            dispose = vi.fn();
            setPixelRatio = vi.fn();
            setClearColor = vi.fn();
        }
    };
});

describe('BspViewer', () => {
    beforeEach(() => {
        global.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    });

    afterEach(() => {
        delete (global as any).ResizeObserver;
    });

    describe('onClick', () => {
        it('catches and logs pointer lock error when controls.lock() throws', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const container = document.createElement('div');
            const viewer = new BspViewer({ container });

            // Override controls to simulate pointer lock failure
            const mockError = new Error('Lock error');
            (viewer as any).controls = {
                isLocked: false,
                lock: vi.fn().mockImplementation(() => {
                    throw mockError;
                })
            };

            // Dispatch click event on the container to trigger onClick
            const clickEvent = new MouseEvent('click');
            container.dispatchEvent(clickEvent);

            expect(consoleWarnSpy).toHaveBeenCalledWith("Pointer lock failed:", mockError);

            consoleWarnSpy.mockRestore();
        });
    });
});
