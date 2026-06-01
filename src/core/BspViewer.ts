import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { MapRenderer } from '../engine/MapRenderer';
import { Navigator } from '../engine/Navigator';

export interface BspViewerOptions {
    container: HTMLElement;
    antialias?: boolean;
    onProgress?: (percent: number, message: string) => void;
    onEntitySelect?: (entity: any) => void;
    onLockChange?: (locked: boolean) => void;
}

export class BspViewer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: PointerLockControls;
    private navigator: Navigator;
    private mapRenderer: MapRenderer;
    private raycaster: THREE.Raycaster;
    private clock: THREE.Clock;
    private animationId: number | null = null;
    private options: BspViewerOptions;

    constructor(options: BspViewerOptions) {
        this.options = options;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);

        const width = options.container.clientWidth;
        const height = options.container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
        this.camera.position.set(0, 100, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: options.antialias ?? true });
        this.renderer.setSize(width, height);
        options.container.appendChild(this.renderer.domElement);

        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
        this.scene.add(this.controls.object);

        this.navigator = new Navigator(this.camera);
        this.raycaster = new THREE.Raycaster();
        this.clock = new THREE.Clock();

        this.mapRenderer = new MapRenderer(this.scene, options.onProgress);

        this.setupEventListeners();
        this.startAnimation();
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

        this.renderer.domElement.addEventListener('click', this.handleClick);
        window.addEventListener('resize', this.handleResize);
    }

    private handleClick = (_e: MouseEvent) => {
        if (this.controls.isLocked) {
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

            const objectsToIntersect = this.scene.children.filter(obj => 
                obj.name !== "entity_connections" && obj.name !== "selection_highlight"
            );

            const intersects = this.raycaster.intersectObjects(objectsToIntersect, true);
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
                    this.options.onEntitySelect?.(entity);
                } else {
                    this.options.onEntitySelect?.(null);
                }
            } else {
                this.options.onEntitySelect?.(null);
            }
        } else {
            try {
                this.controls.lock();
            } catch (err) {
                console.warn("Pointer lock failed:", err);
            }
        }
    };

    private handleResize = () => {
        const width = this.options.container.clientWidth;
        const height = this.options.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    };

    private startAnimation() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            const delta = this.clock.getDelta();

            this.navigator.update(delta);
            this.mapRenderer.updateVisibility(this.camera.position);
            this.renderer.render(this.scene, this.camera);
        };
        this.animationId = requestAnimationFrame(animate);
    }

    public async loadMap(bspBuffer: ArrayBuffer, wadBuffers: ArrayBuffer[], fgdText: string) {
        await this.mapRenderer.loadMap(bspBuffer, wadBuffers, fgdText);
    }

    public setPvsEnabled(enabled: boolean) { this.mapRenderer.setPvsEnabled(enabled); }
    public setEntitiesVisible(visible: boolean) { this.mapRenderer.setEntitiesVisible(visible); }
    public setBrushEntitiesVisible(visible: boolean) { this.mapRenderer.setBrushEntitiesVisible(visible); }
    public setBrushWireframesVisible(visible: boolean) { this.mapRenderer.setBrushWireframesVisible(visible); }
    public setAxesVisible(visible: boolean) { this.mapRenderer.setAxesVisible(visible); }
    public setAaaTriggerOpacity(opacity: number) { this.mapRenderer.setAaaTriggerOpacity(opacity); }
    public setEntityConnectionsMode(mode: 'none' | 'selected' | 'all') { this.mapRenderer.setEntityConnectionsMode(mode); }
    public setTextureFiltering(enabled: boolean) { this.mapRenderer.setTextureFiltering(enabled); }
    public setLightmapFiltering(enabled: boolean) { this.mapRenderer.setLightmapFiltering(enabled); }
    
    public highlightEntity(entity: any) {
        if (entity) {
            this.mapRenderer.highlightEntity(entity);
        } else {
            this.mapRenderer.clearHighlight();
        }
    }

    public resetView() {
        this.camera.position.set(0, 100, 0);
        this.camera.rotation.set(0, 0, 0);
    }

    public destroy() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.handleResize);
        this.renderer.domElement.removeEventListener('click', this.handleClick);
        this.navigator.dispose();
        this.options.container.removeChild(this.renderer.domElement);
        this.renderer.dispose();
    }
}
