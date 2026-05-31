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
    private options: BspViewerOptions;

    private resizeObserver: ResizeObserver;
    private onClickBound: (e: MouseEvent) => void;

    private eventListeners: Map<string, Set<EventCallback>> = new Map();

    constructor(options: BspViewerOptions) {
        this.options = options;
        this.container = options.container;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(options.backgroundColor ?? 0x050505);

        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        this.camera.position.set(0, 500, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
        this.navigator = new Navigator(this.camera);

        // Internal progress handler that emits events
        const internalProgress = (percent: number, message: string) => {
            this.emit('progress', { percent, message });
            this.options.onProgress?.(percent, message);
        };

        this.mapRenderer = new MapRenderer(this.scene, internalProgress);
        this.clock = new THREE.Clock();

        this.onClickBound = this.onClick.bind(this);

        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);

        this.setupEventListeners();
        this.startAnimate();

        if (options.showAxes !== undefined) {
            this.mapRenderer.setAxesVisible(options.showAxes);
        }

        // Add initial options-based listeners if they exist
        if (options.onEntitySelect) this.addEventListener('entitySelect', options.onEntitySelect);
        if (options.onLockChange) this.addEventListener('lockChange', options.onLockChange);
    }

    private setupEventListeners() {
        this.controls.addEventListener('lock', () => {
            this.navigator.enabled = true;
            this.emit('lockChange', true);
        });

        this.controls.addEventListener('unlock', () => {
            this.navigator.enabled = false;
            this.emit('lockChange', false);
        });

        this.container.addEventListener('click', this.onClickBound);
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
            try {
                this.controls.lock();
            } catch (err) {
                console.warn("Pointer lock failed:", err);
            }
        } else {
            this.handlePicking();
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
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const objectsToIntersect = this.scene.children.filter(obj =>
            obj.name !== "entity_connections" &&
            obj.name !== "selection_highlight" &&
            obj.name !== "origin_axes"
        );

        const intersects = raycaster.intersectObjects(objectsToIntersect, true);

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
    }

    public resetView() {
        this.camera.position.set(0, 500, 1000);
        this.camera.lookAt(0, 0, 0);
    }

    public destroy() {
        cancelAnimationFrame(this.requestRef);
        this.resizeObserver.disconnect();
        this.container.removeEventListener('click', this.onClickBound);
        this.controls.dispose();
        this.navigator.dispose();
        this.mapRenderer.dispose();
        this.renderer.dispose();

        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
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

    // Proxy methods to MapRenderer
    public setPvsEnabled(enabled: boolean) { this.mapRenderer.setPvsEnabled(enabled); }
    public setPointEntitiesVisible(visible: boolean) { this.mapRenderer.setEntitiesVisible(visible); }
    public setBrushEntitiesVisible(visible: boolean) { this.mapRenderer.setBrushEntitiesVisible(visible); }
    public setBrushWireframesVisible(visible: boolean) { this.mapRenderer.setBrushWireframesVisible(visible); }
    public setAxesVisible(visible: boolean) { this.mapRenderer.setAxesVisible(visible); }
    public setAaaTriggerOpacity(opacity: number) { this.mapRenderer.setAaaTriggerOpacity(opacity); }
    public setEntityConnectionsMode(mode: 'none' | 'selected' | 'all') { this.mapRenderer.setEntityConnectionsMode(mode); }
    public setTextureFiltering(enabled: boolean) { this.mapRenderer.setTextureFiltering(enabled); }
    public setLightmapFiltering(enabled: boolean) { this.mapRenderer.setLightmapFiltering(enabled); }

    public setSelectedEntity(entity: BspEntity | null) {
        if (entity) {
            this.mapRenderer.highlightEntity(entity);
        } else {
            this.mapRenderer.clearHighlight();
        }
        this.emit('entitySelect', entity);
    }
}
