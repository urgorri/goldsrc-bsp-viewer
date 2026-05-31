import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { MapRenderer } from './MapRenderer';
import { Navigator } from './Navigator';

export interface BspViewerOptions {
    container: HTMLElement;
    backgroundColor?: number;
    showAxes?: boolean;
    onEntitySelect?: (entity: any) => void;
    onProgress?: (percent: number, message: string) => void;
    onLockChange?: (locked: boolean) => void;
}

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

    private onResizeBound: () => void;
    private onClickBound: (e: MouseEvent) => void;

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
        this.mapRenderer = new MapRenderer(this.scene, options.onProgress);
        this.clock = new THREE.Clock();

        this.onResizeBound = this.onResize.bind(this);
        this.onClickBound = this.onClick.bind(this);

        this.setupEventListeners();
        this.startAnimate();

        if (options.showAxes !== undefined) {
            this.mapRenderer.setAxesVisible(options.showAxes);
        }
    }

    private setupEventListeners() {
        this.controls.addEventListener('lock', () => {
            this.navigator.enabled = true;
            this.options.onLockChange?.(true);
        });

        this.controls.addEventListener('unlock', () => {
            this.navigator.enabled = false;
            this.options.onLockChange?.(false);
        });

        window.addEventListener('resize', this.onResizeBound);
        this.container.addEventListener('click', this.onClickBound);
    }

    private onResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
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

        // Robust logic from original implementation
        const objectsToIntersect = this.scene.children.filter(obj =>
            obj.name !== "entity_connections" &&
            obj.name !== "selection_highlight" &&
            obj.name !== "origin_axes"
        );

        const intersects = raycaster.intersectObjects(objectsToIntersect, true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;

            // Check visibility
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
                this.options.onEntitySelect?.(null);
                this.mapRenderer.clearHighlight();
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

            if (entity) {
                this.options.onEntitySelect?.(entity);
                this.mapRenderer.highlightEntity(entity);
            } else {
                this.options.onEntitySelect?.(null);
                this.mapRenderer.clearHighlight();
            }
        } else {
            this.options.onEntitySelect?.(null);
            this.mapRenderer.clearHighlight();
        }
    }

    public async loadMap(bspBuffer: ArrayBuffer, wadBuffers: ArrayBuffer[], fgdText?: string) {
        await this.mapRenderer.loadMap(bspBuffer, wadBuffers, fgdText);
    }

    public resetView() {
        this.camera.position.set(0, 500, 1000);
        this.camera.lookAt(0, 0, 0);
    }

    public dispose() {
        cancelAnimationFrame(this.requestRef);
        window.removeEventListener('resize', this.onResizeBound);
        this.container.removeEventListener('click', this.onClickBound);
        this.controls.dispose();
        this.navigator.dispose();
        this.renderer.dispose();
        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }
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

    public setSelectedEntity(entity: any) {
        if (entity) {
            this.mapRenderer.highlightEntity(entity);
        } else {
            this.mapRenderer.clearHighlight();
        }
    }
}
