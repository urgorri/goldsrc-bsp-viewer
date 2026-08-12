import * as THREE from 'three';
import { BspParser, BspEntity, ParsedBsp } from '../parsers/BspParser';
import { WadParser } from '../parsers/WadParser';
import { generateFaceGeometry, convertVector } from './GeometryGenerator';
import { bspShader } from './Shaders';
import { EntityRenderer } from './EntityRenderer';
import { PvsManager } from './PvsManager';

export class MapRenderer {
    private scene: THREE.Scene;
    private bsp: ParsedBsp | null = null;
    private textures: Map<string, THREE.Texture> = new Map();
    private entityRenderer: EntityRenderer;
    private entitiesGroup: THREE.Group | null = null;
    private brushEntitiesGroup: THREE.Group | null = null;
    private pvsManager: PvsManager | null = null;
    private worldGroup: THREE.Group | null = null;
    private leafToMaterials: Map<number, Set<string>> = new Map();
    private materialMeshes: Map<string, THREE.Mesh> = new Map();
    private lightmapAtlas: THREE.Texture | null = null;
    private materialCache: Map<string, THREE.ShaderMaterial> = new Map();
    private atlasWidth = 2048;
    private pickableObjects: THREE.Object3D[] = [];
    private atlasHeight = 2048;
    private faceLightmapInfo: Map<number, { x: number, y: number, w: number, h: number, minU_step: number, minV_step: number, step: number }> = new Map();
    private currentLeafIdx: number = -1;
    private pvsEnabled: boolean = false;
    private highlightGroup: THREE.Group | null = null;
    private connectionsGroup: THREE.Group | null = null;
    private brushWireframesVisible: boolean = true;
    private axesVisible: boolean = true;
    private aaaTriggerOpacity: number = 0.5;
    private entityConnectionsMode: 'none' | 'selected' | 'all' = 'none';
    private entityCenters: Map<BspEntity, THREE.Vector3> = new Map();
    private selectedEntity: BspEntity | null = null;

    private onProgress?: (percent: number, message: string) => void;

    constructor(scene: THREE.Scene, onProgress?: (percent: number, message: string) => void) {
        this.scene = scene;
        this.entityRenderer = new EntityRenderer(scene);
        this.onProgress = onProgress;
    }

    public dispose() {
        this.cleanup();
        this.pickableObjects = [];
    }

