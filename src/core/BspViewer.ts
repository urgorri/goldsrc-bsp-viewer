import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { MapRenderer } from '../engine/MapRenderer';
import { Navigator } from '../engine/Navigator';
import { BspEntity } from '../parsers/BspParser';

export interface BspViewerOptions {
    container: HTMLElement;
    backgroundColor?: number;
    showAxes?: boolean;
    onEntitySelect?: (entity: BspEntity | null) => void;
    onProgress?: (percent: number, message: string) => void;
    onLockChange?: (locked: boolean) => void;

    // Viewport settings
    pvsEnabled?: boolean;
    showPointEntities?: boolean;
    showBrushEntities?: boolean;
    showBrushWireframes?: boolean;
    aaaTriggerOpacity?: number;
    entityConnectionsMode?: 'none' | 'selected' | 'all';
    textureFiltering?: boolean;
    lightmapFiltering?: boolean;
    antialias?: boolean;
    showCrosshair?: boolean;
    autoPointerLock?: boolean;
}

type EventCallback = (...args: any[]) => void;

export class BspViewer {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: PointerLockControls;
    private navigator: Navigator;
    private mapRenderer: MapRenderer;
    private clock: THREE.Clock;
    private requestRef: number = 0;
    private options: Required<BspViewerOptions>;

    private selectedEntity: BspEntity | null = null;
    private crosshairElement: HTMLElement | null = null;
    private mouse: THREE.Vector2 = new THREE.Vector2();

    private resizeObserver: ResizeObserver;
    private onClickBound: (e: MouseEvent) => void;
    private onMouseMoveBound: (e: MouseEvent) => void;

    private eventListeners: Map<string, Set<EventCallback>> = new Map();

