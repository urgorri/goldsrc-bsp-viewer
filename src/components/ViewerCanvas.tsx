import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { BspViewer } from '../engine/BspViewer';

interface ViewerCanvasProps {
    onEntitySelect: (entity: any) => void;
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
    selectedEntity: any;
    onProgress?: (percent: number, message: string) => void;
}

export interface ViewerCanvasHandle {
    loadMap: (bspFile: File, wadFiles: File[], fgdFiles: File[]) => Promise<void>;
    resetView: () => void;
}

export const ViewerCanvas = forwardRef<ViewerCanvasHandle, ViewerCanvasProps>(({ onEntitySelect, onLockChange, pvsEnabled, showPointEntities, showBrushEntities, showBrushWireframes, showAxes, aaaTriggerOpacity, entityConnectionsMode, textureFiltering, lightmapFiltering, selectedEntity, onProgress }, ref) => {
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

                // Re-apply visibility settings to the new geometry/entities
                viewerRef.current.setPvsEnabled(pvsEnabled);
                viewerRef.current.setPointEntitiesVisible(showPointEntities);
                viewerRef.current.setBrushEntitiesVisible(showBrushEntities);
                viewerRef.current.setBrushWireframesVisible(showBrushWireframes);
                viewerRef.current.setAxesVisible(showAxes);
                viewerRef.current.setAaaTriggerOpacity(aaaTriggerOpacity);
                viewerRef.current.setEntityConnectionsMode(entityConnectionsMode);
                viewerRef.current.setTextureFiltering(textureFiltering);
                viewerRef.current.setLightmapFiltering(lightmapFiltering);
                viewerRef.current.setSelectedEntity(selectedEntity);
            } catch (error) {
                console.error("Load failed:", error);
                throw error;
            }
        },
        resetView: () => {
            viewerRef.current?.resetView();
        }
    }));

    useEffect(() => {
        if (!containerRef.current) return;

        const viewer = new BspViewer({
            container: containerRef.current,
            onEntitySelect,
            onLockChange,
            onProgress,
            showAxes
        });

        viewerRef.current = viewer;

        return () => {
            viewer.dispose();
            viewerRef.current = null;
        };
    }, [onEntitySelect, onLockChange, onProgress]);

    // Handle visibility changes
    useEffect(() => {
        viewerRef.current?.setPvsEnabled(pvsEnabled);
    }, [pvsEnabled]);

    useEffect(() => {
        viewerRef.current?.setPointEntitiesVisible(showPointEntities);
    }, [showPointEntities]);

    useEffect(() => {
        viewerRef.current?.setBrushEntitiesVisible(showBrushEntities);
    }, [showBrushEntities]);

    useEffect(() => {
        viewerRef.current?.setBrushWireframesVisible(showBrushWireframes);
    }, [showBrushWireframes]);

    useEffect(() => {
        viewerRef.current?.setAxesVisible(showAxes);
    }, [showAxes]);

    useEffect(() => {
        viewerRef.current?.setAaaTriggerOpacity(aaaTriggerOpacity);
    }, [aaaTriggerOpacity]);

    useEffect(() => {
        viewerRef.current?.setEntityConnectionsMode(entityConnectionsMode);
    }, [entityConnectionsMode]);

    useEffect(() => {
        viewerRef.current?.setTextureFiltering(textureFiltering);
    }, [textureFiltering]);

    useEffect(() => {
        viewerRef.current?.setLightmapFiltering(lightmapFiltering);
    }, [lightmapFiltering]);

    useEffect(() => {
        viewerRef.current?.setSelectedEntity(selectedEntity);
        // Always update connections mode logic because it might depend on selectedEntity
        viewerRef.current?.setEntityConnectionsMode(entityConnectionsMode);
    }, [selectedEntity, entityConnectionsMode]);

    return (
        <div className="w-full h-full overflow-hidden" ref={containerRef} />
    );
});