    private cleanup() {
        this.clearHighlight();
        this.clearConnections();

        if (this.worldGroup) {
            this.worldGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                }
            });
            this.scene.remove(this.worldGroup);
            this.worldGroup = null;
        }

        if (this.brushEntitiesGroup) {
            this.brushEntitiesGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                }
            });
            this.scene.remove(this.brushEntitiesGroup);
            this.brushEntitiesGroup = null;
        }

        const axes = this.scene.getObjectByName("origin_axes");
        if (axes) {
            axes.traverse((child: any) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                    else child.material.dispose();
                }
            });
            this.scene.remove(axes);
        }

        this.materialCache.forEach(m => {
            if (m.uniforms.diffuseMap.value) m.uniforms.diffuseMap.value.dispose();
            m.dispose();
        });
        this.materialCache.clear();

        this.textures.forEach(t => t.dispose());
        this.textures.clear();

        if (this.lightmapAtlas) {
            this.lightmapAtlas.dispose();
            this.lightmapAtlas = null;
        }

        this.leafToMaterials.clear();
        this.faceLightmapInfo.clear();
        this.entityCenters.clear();
    }

    public async loadMap(bspBuffer: ArrayBuffer, wadBuffers: ArrayBuffer[], fgdText?: string) {
        this.cleanup();

        this.onProgress?.(10, "Parsing BSP...");
        const parser = new BspParser(bspBuffer);
        this.bsp = parser.parse();
        this.pvsManager = new PvsManager(this.bsp);

        if (fgdText) {
            this.onProgress?.(20, "Parsing FGD...");
            await this.entityRenderer.loadFgd(fgdText);
        }

        this.onProgress?.(30, "Parsing WADs...");
        for (let i = 0; i < wadBuffers.length; i++) {
            const wadBuffer = wadBuffers[i];
            try {
                const wadParser = new WadParser(wadBuffer);
                const wadTextures = wadParser.parse();
                wadTextures.forEach((entry, name) => {
                    const texture = this.createThreeTexture(entry);
                    this.textures.set(name.toLowerCase(), texture);
                });
            } catch (e) {
                console.error("[MapRenderer] Failed to parse WAD", e);
            }
            this.onProgress?.(30 + (i / wadBuffers.length) * 20, `Loading textures... (${i+1}/${wadBuffers.length})`);
        }

        this.onProgress?.(60, "Generating Lightmaps...");
        this.generateLightmapAtlas();

        this.onProgress?.(70, "Building World Geometry...");
        this.renderWorld();

        this.onProgress?.(90, "Rendering Entities...");
        this.entitiesGroup = this.entityRenderer.renderEntities(this.bsp.entities);

        this.updatePickableObjects();

        this.calculateEntityCenters();
        this.drawOriginAxes();
        this.renderConnections();

        this.onProgress?.(100, "Ready");
    }

    private updatePickableObjects() {
        this.pickableObjects = [];
        if (this.worldGroup) this.pickableObjects.push(this.worldGroup);
        if (this.brushEntitiesGroup) this.pickableObjects.push(this.brushEntitiesGroup);
        if (this.entitiesGroup) this.pickableObjects.push(this.entitiesGroup);
    }

    public getPickableObjects(): THREE.Object3D[] {
        return this.pickableObjects;
    }

    private calculateEntityCenters() {
        if (!this.bsp) return;
        this.entityCenters.clear();
        this.bsp.entities.forEach((ent: BspEntity) => {
            if (ent.model && ent.model.startsWith('*')) {
                const modelIdx = parseInt(ent.model.substring(1));
                const model = this.bsp!.models[modelIdx];
                if (model) {
                    // Compute center from faces
                    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
                    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

                    for (let i = 0; i < model.numFaces; i++) {
                        const face = this.bsp!.faces[model.firstFace + i];
                        for (let j = 0; j < face.numEdges; j++) {
                            const surfEdge = this.bsp!.surfEdges[face.firstEdge + j];
                            const edge = this.bsp!.edges[Math.abs(surfEdge)];
                            const vIdx = surfEdge >= 0 ? edge.v[0] : edge.v[1];
                            const v = this.bsp!.vertices[vIdx];
                            const pos = convertVector(v);
                            min.min(pos);
                            max.max(pos);
                        }
                    }
                    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);

                    // Apply entity origin if present (brush entities can have an origin offset)
                    if (ent.origin) {
                        const parts = ent.origin.split(' ').map(Number);
                        if (parts.length === 3) {
                            center.add(convertVector({ x: parts[0], y: parts[1], z: parts[2] }));
                        }
                    }
                    this.entityCenters.set(ent, center);
                }
            } else if (ent.origin) {
                const parts = ent.origin.split(' ').map(Number);
                if (parts.length === 3) {
                    this.entityCenters.set(ent, convertVector({ x: parts[0], y: parts[1], z: parts[2] }));
                }
            }
        });
    }

    private drawOriginAxes() {
        const length = 128;
        const origin = new THREE.Vector3(0, 0, 0);

        // GoldSrc -> Three.js directions
        // X: (1,0,0) HL -> (0,0,-1) Three
        // Y: (0,1,0) HL -> (-1,0,0) Three
        // Z: (0,0,1) HL -> (0,1,0) Three
        const dirX = new THREE.Vector3(0, 0, -1);
        const dirY = new THREE.Vector3(-1, 0, 0);
        const dirZ = new THREE.Vector3(0, 1, 0);

        const axesGroup = new THREE.Group();
        axesGroup.name = "origin_axes";

        const arrowX = new THREE.ArrowHelper(dirX, origin, length, 0xff0000);
        const arrowY = new THREE.ArrowHelper(dirY, origin, length, 0x00ff00);
        const arrowZ = new THREE.ArrowHelper(dirZ, origin, length, 0x0000ff);

        axesGroup.add(arrowX);
        axesGroup.add(arrowY);
        axesGroup.add(arrowZ);

        // Add labels
        const createLabel = (text: string, pos: THREE.Vector3, color: string) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = color;
                ctx.font = 'Bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(text, 32, 48);
            }
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture, depthTest: true });
            const sprite = new THREE.Sprite(material);
            sprite.position.copy(pos);
            sprite.scale.set(20, 20, 1);
            return sprite;
        };

        axesGroup.add(createLabel('X', dirX.clone().multiplyScalar(length + 15), '#ff0000'));
        axesGroup.add(createLabel('Y', dirY.clone().multiplyScalar(length + 15), '#00ff00'));
        axesGroup.add(createLabel('Z', dirZ.clone().multiplyScalar(length + 15), '#0000ff'));

        axesGroup.visible = this.axesVisible;
        this.scene.add(axesGroup);
    }

    private calcFaceTextureStep(faceIdx: number): number {
        if (!this.bsp) return 16;
        const face = this.bsp.faces[faceIdx];
        const texInfo = this.bsp.texInfos[face.texInfo];
        if (this.bsp.version === 31) return 8;

        if (texInfo.flags & 2) return 1; // TEX_WORLD_LUXELS
        if (texInfo.flags & 8) return 8; // TEX_EXTRA_LIGHTMAP

        return 16;
    }

    private generateLightmapAtlas() {
        if (!this.bsp) return;
        const atlasData = new Uint8Array(this.atlasWidth * this.atlasHeight * 4); // Use 4 for RGBA
        let curX = 0;
        let curY = 0;
        let maxHeight = 0;

        for (let i = 0; i < this.bsp.faces.length; i++) {
            const face = this.bsp.faces[i];
            if (!face || face.lightmapOffset === -1) continue;

            const texInfo = this.bsp.texInfos[face.texInfo];
            if (!texInfo) continue;

            const step = this.calcFaceTextureStep(i);

            let minU = Infinity, maxU = -Infinity;
            let minV = Infinity, maxV = -Infinity;

            const firstEdge = face.firstEdge;
            const numEdges = face.numEdges;
            for (let j = 0; j < numEdges; j++) {
                const surfEdge = this.bsp!.surfEdges[firstEdge + j];
                const edge = this.bsp!.edges[Math.abs(surfEdge)];
                const vIdx = surfEdge >= 0 ? edge.v[0] : edge.v[1];
                const v = this.bsp!.vertices[vIdx];
                const u = (v.x * texInfo.s.x + v.y * texInfo.s.y + v.z * texInfo.s.z) + texInfo.shiftS;
                const v_tex = (v.x * texInfo.t.x + v.y * texInfo.t.y + v.z * texInfo.t.z) + texInfo.shiftT;
                minU = Math.min(minU, u); maxU = Math.max(maxU, u);
                minV = Math.min(minV, v_tex); maxV = Math.max(maxV, v_tex);
            }

            const minU_step = Math.floor(minU / step);
            const minV_step = Math.floor(minV / step);
            const maxU_step = Math.ceil(maxU / step);
            const maxV_step = Math.ceil(maxV / step);

            const lw = (maxU_step - minU_step) + 1;
            const lh = (maxV_step - minV_step) + 1;

            // Add 1px padding around each lightmap to prevent bleeding with LinearFilter
            const paddedW = lw + 2;
            const paddedH = lh + 2;

            if (curX + paddedW > this.atlasWidth) {
                curX = 0;
                curY += maxHeight;
                maxHeight = 0;
            }

            if (curY + paddedH > this.atlasHeight) continue;

            const size = lw * lh * 3; // BSP lighting is always RGB
            if (face.lightmapOffset + size <= this.bsp.lighting.length) {
                const data = this.bsp.lighting.subarray(face.lightmapOffset, face.lightmapOffset + size);

                // Helper to get pixel from source lightmap with edge clamping
                const getPixel = (px: number, py: number) => {
                    const xx = Math.max(0, Math.min(lw - 1, px));
                    const yy = Math.max(0, Math.min(lh - 1, py));
                    const idx = (yy * lw + xx) * 3;
                    return [data[idx], data[idx+1], data[idx+2]];
                };

                for (let py = 0; py < paddedH; py++) {
                    for (let px = 0; px < paddedW; px++) {
                        // Sample from source (offset by 1 due to padding)
                        const [r, g, b] = getPixel(px - 1, py - 1);
                        const dstIdx = ((curY + py) * this.atlasWidth + (curX + px)) * 4;
                        atlasData[dstIdx + 0] = r;
                        atlasData[dstIdx + 1] = g;
                        atlasData[dstIdx + 2] = b;
                        atlasData[dstIdx + 3] = 255;
                    }
                }
            }

            this.faceLightmapInfo.set(i, { x: curX, y: curY, w: lw, h: lh, minU_step, minV_step, step });
            curX += paddedW;
            maxHeight = Math.max(maxHeight, paddedH);
        }

        this.lightmapAtlas = new THREE.DataTexture(atlasData, this.atlasWidth, this.atlasHeight, THREE.RGBAFormat);
        this.lightmapAtlas.magFilter = THREE.LinearFilter;
        this.lightmapAtlas.minFilter = THREE.LinearFilter;
        this.lightmapAtlas.generateMipmaps = false;
        this.lightmapAtlas.needsUpdate = true;
    }

    private getEntityByModelIndex(modelIdx: number) {
        if (!this.bsp) return undefined;
        return this.bsp.entities.find((ent: BspEntity) => ent.model === `*${modelIdx}`);
    }

    private createThreeTexture(entry: any): THREE.Texture {
        const { width, height, data, palette } = entry;
        if (!data || !palette) {
            console.warn(`[MapRenderer] Missing data/palette for texture ${entry.name}`);
            return new THREE.DataTexture(new Uint8Array([255, 0, 255, 255]), 1, 1, THREE.RGBAFormat);
        }

        const rgba = new Uint8Array(width * height * 4);
        const isTransparent = entry.name.startsWith('{');

        for (let i = 0; i < width * height; i++) {
            const paletteIdx = data[i];
            const pOff = paletteIdx * 3;

            rgba[i * 4 + 0] = palette[pOff + 0];
            rgba[i * 4 + 1] = palette[pOff + 1];
            rgba[i * 4 + 2] = palette[pOff + 2];
            rgba[i * 4 + 3] = (isTransparent && paletteIdx === 255) ? 0 : 255;
        }

        const texture = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        return texture;
    }

    private getMaterial(miptex: any, hasLightmap: boolean, opacity: number = 1.0) {
        const texName = miptex.name.toLowerCase();
        const cacheKey = `${texName}-${hasLightmap}-${opacity}`;
        if (this.materialCache.has(cacheKey)) return this.materialCache.get(cacheKey)!;

        const texture = this.textures.get(texName);
        if (!texture) {
            console.warn(`[MapRenderer] Texture not found in registry: ${texName}`);
        }

        const material = new THREE.ShaderMaterial({
            uniforms: {
                diffuseMap: { value: texture || null },
                lightmapAtlas: { value: this.lightmapAtlas },
                hasLightmap: { value: hasLightmap },
                opacity: { value: opacity }
            },
            vertexShader: bspShader.vertexShader,
            fragmentShader: bspShader.fragmentShader,
            transparent: miptex.name.startsWith('{') || opacity < 1.0,
            side: THREE.FrontSide,
            depthWrite: opacity >= 1.0
        });

        this.materialCache.set(cacheKey, material);
        return material;
    }

    private renderWorld() {
        if (!this.bsp) return;
        this.worldGroup = new THREE.Group();
        this.worldGroup.name = "world";
        this.leafToMaterials.clear();
        this.materialMeshes.clear();

        // Separate world geometry (Model 0) from brush entities (Model > 0)
        // Actually, we need to know which faces belong to which model.
        const modelFaces: Set<number>[] = this.bsp.models.map((m) => {
            const faces = new Set<number>();
            for (let i = 0; i < m.numFaces; i++) {
                faces.add(m.firstFace + i);
            }
            return faces;
        });

        const worldFaces = modelFaces[0];

        const globalBatchByMaterial: Map<string, { pos: number[], uv: number[], luv: number[], mat: THREE.Material }> = new Map();
        const faceToMatKey: string[] = [];

        // First pass: Build face geometries and map them to materials
        for (let faceIdx = 0; faceIdx < this.bsp.faces.length; faceIdx++) {
            if (!worldFaces.has(faceIdx)) {
                faceToMatKey[faceIdx] = "";
                continue;
            }

            const face = this.bsp.faces[faceIdx];
            const texInfo = this.bsp.texInfos[face.texInfo];
            const miptex = this.bsp.textures[texInfo.miptex];
            if (!miptex) {
                faceToMatKey[faceIdx] = "";
                continue;
            }

            const lmInfo = this.faceLightmapInfo.get(faceIdx);
            const atlasInfo = lmInfo ? { x: lmInfo.x, y: lmInfo.y, atlasWidth: this.atlasWidth, atlasHeight: this.atlasHeight, minU_step: lmInfo.minU_step, minV_step: lmInfo.minV_step, step: lmInfo.step } : undefined;
            const geoData = generateFaceGeometry(this.bsp, faceIdx, atlasInfo);
            if (!geoData) {
                faceToMatKey[faceIdx] = "";
                continue;
            }

            const material = this.getMaterial(miptex, !!lmInfo);
            const matKey = `${miptex.name}-${!!lmInfo}-1`;
            faceToMatKey[faceIdx] = matKey;

            if (!globalBatchByMaterial.has(matKey)) {
                globalBatchByMaterial.set(matKey, { pos: [], uv: [], luv: [], mat: material });
            }

            const batch = globalBatchByMaterial.get(matKey)!;
            batch.pos.push(...Array.from(geoData.positions));
            batch.uv.push(...Array.from(geoData.uvs));
            batch.luv.push(...Array.from(geoData.lightUvs));
        }

        // Second pass: Map leafs to materials based on which faces they contain
        this.bsp.leaves.forEach((leaf, leafIdx: number) => {
            if (!this.leafToMaterials.has(leafIdx)) this.leafToMaterials.set(leafIdx, new Set());
            for (let i = 0; i < leaf.numMarkSurfaces; i++) {
                const faceIdx = this.bsp!.markSurfaces[leaf.firstMarkSurface + i];
                const matKey = faceToMatKey[faceIdx];
                if (matKey) {
                    this.leafToMaterials.get(leafIdx)!.add(matKey);
                }
            }
        });

        globalBatchByMaterial.forEach((data, matKey) => {
            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.pos), 3));
            geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(data.uv), 2));
            geom.setAttribute('lightUv', new THREE.BufferAttribute(new Float32Array(data.luv), 2));
            geom.computeVertexNormals();

            const mesh = new THREE.Mesh(geom, data.mat);
            mesh.name = `material_${matKey}`;
            this.worldGroup!.add(mesh);
            this.materialMeshes.set(matKey, mesh);
        });

        this.scene.add(this.worldGroup);

        // Render Brush Entities (Models 1+)
        this.brushEntitiesGroup = new THREE.Group();
        this.brushEntitiesGroup.name = "brush_entities";

        for (let i = 1; i < this.bsp.models.length; i++) {
            const ent = this.getEntityByModelIndex(i);
            const m = this.bsp.models[i];

            // Check if it's a trigger or has aaatrigger texture
            let hasAaaTrigger = false;
            for (let f = 0; f < m.numFaces; f++) {
                const faceIdx = m.firstFace + f;
                const face = this.bsp.faces[faceIdx];
                const texInfo = this.bsp.texInfos[face.texInfo];
                const miptex = this.bsp.textures[texInfo.miptex];
                if (miptex && miptex.name.toLowerCase() === 'aaatrigger') {
                    hasAaaTrigger = true;
                    break;
                }
            }

            let opacity = 1.0;
            const rendermode = ent ? parseInt(ent.rendermode || "0") : 0;
            if (hasAaaTrigger) {
                opacity = this.aaaTriggerOpacity;
            } else if (ent && rendermode !== 0 && ent.renderamt !== undefined) {
                opacity = parseInt(ent.renderamt) / 255.0;
            }

            const modelGroup = new THREE.Group();
            modelGroup.name = `model_${i}`;
            if (ent) {
                modelGroup.userData.entity = ent;

                if (ent.origin) {
                    const parts = ent.origin.split(' ').map(Number);
                    if (parts.length === 3) {
                        modelGroup.position.copy(convertVector({ x: parts[0], y: parts[1], z: parts[2] }));
                    }
                }
                if (ent.angles) {
                    const parts = ent.angles.split(' ').map(Number);
                    if (parts.length === 3) {
                        // HL: Pitch(0) Yaw(1) Roll(2)
                        // Three: X(Pitch), Y(Yaw), Z(Roll)
                        const pitch = THREE.MathUtils.degToRad(parts[0]);
                        const yaw = THREE.MathUtils.degToRad(parts[1]);
                        const roll = THREE.MathUtils.degToRad(parts[2]);
                        modelGroup.rotation.set(pitch, yaw, roll, 'YXZ');
                    }
                }
            }

            const batchByMaterial: Map<string, { pos: number[], uv: number[], luv: number[], mat: THREE.Material }> = new Map();
            const usedTextures = new Set<string>();

            for (let f = 0; f < m.numFaces; f++) {
                const faceIdx = m.firstFace + f;
                const face = this.bsp.faces[faceIdx];
                const texInfo = this.bsp.texInfos[face.texInfo];
                const miptex = this.bsp.textures[texInfo.miptex];
                const lmInfo = this.faceLightmapInfo.get(faceIdx);
                const atlasInfo = lmInfo ? { x: lmInfo.x, y: lmInfo.y, atlasWidth: this.atlasWidth, atlasHeight: this.atlasHeight, minU_step: lmInfo.minU_step, minV_step: lmInfo.minV_step, step: lmInfo.step } : undefined;

                const geoData = generateFaceGeometry(this.bsp, faceIdx, atlasInfo);
                if (!geoData) continue;

                const material = this.getMaterial(miptex, !!lmInfo, opacity);
                const matKey = `${miptex.name}-${!!lmInfo}-${opacity}`;

                if (miptex.name) {
                    usedTextures.add(miptex.name);
                }

                if (!batchByMaterial.has(matKey)) {
                    batchByMaterial.set(matKey, { pos: [], uv: [], luv: [], mat: material });
                }
                const batch = batchByMaterial.get(matKey)!;
                batch.pos.push(...Array.from(geoData.positions));
                batch.uv.push(...Array.from(geoData.uvs));
                batch.luv.push(...Array.from(geoData.lightUvs));
            }

            if (ent) {
                ent.info_textures = Array.from(usedTextures).join(';');
            }

            batchByMaterial.forEach((data) => {
                const geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.pos), 3));
                geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(data.uv), 2));
                geom.setAttribute('lightUv', new THREE.BufferAttribute(new Float32Array(data.luv), 2));
                geom.computeVertexNormals();
                geom.computeBoundingBox();
                geom.computeBoundingSphere();

                const mesh = new THREE.Mesh(geom, data.mat);
                mesh.userData.entity = ent;

                // Add wireframe
                const wireframeGeom = new THREE.EdgesGeometry(geom);
                const wireframeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
                const wireframe = new THREE.LineSegments(wireframeGeom, wireframeMat);
                wireframe.name = 'helper_wireframe';
                wireframe.visible = this.brushWireframesVisible;
                mesh.add(wireframe);

                modelGroup.add(mesh);
            });

            this.brushEntitiesGroup.add(modelGroup);
        }
        this.scene.add(this.brushEntitiesGroup);
    }

    public setEntitiesVisible(visible: boolean) {
        if (this.entitiesGroup) {
            this.entitiesGroup.visible = visible;
        }
    }

    public setBrushEntitiesVisible(visible: boolean) {
        if (this.brushEntitiesGroup) {
            this.brushEntitiesGroup.visible = visible;
        }
    }

    public setBrushWireframesVisible(visible: boolean) {
        this.brushWireframesVisible = visible;
        if (!this.bsp) return;
        if (this.brushEntitiesGroup) {
            this.brushEntitiesGroup.traverse((obj) => {
                if (obj.name === 'helper_wireframe') {
                    obj.visible = visible;
                }
            });
            // Re-apply highlight logic to keep selected entity wireframe hidden if needed
            if (this.selectedEntity) {
                this.highlightEntity(this.selectedEntity);
            }
        }
    }

    public setAxesVisible(visible: boolean) {
        this.axesVisible = visible;
        const axes = this.scene.getObjectByName("origin_axes");
        if (axes) axes.visible = visible;
    }

    public setAaaTriggerOpacity(opacityPercent: number) {
        this.aaaTriggerOpacity = opacityPercent / 100.0;
        if (!this.bsp) return;

        // Update existing materials
        this.materialCache.forEach((mat, key) => {
            if (key.toLowerCase().startsWith('aaatrigger-')) {
                mat.uniforms.opacity.value = this.aaaTriggerOpacity;
                mat.transparent = this.aaaTriggerOpacity < 1.0;
                mat.depthWrite = this.aaaTriggerOpacity >= 1.0;
                mat.needsUpdate = true;
            }
        });

        // If the map is already loaded, we might need to recreate materials if they didn't exist with this opacity
        // but it's easier to just find all meshes using aaatrigger and update them.
        if (this.brushEntitiesGroup) {
            this.brushEntitiesGroup.traverse((obj) => {
                if (obj instanceof THREE.Mesh) {
                    const ent = obj.userData.entity;
                    const modelIdx = ent?.model?.startsWith('*') ? parseInt(ent.model.substring(1)) : -1;
                    if (modelIdx !== -1) {
                        const m = this.bsp!.models[modelIdx];
                        let hasAaaTrigger = false;
                        for (let f = 0; f < m.numFaces; f++) {
                            const faceIdx = m.firstFace + f;
                            const face = this.bsp!.faces[faceIdx];
                            const texInfo = this.bsp!.texInfos[face.texInfo];
                            const miptex = this.bsp!.textures[texInfo.miptex];
                            if (miptex && miptex.name.toLowerCase() === 'aaatrigger') {
                                hasAaaTrigger = true;
                                break;
                            }
                        }
                        if (hasAaaTrigger && obj.material instanceof THREE.ShaderMaterial) {
                             obj.material.uniforms.opacity.value = this.aaaTriggerOpacity;
                             obj.material.transparent = this.aaaTriggerOpacity < 1.0;
                             obj.material.depthWrite = this.aaaTriggerOpacity >= 1.0;
                             obj.material.needsUpdate = true;
                        }
                    }
                }
            });
        }
    }

    public setEntityConnectionsMode(mode: 'none' | 'selected' | 'all') {
        this.entityConnectionsMode = mode;
        if (this.bsp) {
            this.renderConnections();
        }
    }

    public setTextureFiltering(enabled: boolean) {
        const filter = enabled ? THREE.LinearFilter : THREE.NearestFilter;
        this.textures.forEach(texture => {
            texture.magFilter = filter;
            texture.minFilter = filter;
            texture.needsUpdate = true;
        });
    }

    public setLightmapFiltering(enabled: boolean) {
        if (!this.lightmapAtlas) return;
        const filter = enabled ? THREE.LinearFilter : THREE.NearestFilter;
        this.lightmapAtlas.magFilter = filter;
        this.lightmapAtlas.minFilter = filter;
        this.lightmapAtlas.needsUpdate = true;
    }

    public setPvsEnabled(enabled: boolean) {
        if (this.pvsEnabled === enabled) return;
        this.pvsEnabled = enabled;

        if (!enabled) {
            // Show everything when PVS is disabled
            this.materialMeshes.forEach((mesh) => {
                mesh.visible = true;
            });
            this.currentLeafIdx = -1;
        }
    }

    public highlightEntity(entity: BspEntity) {
        this.clearHighlight();
        this.selectedEntity = entity;

        this.highlightGroup = new THREE.Group();
        this.highlightGroup.name = "selection_highlight";

        // Find all meshes associated with this entity
        const entityMeshes: THREE.Mesh[] = [];
        this.scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.userData.entity === entity) {
                entityMeshes.push(obj);
            }
        });

        if (entityMeshes.length === 0) return;

        const redMat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: false, depthTest: false });
        const dotMat = new THREE.PointsMaterial({ color: 0xff0000, size: 5, sizeAttenuation: false, depthTest: false });

        entityMeshes.forEach((mesh) => {
            const wireframeGeom = new THREE.EdgesGeometry(mesh.geometry);
            const wireframe = new THREE.LineSegments(wireframeGeom, redMat);
            wireframe.renderOrder = 9999;

            // Sync transform
            wireframe.position.copy(mesh.position);
            wireframe.quaternion.copy(mesh.quaternion);
            wireframe.scale.copy(mesh.scale);

            // Handle nested transformation (brush entities models)
            if (mesh.parent && mesh.parent !== this.scene && mesh.parent !== this.brushEntitiesGroup) {
                wireframe.position.applyMatrix4(mesh.parent.matrixWorld);
                wireframe.quaternion.setFromRotationMatrix(mesh.parent.matrixWorld);
                // Note: scale might need more complex handling if non-uniform, but usually it's 1.1.1
            }

            // Hide the default white wireframe
            mesh.children.forEach(child => {
                if (child.name === 'helper_wireframe' || child.name === 'point_helper_wireframe') {
                    child.visible = false;
                }
            });

            this.highlightGroup!.add(wireframe);
        });

        // Add origin dot
        let originPos = new THREE.Vector3(0, 0, 0);
        if (entity.origin) {
            const parts = entity.origin.split(' ').map(Number);
            if (parts.length === 3) {
                originPos = convertVector({ x: parts[0], y: parts[1], z: parts[2] });
            }
        } else if (entity.model && entity.model.startsWith('*')) {
            const center = this.entityCenters.get(entity);
            if (center) {
                originPos.copy(center);
            }
        }

        const dotGeom = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([originPos.x, originPos.y, originPos.z]), 3));
        const dot = new THREE.Points(dotGeom, dotMat);
        dot.renderOrder = 10000;
        this.highlightGroup.add(dot);

        this.scene.add(this.highlightGroup);
    }

    public clearHighlight() {
        this.selectedEntity = null;
        // Restore all white wireframes visibility if global setting allows
        this.scene.traverse((obj) => {
            if (obj.name === 'helper_wireframe') {
                obj.visible = this.brushWireframesVisible;
            } else if (obj.name === 'point_helper_wireframe') {
                obj.visible = true;
            }
        });

        if (this.highlightGroup) {
            this.highlightGroup.traverse((child) => {
                if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Points) {
                    if (child.geometry) child.geometry.dispose();
                }
            });
            this.scene.remove(this.highlightGroup);
            this.highlightGroup = null;
        }
    }

    private clearConnections() {
        if (this.connectionsGroup) {
            this.connectionsGroup.traverse((child: any) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.scene.remove(this.connectionsGroup);
            this.connectionsGroup = null;
        }
    }

    private connectionMaterials = {
        yellow: new THREE.LineBasicMaterial({ color: 0xffff00, depthTest: true }),
        green: new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: true })
    };

    private renderConnections() {
        this.clearConnections();
        if (this.entityConnectionsMode === 'none' || !this.bsp) return;

        this.connectionsGroup = new THREE.Group();
        this.connectionsGroup.name = "entity_connections";

        const entities = this.bsp.entities;
        const targetNameToEnts = new Map<string, BspEntity[]>();
        entities.forEach((ent: BspEntity) => {
            if (ent.targetname) {
                const name = ent.targetname.toLowerCase();
                if (!targetNameToEnts.has(name)) targetNameToEnts.set(name, []);
                targetNameToEnts.get(name)!.push(ent);
            }
        });

        entities.forEach((ent: BspEntity) => {
            if (ent.target) {
                const targetName = ent.target.toLowerCase();
                const targets = targetNameToEnts.get(targetName);
                if (targets) {
                    targets.forEach(targetEnt => {
                        const start = this.entityCenters.get(ent);
                        const end = this.entityCenters.get(targetEnt);

                        if (start && end) {
                            let shouldDraw = false;
                            let color = this.connectionMaterials.yellow;

                            if (this.entityConnectionsMode === 'all') {
                                shouldDraw = true;
                                color = this.connectionMaterials.yellow;
                            } else if (this.entityConnectionsMode === 'selected' && this.selectedEntity) {
                                if (ent === this.selectedEntity) {
                                    shouldDraw = true;
                                    color = this.connectionMaterials.yellow;
                                } else if (targetEnt === this.selectedEntity) {
                                    shouldDraw = true;
                                    color = this.connectionMaterials.green;
                                }
                            }

                            if (shouldDraw) {
                                const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
                                const line = new THREE.Line(geom, color);
                                this.connectionsGroup!.add(line);
                            }
                        }
                    });
                }
            }
        });

        this.scene.add(this.connectionsGroup);
    }

    public updateVisibility(cameraPosition: THREE.Vector3) {
        if (!this.pvsManager || !this.pvsEnabled) return;

        const leafIdx = this.pvsManager.getLeafIndex(cameraPosition);
        if (leafIdx === this.currentLeafIdx) return; // Only update if we changed leaf

        this.currentLeafIdx = leafIdx;
        const visibleLeafs = this.pvsManager.getVisibleLeafs(leafIdx);
        const visibleSet = new Set(visibleLeafs);

        // Check which materials are present in ANY of the visible leafs
        const visibleMaterials = new Set<string>();
        visibleSet.forEach(idx => {
            const mats = this.leafToMaterials.get(idx);
            if (mats) {
                mats.forEach(m => visibleMaterials.add(m));
            }
        });

        this.materialMeshes.forEach((mesh, matKey) => {
            mesh.visible = visibleMaterials.has(matKey);
        });
    }
}
