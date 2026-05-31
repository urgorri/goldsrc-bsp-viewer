export const LUMP_ENTITIES = 0;
export const LUMP_PLANES = 1;
export const LUMP_TEXTURES = 2;
export const LUMP_VERTICES = 3;
export const LUMP_VISIBILITY = 4;
export const LUMP_NODES = 5;
export const LUMP_TEXINFO = 6;
export const LUMP_FACES = 7;
export const LUMP_LIGHTING = 8;
export const LUMP_CLIPNODES = 9;
export const LUMP_LEAVES = 10;
export const LUMP_MARKSURFACES = 11;
export const LUMP_EDGES = 12;
export const LUMP_SURFEDGES = 13;
export const LUMP_MODELS = 14;
export const HEADER_LUMPS = 15;

export const TEX_SPECIAL = 1;
export const TEX_WORLD_LUXELS = 2;
export const TEX_AXIAL_LUXELS = 4;
export const TEX_EXTRA_LIGHTMAP = 8;

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface BspLump {
    offset: number;
    length: number;
}

export interface BspHeader {
    version: number;
    lumps: BspLump[];
}

export interface BspFace {
    plane: number;
    planeSide: number;
    firstEdge: number;
    numEdges: number;
    texInfo: number;
    styles: number[];
    lightmapOffset: number;
}

export interface BspEdge {
    v: [number, number];
}

export interface BspTexInfo {
    s: Vector3;
    shiftS: number;
    t: Vector3;
    shiftT: number;
    miptex: number;
    flags: number;
}

export interface BspMiptex {
    name: string;
    width: number;
    height: number;
    offsets: number[];
    data?: Uint8Array; // Decoded or raw data
}

export interface BspModel {
    mins: Vector3;
    maxs: Vector3;
    origin: Vector3;
    headNodes: number[];
    visLeafs: number;
    firstFace: number;
    numFaces: number;
}

export interface BspNode {
    plane: number;
    children: [number, number];
    mins: [number, number, number];
    maxs: [number, number, number];
    firstFace: number;
    numFaces: number;
}

export interface BspLeaf {
    contents: number;
    visOffset: number;
    mins: [number, number, number];
    maxs: [number, number, number];
    firstMarkSurface: number;
    numMarkSurfaces: number;
    ambientLevels: number[];
}

export class BspParser {
    private view: DataView;

    constructor(buffer: ArrayBuffer) {
        this.view = new DataView(buffer);
    }

    public parse(): any {
        const version = this.view.getInt32(0, true);
        if (version !== 30) {
            console.warn(`Unsupported BSP version: ${version}. Expected 30.`);
        }

        const lumps: BspLump[] = [];
        for (let i = 0; i < HEADER_LUMPS; i++) {
            lumps.push({
                offset: this.view.getInt32(4 + i * 8, true),
                length: this.view.getInt32(8 + i * 8, true),
            });
        }

        const entities = this.parseEntities(lumps[LUMP_ENTITIES]);
        const vertices = this.parseVertices(lumps[LUMP_VERTICES]);
        const edges = this.parseEdges(lumps[LUMP_EDGES]);
        const surfEdges = this.parseSurfEdges(lumps[LUMP_SURFEDGES]);
        const faces = this.parseFaces(lumps[LUMP_FACES]);
        const texInfos = this.parseTexInfos(lumps[LUMP_TEXINFO]);
        const planes = this.parsePlanes(lumps[LUMP_PLANES]);
        const textures = this.parseTextures(lumps[LUMP_TEXTURES]);
        const lighting = this.parseLighting(lumps[LUMP_LIGHTING]);
        const visibility = this.parseVisibility(lumps[LUMP_VISIBILITY]);
        const models = this.parseModels(lumps[LUMP_MODELS]);
        const nodes = this.parseNodes(lumps[LUMP_NODES]);
        const leaves = this.parseLeaves(lumps[LUMP_LEAVES]);
        const markSurfaces = this.parseMarkSurfaces(lumps[LUMP_MARKSURFACES]);
        const clipNodes = this.parseClipNodes(lumps[LUMP_CLIPNODES]);

        return {
            version,
            entities,
            vertices,
            edges,
            surfEdges,
            faces,
            texInfos,
            planes,
            textures,
            lighting,
            visibility,
            models,
            nodes,
            leaves,
            markSurfaces,
            clipNodes
        };
    }

