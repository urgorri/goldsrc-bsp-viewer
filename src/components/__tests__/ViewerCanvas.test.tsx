// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ViewerCanvas, ViewerCanvasHandle } from '../ViewerCanvas';

const mockLoadMap = vi.fn();
const mockDestroy = vi.fn();
const mockSetOptions = vi.fn();
const mockSetSelectedEntity = vi.fn();
const mockResetView = vi.fn();

vi.mock('../../core/BspViewer', () => {
    return {
        BspViewer: vi.fn().mockImplementation(function() {
            return {
                loadMap: mockLoadMap,
                destroy: mockDestroy,
                setOptions: mockSetOptions,
                setSelectedEntity: mockSetSelectedEntity,
                resetView: mockResetView
            };
        })
    };
});

describe('ViewerCanvas', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const defaultProps = {
        onEntitySelect: vi.fn(),
        pvsEnabled: true,
        showPointEntities: true,
        showBrushEntities: true,
        showBrushWireframes: true,
        showAxes: true,
        aaaTriggerOpacity: 0.5,
        entityConnectionsMode: "none" as const,
        textureFiltering: true,
        lightmapFiltering: true,
        selectedEntity: null,
    };

    it('loadMap successfully loads bsp, wad, and fgd files', async () => {
        let canvasRef: ViewerCanvasHandle | null = null;

        const TestWrapper = () => {
            return <ViewerCanvas
                ref={(ref) => { canvasRef = ref; }}
                {...defaultProps}
            />;
        };

        render(<TestWrapper />);
        expect(canvasRef).not.toBeNull();

        const bspBuffer = new ArrayBuffer(8);
        const wadBuffer1 = new ArrayBuffer(4);
        const wadBuffer2 = new ArrayBuffer(4);

        const mockBspFile = {
            arrayBuffer: vi.fn().mockResolvedValue(bspBuffer)
        } as unknown as File;

        const mockWadFile1 = {
            arrayBuffer: vi.fn().mockResolvedValue(wadBuffer1)
        } as unknown as File;

        const mockWadFile2 = {
            arrayBuffer: vi.fn().mockResolvedValue(wadBuffer2)
        } as unknown as File;

        const mockFgdFile1 = {
            text: vi.fn().mockResolvedValue("fgd1 content")
        } as unknown as File;

        const mockFgdFile2 = {
            text: vi.fn().mockResolvedValue("fgd2 content")
        } as unknown as File;

        await canvasRef!.loadMap(mockBspFile, [mockWadFile1, mockWadFile2], [mockFgdFile1, mockFgdFile2]);

        expect(mockBspFile.arrayBuffer).toHaveBeenCalled();
        expect(mockWadFile1.arrayBuffer).toHaveBeenCalled();
        expect(mockWadFile2.arrayBuffer).toHaveBeenCalled();
        expect(mockFgdFile1.text).toHaveBeenCalled();
        expect(mockFgdFile2.text).toHaveBeenCalled();

        expect(mockLoadMap).toHaveBeenCalledWith(
            bspBuffer,
            [wadBuffer1, wadBuffer2],
            "fgd1 content\nfgd2 content"
        );
    });

    it('loadMap throws and logs error when file reading fails', async () => {
        let canvasRef: ViewerCanvasHandle | null = null;

        const TestWrapper = () => {
            return <ViewerCanvas
                ref={(ref) => { canvasRef = ref; }}
                {...defaultProps}
            />;
        };

        render(<TestWrapper />);
        expect(canvasRef).not.toBeNull();

        const mockFile = {
            arrayBuffer: vi.fn().mockRejectedValue(new Error('Failed to read file'))
        } as unknown as File;

        const originalConsoleError = console.error;
        console.error = vi.fn();

        await expect(canvasRef!.loadMap(mockFile, [], [])).rejects.toThrow('Failed to read file');

        expect(console.error).toHaveBeenCalledWith('Load failed:', expect.any(Error));

        console.error = originalConsoleError;
    });

    it('loadMap gracefully does nothing if viewerRef is not initialized', async () => {
        let canvasRef: ViewerCanvasHandle | null = null;

        const TestWrapper = () => {
            return <ViewerCanvas
                ref={(ref) => { canvasRef = ref; }}
                {...defaultProps}
            />;
        };

        const { unmount } = render(<TestWrapper />);
        expect(canvasRef).not.toBeNull();

        const savedRef = canvasRef!;
        // Unmounting should trigger cleanup and set viewerRef.current = null
        unmount();

        const mockFile = {
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        } as unknown as File;

        // Calling loadMap should safely return and do nothing
        await savedRef.loadMap(mockFile, [], []);

        expect(mockFile.arrayBuffer).not.toHaveBeenCalled();
        expect(mockLoadMap).not.toHaveBeenCalled();
    });

    it('resetView delegates to viewer instance', () => {
        let canvasRef: ViewerCanvasHandle | null = null;

        const TestWrapper = () => {
            return <ViewerCanvas
                ref={(ref) => { canvasRef = ref; }}
                {...defaultProps}
            />;
        };

        render(<TestWrapper />);
        expect(canvasRef).not.toBeNull();

        canvasRef!.resetView();

        expect(mockResetView).toHaveBeenCalled();
    });
});