    constructor(options: BspViewerOptions) {
        this.container = options.container;

        // Initialize options with defaults
        this.options = {
            container: options.container,
            backgroundColor: options.backgroundColor ?? 0x050505,
            showAxes: options.showAxes ?? true,
            onEntitySelect: options.onEntitySelect ?? (() => {}),
            onProgress: options.onProgress ?? (() => {}),
            onLockChange: options.onLockChange ?? (() => {}),
            pvsEnabled: options.pvsEnabled ?? false,
            showPointEntities: options.showPointEntities ?? true,
            showBrushEntities: options.showBrushEntities ?? true,
            showBrushWireframes: options.showBrushWireframes ?? true,
            aaaTriggerOpacity: options.aaaTriggerOpacity ?? 50,
            entityConnectionsMode: options.entityConnectionsMode ?? 'none',
            textureFiltering: options.textureFiltering ?? true,
            lightmapFiltering: options.lightmapFiltering ?? true,
            antialias: options.antialias ?? true,
            showCrosshair: options.showCrosshair ?? false,
            autoPointerLock: options.autoPointerLock ?? true
        };

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.backgroundColor);

        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        this.camera.position.set(0, 500, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: this.options.antialias });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
        this.navigator = new Navigator(this.camera);

        // Internal progress handler that emits events
        const internalProgress = (percent: number, message: string) => {
            this.emit('progress', { percent, message });
            this.options.onProgress(percent, message);
        };

        this.mapRenderer = new MapRenderer(this.scene, internalProgress);
        this.clock = new THREE.Clock();

        this.onClickBound = this.onClick.bind(this);
        this.onMouseMoveBound = this.onMouseMove.bind(this);

        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);

        this.setupEventListeners();
        this.startAnimate();

        // Apply initial options
        this.applyOptions();

        // Add initial options-based listeners if they exist
        if (options.onEntitySelect) this.addEventListener('entitySelect', options.onEntitySelect);
        if (options.onLockChange) this.addEventListener('lockChange', options.onLockChange);

        this.createCrosshair();
    }

    private createCrosshair() {
        if (!this.crosshairElement) {
            this.crosshairElement = document.createElement('div');
            this.crosshairElement.innerText = '+';
            this.crosshairElement.style.position = 'absolute';
            this.crosshairElement.style.top = '50%';
            this.crosshairElement.style.left = '50%';
            this.crosshairElement.style.transform = 'translate(-50%, -50%)';
            this.crosshairElement.style.color = 'white';
            this.crosshairElement.style.fontSize = '24px';
            this.crosshairElement.style.pointerEvents = 'none';
            this.crosshairElement.style.userSelect = 'none';
            this.crosshairElement.style.display = 'none'; // Hidden by default
            this.container.appendChild(this.crosshairElement);
        }
    }

    private updateCrosshairVisibility() {
        if (this.crosshairElement) {
            if (this.options.showCrosshair) {
                this.crosshairElement.style.display = 'block';
            } else {
                this.crosshairElement.style.display = 'none';
            }
        }
    }

    private setupEventListeners() {
        this.controls.addEventListener('lock', () => {
            this.navigator.enabled = true;
            this.updateCrosshairVisibility();
            this.emit('lockChange', true);
        });

        this.controls.addEventListener('unlock', () => {
            this.navigator.enabled = false;
            this.updateCrosshairVisibility();
            this.emit('lockChange', false);
        });

        this.container.addEventListener('click', this.onClickBound);
        this.container.addEventListener('mousemove', this.onMouseMoveBound);
    }

    private onMouseMove(event: MouseEvent) {
        if (!this.controls.isLocked) {
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }
    }

    private onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    private onClick() {
        if (!this.controls.isLocked) {
            if (this.options.autoPointerLock) {
                this.lockPointer();
            } else {
                this.handlePicking();
            }
        } else {
            this.handlePicking();
        }
    }

    public lockPointer() {
        try {
            this.controls.lock();
        } catch (err) {
            console.warn("Pointer lock failed:", err);
        }
    }

    private startAnimate() {
        const animate = () => {
            this.requestRef = requestAnimationFrame(animate);
            const delta = this.clock.getDelta();
            this.navigator.update(delta);
            this.mapRenderer.updateVisibility(this.camera.position);
            this.renderer.render(this.scene, this.camera);
        };
        this.requestRef = requestAnimationFrame(animate);
    }

    private handlePicking() {
        const raycaster = new THREE.Raycaster();

        if (this.controls.isLocked) {
            raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        } else {
            raycaster.setFromCamera(this.mouse, this.camera);
        }

        const intersects = raycaster.intersectObjects(this.mapRenderer.getPickableObjects(), true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;

            let current: THREE.Object3D | null = obj;
            let visible = true;
            while (current) {
                if (!current.visible) {
                    visible = false;
                    break;
                }
                current = current.parent;
            }

            if (!visible) {
                this.setSelectedEntity(null);
                return;
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

            this.setSelectedEntity(entity);
        } else {
            this.setSelectedEntity(null);
        }
    }

    public async loadMap(bspBuffer: ArrayBuffer, wadBuffers: ArrayBuffer[], fgdText?: string) {
        await this.mapRenderer.loadMap(bspBuffer, wadBuffers, fgdText);
        this.applyOptions();
        this.setSelectedEntity(this.selectedEntity);
    }

    public resetView() {
        this.camera.position.set(0, 500, 1000);
        this.camera.lookAt(0, 0, 0);
    }

    public destroy() {
        cancelAnimationFrame(this.requestRef);
        this.resizeObserver.disconnect();
        this.container.removeEventListener('click', this.onClickBound);
        this.container.removeEventListener('mousemove', this.onMouseMoveBound);
        this.controls.dispose();
        this.navigator.dispose();
        this.mapRenderer.dispose();
        this.renderer.dispose();

        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }

        if (this.crosshairElement && this.container.contains(this.crosshairElement)) {
            this.container.removeChild(this.crosshairElement);
            this.crosshairElement = null;
        }

        this.eventListeners.clear();
    }

    // Alias for compatibility if needed, but destroy is the preferred name now
    public dispose() {
        this.destroy();
    }

    // Event Emitter methods
    public addEventListener(event: string, callback: EventCallback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);
    }

    public removeEventListener(event: string, callback: EventCallback) {
        this.eventListeners.get(event)?.delete(callback);
    }

    private emit(event: string, ...args: any[]) {
        this.eventListeners.get(event)?.forEach(callback => callback(...args));
    }

    public setOptions(options: Partial<BspViewerOptions>) {
        this.options = { ...this.options, ...options };
        this.applyOptions();

        if (options.backgroundColor !== undefined) {
            this.scene.background = new THREE.Color(this.options.backgroundColor);
        }

        if (options.showCrosshair !== undefined) {
            this.updateCrosshairVisibility();
        }
    }

    private applyOptions() {
        this.mapRenderer.setPvsEnabled(this.options.pvsEnabled);
        this.mapRenderer.setEntitiesVisible(this.options.showPointEntities);
        this.mapRenderer.setBrushEntitiesVisible(this.options.showBrushEntities);
        this.mapRenderer.setBrushWireframesVisible(this.options.showBrushWireframes);
        this.mapRenderer.setAxesVisible(this.options.showAxes);
        this.mapRenderer.setAaaTriggerOpacity(this.options.aaaTriggerOpacity);
        this.mapRenderer.setEntityConnectionsMode(this.options.entityConnectionsMode);
        this.mapRenderer.setTextureFiltering(this.options.textureFiltering);
        this.mapRenderer.setLightmapFiltering(this.options.lightmapFiltering);
    }

    // Proxy methods to MapRenderer (kept for backward compatibility and granular control)
    public setPvsEnabled(enabled: boolean) {
        this.options.pvsEnabled = enabled;
        this.mapRenderer.setPvsEnabled(enabled);
    }
    public setPointEntitiesVisible(visible: boolean) {
        this.options.showPointEntities = visible;
        this.mapRenderer.setEntitiesVisible(visible);
    }
    public setBrushEntitiesVisible(visible: boolean) {
        this.options.showBrushEntities = visible;
        this.mapRenderer.setBrushEntitiesVisible(visible);
    }
    public setBrushWireframesVisible(visible: boolean) {
        this.options.showBrushWireframes = visible;
        this.mapRenderer.setBrushWireframesVisible(visible);
    }
    public setAxesVisible(visible: boolean) {
        this.options.showAxes = visible;
        this.mapRenderer.setAxesVisible(visible);
    }
    public setAaaTriggerOpacity(opacity: number) {
        this.options.aaaTriggerOpacity = opacity;
        this.mapRenderer.setAaaTriggerOpacity(opacity);
    }
    public setEntityConnectionsMode(mode: 'none' | 'selected' | 'all') {
        this.options.entityConnectionsMode = mode;
        this.mapRenderer.setEntityConnectionsMode(mode);
    }
    public setTextureFiltering(enabled: boolean) {
        this.options.textureFiltering = enabled;
        this.mapRenderer.setTextureFiltering(enabled);
    }
    public setLightmapFiltering(enabled: boolean) {
        this.options.lightmapFiltering = enabled;
        this.mapRenderer.setLightmapFiltering(enabled);
    }

    public setSelectedEntity(entity: BspEntity | null) {
        this.selectedEntity = entity;
        if (entity) {
            this.mapRenderer.highlightEntity(entity);
        } else {
            this.mapRenderer.clearHighlight();
        }
        // Always refresh connections if mode is 'selected'
        if (this.options.entityConnectionsMode === 'selected') {
            this.mapRenderer.setEntityConnectionsMode('selected');
        }
        this.emit('entitySelect', entity);
    }
}
