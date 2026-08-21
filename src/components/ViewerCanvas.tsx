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
                await viewerRef.current.loadMapFromFiles(bspFile, wadFiles, fgdFiles);
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

    const onEntitySelectRef = useRef(onEntitySelect);
    const onLockChangeRef = useRef(onLockChange);
    const onProgressRef = useRef(onProgress);

    useEffect(() => {
        onEntitySelectRef.current = onEntitySelect;
        onLockChangeRef.current = onLockChange;
        onProgressRef.current = onProgress;
    }, [onEntitySelect, onLockChange, onProgress]);

    useEffect(() => {
        if (!containerRef.current) return;

        const viewer = new BspViewer({
            container: containerRef.current,
            onEntitySelect: (ent) => onEntitySelectRef.current?.(ent),
            onLockChange: (locked) => onLockChangeRef.current?.(locked),
            onProgress: (pct, msg) => onProgressRef.current?.(pct, msg),
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [antialias]);

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
            autoPointerLock,
            onEntitySelect: (ent) => onEntitySelectRef.current?.(ent),
            onLockChange: (locked) => onLockChangeRef.current?.(locked),
            onProgress: (pct, msg) => onProgressRef.current?.(pct, msg)
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