    private parseEntities(lump: BspLump): any[] {
        const text = new TextDecoder().decode(new Uint8Array(this.view.buffer, lump.offset, lump.length));
        const entities: any[] = [];
        let currentEntity: any = null;

        const lines = text.split('\n');
        for (let line of lines) {
            line = line.trim();
            if (line === '{') {
                currentEntity = {};
            } else if (line === '}') {
                if (currentEntity) entities.push(currentEntity);
                currentEntity = null;
            } else if (currentEntity) {
                const match = line.match(/"(.*)"\s+"(.*)"/);
                if (match) {
                    currentEntity[match[1]] = match[2];
                }
            }
        }
        return entities;
    }

    private parseVertices(lump: BspLump): Vector3[] {
        const count = lump.length / 12;
        const vertices: Vector3[] = [];
        for (let i = 0; i < count; i++) {
            vertices.push({
                x: this.view.getFloat32(lump.offset + i * 12, true),
                y: this.view.getFloat32(lump.offset + i * 12 + 4, true),
                z: this.view.getFloat32(lump.offset + i * 12 + 8, true),
            });
        }
        return vertices;
    }

    private parseEdges(lump: BspLump): BspEdge[] {
        const count = lump.length / 4;
        const edges: BspEdge[] = [];
        for (let i = 0; i < count; i++) {
            edges.push({
                v: [
                    this.view.getUint16(lump.offset + i * 4, true),
                    this.view.getUint16(lump.offset + i * 4 + 2, true)
                ]
            });
        }
        return edges;
    }

    private parseSurfEdges(lump: BspLump): number[] {
        const count = lump.length / 4;
        const surfEdges: number[] = [];
        for (let i = 0; i < count; i++) {
            surfEdges.push(this.view.getInt32(lump.offset + i * 4, true));
        }
        return surfEdges;
    }

    private parseFaces(lump: BspLump): BspFace[] {
        const count = lump.length / 20;
        const faces: BspFace[] = [];
        for (let i = 0; i < count; i++) {
            const off = lump.offset + i * 20;
            faces.push({
                plane: this.view.getUint16(off, true),
                planeSide: this.view.getUint16(off + 2, true),
                firstEdge: this.view.getInt32(off + 4, true),
                numEdges: this.view.getUint16(off + 8, true),
                texInfo: this.view.getUint16(off + 10, true),
                styles: [
                    this.view.getUint8(off + 12),
                    this.view.getUint8(off + 13),
                    this.view.getUint8(off + 14),
                    this.view.getUint8(off + 15)
                ],
                lightmapOffset: this.view.getInt32(off + 16, true)
            });
        }
        return faces;
    }

    private parseTexInfos(lump: BspLump): BspTexInfo[] {
        const count = lump.length / 40;
        const texInfos: BspTexInfo[] = [];
        for (let i = 0; i < count; i++) {
            const off = lump.offset + i * 40;
            texInfos.push({
                s: { x: this.view.getFloat32(off, true), y: this.view.getFloat32(off + 4, true), z: this.view.getFloat32(off + 8, true) },
                shiftS: this.view.getFloat32(off + 12, true),
                t: { x: this.view.getFloat32(off + 16, true), y: this.view.getFloat32(off + 20, true), z: this.view.getFloat32(off + 24, true) },
                shiftT: this.view.getFloat32(off + 28, true),
                miptex: this.view.getInt32(off + 32, true),
                flags: this.view.getInt32(off + 36, true)
            });
        }
        return texInfos;
    }

    private parsePlanes(lump: BspLump): any[] {
        const count = lump.length / 20;
        const planes: any[] = [];
        for (let i = 0; i < count; i++) {
            const off = lump.offset + i * 20;
            planes.push({
                normal: { x: this.view.getFloat32(off, true), y: this.view.getFloat32(off + 4, true), z: this.view.getFloat32(off + 8, true) },
                dist: this.view.getFloat32(off + 12, true),
                type: this.view.getInt32(off + 16, true)
            });
        }
        return planes;
    }

    private parseTextures(lump: BspLump): BspMiptex[] {
        if (lump.length === 0) return [];
        const numTextures = this.view.getInt32(lump.offset, true);
        const textures: BspMiptex[] = [];
        for (let i = 0; i < numTextures; i++) {
            const offsetToMiptex = this.view.getInt32(lump.offset + 4 + i * 4, true);
            if (offsetToMiptex === -1) continue; // Skip if no texture
            const off = lump.offset + offsetToMiptex;

            let name = "";
            for (let j = 0; j < 16; j++) {
                const char = this.view.getUint8(off + j);
                if (char === 0) break;
                name += String.fromCharCode(char);
            }

            const width = this.view.getUint32(off + 16, true);
            const height = this.view.getUint32(off + 20, true);
            const offsets = [
                this.view.getUint32(off + 24, true),
                this.view.getUint32(off + 28, true),
                this.view.getUint32(off + 32, true),
                this.view.getUint32(off + 36, true)
            ];

            const texture: BspMiptex = { name, width, height, offsets };

            // If offsets[0] is not 0, the texture is embedded
            if (offsets[0] !== 0) {
                // We'll handle palette and actual data later if needed
                // WAD3 format embedded in BSP: 4 mipmaps + 2 bytes (palette size) + palette (256 * 3 bytes)
                const dataSize = Math.floor(width * height * 85 / 64) + 2 + 768; // Rough estimate for 4 mips + palette
                texture.data = new Uint8Array(this.view.buffer, off, dataSize);
            }

            textures.push(texture);
        }
        return textures;
    }

