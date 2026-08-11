import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { BspViewer } from '../core/BspViewer';
import { BspEntity } from '../parsers/BspParser';

interface ViewerCanvasProps {
    onEntitySelect: (entity: BspEntity | null) => void;
    onLockChange?: (locked: boolean) => void;
    pvsEnabled: boolean;
    showPointEntities: boolean;
    showBrushEntities: boolean;
    showBrushWireframes: boolean;
    showAxes: boolean;
    aaaTriggerOpacity: number;
    entityConnectionsMode: 'none' | 'selected' | 'all';
    textureFiltering: boolean;
    lightmapFiltering: boolean;
    antialias?: boolean;
    showCrosshair?: boolean;
    autoPointerLock?: boolean;
    selectedEntity: BspEntity | null;
    onProgress?: (percent: number, message: string) => void;
}

export interface ViewerCanvasHandle {
    loadMap: (bspFile: File, wadFiles: File[], fgdFiles: File[]) => Promise<void>;
    resetView: () => void;
    instance: BspViewer | null;
}

export const ViewerCanvas = forwardRef<ViewerCanvasHandle, ViewerCanvasProps>(({
    onEntitySelect,
    onLockChange,
    pvsEnabled,
    showPointEntities,
    showBrushEntities,
    showBrushWireframes,
    showAxes,
    aaaTriggerOpacity,
    entityConnectionsMode,
    textureFiltering,
    lightmapFiltering,
    antialias,
    showCrosshair,
    autoPointerLock,
    selectedEntity,
    onProgress
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<BspViewer | null>(null);

    useImperativeHandle(ref, () => ({
        loadMap: async (bspFile: File, wadFiles: File[], fgdFiles: File[]) => {
            if (!viewerRef.current) return;

            try {
                const bspBuffer = await bspFile.arrayBuffer();
                const wadBuffers: ArrayBuffer[] = await Promise.all(wadFiles.map(f => f.arrayBuffer()));
                const fgdTexts = await Promise.all(fgdFiles.map(f => f.text()));
                const combinedFgd = fgdTexts.join("\n");

                await viewerRef.current.loadMap(bspBuffer, wadBuffers, combinedFgd);
            } catch (error) {
                console.error("Load failed:", error);
                throw error;
            }
        },
        resetView: () => {
            viewerRef.current?.resetView();
        },
        instance: viewerRef.current
    }));

    useEffect(() => {
        if (!containerRef.current) return;

        const viewer = new BspViewer({
            container: containerRef.current,
            onEntitySelect,
            onLockChange,
            onProgress,
            showAxes,
            pvsEnabled,
            showPointEntities,
            showBrushEntities,
            showBrushWireframes,
            aaaTriggerOpacity,
            entityConnectionsMode,
            textureFiltering,
            lightmapFiltering,
            antialias,
            showCrosshair,
            autoPointerLock
        });

        viewerRef.current = viewer;

        return () => {
            viewer.destroy();
            viewerRef.current = null;
        };
    }, [
        onEntitySelect,
        onLockChange,
        onProgress,
        pvsEnabled,
        showPointEntities,
        showBrushEntities,
        showBrushWireframes,
        showAxes,
        aaaTriggerOpacity,
        entityConnectionsMode,
        textureFiltering,
        lightmapFiltering,
        antialias,
        showCrosshair,
        autoPointerLock
    ]);

    // Consolidate all configuration props into a single effect
    useEffect(() => {
        viewerRef.current?.setOptions({
            pvsEnabled,
            showPointEntities,
            showBrushEntities,
            showBrushWireframes,
            showAxes,
            aaaTriggerOpacity,
            entityConnectionsMode,
            textureFiltering,
            lightmapFiltering,
            antialias,
            showCrosshair,
            autoPointerLock
        });
    }, [
        pvsEnabled,
        showPointEntities,
        showBrushEntities,
        showBrushWireframes,
        showAxes,
        aaaTriggerOpacity,
        entityConnectionsMode,
        textureFiltering,
        lightmapFiltering,
        antialias,
        showCrosshair,
        autoPointerLock
    ]);

    // Handle selectedEntity separately as it might be null or change frequently
    useEffect(() => {
        viewerRef.current?.setSelectedEntity(selectedEntity);
    }, [selectedEntity]);

    return (
        <div className="w-full h-full overflow-hidden" ref={containerRef} />
    );
});
