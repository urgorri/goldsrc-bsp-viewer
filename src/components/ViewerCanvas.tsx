import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { MapRenderer } from '../engine/MapRenderer';
import { Navigator } from '../engine/Navigator';

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
    const mapRendererRef = useRef<MapRenderer | null>(null);
    const navigatorRef = useRef<Navigator | null>(null);
    
    const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
    const cameraRef = useRef<THREE.PerspectiveCamera>(new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000));
    const raycaster = useRef(new THREE.Raycaster());
    const clock = useRef(new THREE.Clock());

    useImperativeHandle(ref, () => ({
        loadMap: async (bspFile: File, wadFiles: File[], fgdFiles: File[]) => {
            if (!mapRendererRef.current) return;
            
            try {
                const bspBuffer = await bspFile.arrayBuffer();
                const wadBuffers: ArrayBuffer[] = await Promise.all(wadFiles.map(f => f.arrayBuffer()));
                const fgdTexts = await Promise.all(fgdFiles.map(f => f.text()));
                const combinedFgd = fgdTexts.join("\n");

                await mapRendererRef.current.loadMap(bspBuffer, wadBuffers, combinedFgd);

                // Re-apply visibility settings to the new geometry/entities
                mapRendererRef.current.setPvsEnabled(pvsEnabled);
                mapRendererRef.current.setEntitiesVisible(showPointEntities);
                mapRendererRef.current.setBrushEntitiesVisible(showBrushEntities);
                mapRendererRef.current.setBrushWireframesVisible(showBrushWireframes);
                mapRendererRef.current.setAxesVisible(showAxes);
                mapRendererRef.current.setAaaTriggerOpacity(aaaTriggerOpacity);
                mapRendererRef.current.setEntityConnectionsMode(entityConnectionsMode);
                mapRendererRef.current.setTextureFiltering(textureFiltering);
                mapRendererRef.current.setLightmapFiltering(lightmapFiltering);
            } catch (error) {
                console.error("Load failed:", error);
                throw error;
            }
        },
        resetView: () => {
            if (cameraRef.current) {
                cameraRef.current.position.set(0, 100, 0);
                cameraRef.current.rotation.set(0, 0, 0);
            }
        }
    }));

    // Handle visibility changes
    useEffect(() => {
        if (mapRendererRef.current) {
            mapRendererRef.current.setPvsEnabled(pvsEnabled);
        }
    }, [pvsEnabled]);

    useEffect(() => {
        if (mapRendererRef.current) {
            mapRendererRef.current.setEntitiesVisible(showPointEntities);
        }
    }, [showPointEntities]);

    useEffect(() => {
        if (mapRendererRef.current) {
            mapRendererRef.current.setBrushEntitiesVisible(showBrushEntities);
        }
    }, [showBrushEntities]);

    useEffect(() => {
        if (mapRendererRef.current) {
            mapRendererRef.current.setBrushWireframesVisible(showBrushWireframes);
        }
    }, [showBrushWireframes]);

    useEffect(() => {
        if (mapRendererRef.current) {
            mapRendererRef.current.setAxesVisible(showAxes);
        }
    }, [showAxes]);

    useEffect(() => {
        if (mapRendererRef.current) {
            mapRendererRef.current.setAaaTriggerOpacity(aaaTriggerOpacity);
        }
    }, [aaaTriggerOpacity]);

    useEffect(() => {
        if (mapRendererRef.current) {
            mapRendererRef.current.setEntityConnectionsMode(entityConnectionsMode);
        }
    }, [entityConnectionsMode]);

    useEffect(() => {
        if (mapRendererRef.current) {
            mapRendererRef.current.setTextureFiltering(textureFiltering);
        }
    }, [textureFiltering]);

    useEffect(() => {
        if (mapRendererRef.current) {
            mapRendererRef.current.setLightmapFiltering(lightmapFiltering);
        }
    }, [lightmapFiltering]);

    useEffect(() => {
        if (mapRendererRef.current) {
            if (selectedEntity) {
                mapRendererRef.current.highlightEntity(selectedEntity);
            } else {
                mapRendererRef.current.clearHighlight();
            }
            // Always update connections mode logic because it might depend on selectedEntity
            mapRendererRef.current.setEntityConnectionsMode(entityConnectionsMode);
        }
    }, [selectedEntity, entityConnectionsMode]);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = sceneRef.current;
        scene.background = new THREE.Color(0x050505);

        const camera = cameraRef.current;
        camera.position.set(0, 100, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        containerRef.current.appendChild(renderer.domElement);

        const controls = new PointerLockControls(camera, renderer.domElement);
        scene.add(controls.object);

        const navigator = new Navigator(camera);
        navigatorRef.current = navigator;

        controls.addEventListener('lock', () => {
            navigator.enabled = true;
            onLockChange?.(true);
        });
        controls.addEventListener('unlock', () => {
            navigator.enabled = false;
            onLockChange?.(false);
        });

        mapRendererRef.current = new MapRenderer(scene, onProgress);

        const animate = () => {
            requestAnimationFrame(animate);
            const delta = clock.current.getDelta();

            navigator.update(delta);

            if (mapRendererRef.current) {
                mapRendererRef.current.updateVisibility(camera.position);
            }

            renderer.render(scene, camera);
        };
        const animationId = requestAnimationFrame(animate);

        const handleResize = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        const handleClick = (_e: MouseEvent) => {
            if (controls.isLocked) {
                raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);

                // Exclude entity connections from raycasting
                const objectsToIntersect = scene.children.filter(obj => obj.name !== "entity_connections" && obj.name !== "selection_highlight");

                const intersects = raycaster.current.intersectObjects(objectsToIntersect, true);
                if (intersects.length > 0) {
                    const obj = intersects[0].object;
                    // Check if the object is visible before allowing selection
                    let current: THREE.Object3D | null = obj;
                    let visible = true;
                    while (current) {
                        if (!current.visible) {
                            visible = false;
                            break;
                        }
                        current = current.parent;
                    }

                    let entity = null;
                    let search: THREE.Object3D | null = obj;
                    while (search) {
                        if (search.userData.entity) {
                            entity = search.userData.entity;
                            break;
                        }
                        search = search.parent;
                    }

                    if (visible && entity) {
                        onEntitySelect(entity);
                    } else {
                        // Clicked on something else (world geometry)
                        onEntitySelect(null);
                    }
                } else {
                    // Clicked on nothing (empty space)
                    onEntitySelect(null);
                }
            } else {
                try {
                    controls.lock();
                } catch (err) {
                    console.warn("Pointer lock failed:", err);
                }
            }
        };
        renderer.domElement.addEventListener('click', handleClick);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('click', handleClick);
            navigator.dispose();
            containerRef.current?.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, [onEntitySelect]);

    return (
        <div className="w-full h-full overflow-hidden" ref={containerRef} />
    );
});