    private parseLighting(lump: BspLump): Uint8Array {
        return new Uint8Array(this.view.buffer, lump.offset, lump.length);
    }

    private parseVisibility(lump: BspLump): Uint8Array {
        return new Uint8Array(this.view.buffer, lump.offset, lump.length);
    }

    private parseModels(lump: BspLump): BspModel[] {
        const count = lump.length / 64;
        const models: BspModel[] = [];
        for (let i = 0; i < count; i++) {
            const off = lump.offset + i * 64;
            models.push({
                mins: { x: this.view.getFloat32(off, true), y: this.view.getFloat32(off + 4, true), z: this.view.getFloat32(off + 8, true) },
                maxs: { x: this.view.getFloat32(off + 12, true), y: this.view.getFloat32(off + 16, true), z: this.view.getFloat32(off + 20, true) },
                origin: { x: this.view.getFloat32(off + 24, true), y: this.view.getFloat32(off + 28, true), z: this.view.getFloat32(off + 32, true) },
                headNodes: [
                    this.view.getInt32(off + 36, true),
                    this.view.getInt32(off + 40, true),
                    this.view.getInt32(off + 44, true),
                    this.view.getInt32(off + 48, true)
                ],
                visLeafs: this.view.getInt32(off + 52, true),
                firstFace: this.view.getInt32(off + 56, true),
                numFaces: this.view.getInt32(off + 60, true)
            });
        }
        return models;
    }

    private parseNodes(lump: BspLump): BspNode[] {
        const count = lump.length / 24;
        const nodes: BspNode[] = [];
        for (let i = 0; i < count; i++) {
            const off = lump.offset + i * 24;
            nodes.push({
                plane: this.view.getInt32(off, true),
                children: [this.view.getInt16(off + 4, true), this.view.getInt16(off + 6, true)],
                mins: [this.view.getInt16(off + 8, true), this.view.getInt16(off + 10, true), this.view.getInt16(off + 12, true)],
                maxs: [this.view.getInt16(off + 14, true), this.view.getInt16(off + 16, true), this.view.getInt16(off + 18, true)],
                firstFace: this.view.getUint16(off + 20, true),
                numFaces: this.view.getUint16(off + 22, true)
            });
        }
        return nodes;
    }

    private parseLeaves(lump: BspLump): BspLeaf[] {
        const count = lump.length / 24;
        const leaves: BspLeaf[] = [];
        for (let i = 0; i < count; i++) {
            const off = lump.offset + i * 24;
            leaves.push({
                contents: this.view.getInt32(off, true),
                visOffset: this.view.getInt32(off + 4, true),
                mins: [this.view.getInt16(off + 8, true), this.view.getInt16(off + 10, true), this.view.getInt16(off + 12, true)],
                maxs: [this.view.getInt16(off + 14, true), this.view.getInt16(off + 16, true), this.view.getInt16(off + 18, true)],
                firstMarkSurface: this.view.getUint16(off + 20, true),
                numMarkSurfaces: this.view.getUint16(off + 22, true),
                ambientLevels: [
                    this.view.getUint8(off + 24),
                    this.view.getUint8(off + 25),
                    this.view.getUint8(off + 26),
                    this.view.getUint8(off + 27)
                ]
            });
        }
        return leaves;
    }

    private parseMarkSurfaces(lump: BspLump): number[] {
        const count = lump.length / 2;
        const markSurfaces: number[] = [];
        for (let i = 0; i < count; i++) {
            markSurfaces.push(this.view.getUint16(lump.offset + i * 2, true));
        }
        return markSurfaces;
    }

    private parseClipNodes(lump: BspLump): any[] {
        const count = lump.length / 8;
        const clipNodes: any[] = [];
        for (let i = 0; i < count; i++) {
            const off = lump.offset + i * 8;
            clipNodes.push({
                plane: this.view.getInt32(off, true),
                children: [this.view.getInt16(off + 4, true), this.view.getInt16(off + 6, true)]
            });
        }
        return clipNodes;
    }
}
