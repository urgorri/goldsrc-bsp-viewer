import * as THREE from 'three';

/**
 * GoldSrc -> Three.js Coordinate Conversion
 * GoldSrc: X forward, Y left, Z up
 * Three.js: X right, Y up, Z backward
 */
export function convertVector(v: {x: number, y: number, z: number}): THREE.Vector3 {
    return new THREE.Vector3(-v.y, v.z, -v.x);
}

export function generateFaceGeometry(
    bsp: any,
    faceIdx: number,
    atlasInfo?: { x: number, y: number, atlasWidth: number, atlasHeight: number, minU_step: number, minV_step: number, step: number }
): { positions: Float32Array, uvs: Float32Array, lightUvs: Float32Array } | null {
    const face = bsp.faces[faceIdx];
    if (!face) return null;
    const texInfo = bsp.texInfos[face.texInfo];
    if (!texInfo) return null;
    const miptex = bsp.textures[texInfo.miptex];
    if (!miptex) return null;

    const firstEdge = face.firstEdge;
    const numEdges = face.numEdges;

    if (numEdges < 3) return null;

    const faceVerts: THREE.Vector3[] = [];
    for (let i = 0; i < numEdges; i++) {
        const surfEdge = bsp.surfEdges[firstEdge + i];
        const edge = bsp.edges[Math.abs(surfEdge)];
        const vIdx = surfEdge >= 0 ? edge.v[0] : edge.v[1];
        faceVerts.push(convertVector(bsp.vertices[vIdx]));
    }

    // GoldSrc faces are wound in a way that might need reversing for Three.js
    // Let's ensure CCW winding for front faces.
    // If the map is seen from outside but not inside, we might need to flip the winding.
    // Actually, BSP faces are usually oriented to look into the room.

    const numTriangles = numEdges - 2;
    const numVertices = numTriangles * 3;

    const positions = new Float32Array(numVertices * 3);
    const uvs = new Float32Array(numVertices * 2);
    const lightUvs = new Float32Array(numVertices * 2);

    let minU = Infinity, minV = Infinity;
    if (atlasInfo) {
        faceVerts.forEach(v => {
            // Convert back to HL coordinates for UV calculation
            const hlx = -v.z; const hly = -v.x; const hlz = v.y;
            const u = (hlx * texInfo.s.x + hly * texInfo.s.y + hlz * texInfo.s.z) + texInfo.shiftS;
            const v_tex = (hlx * texInfo.t.x + hly * texInfo.t.y + hlz * texInfo.t.z) + texInfo.shiftT;
            minU = Math.min(minU, u);
            minV = Math.min(minV, v_tex);
        });
    }

    let posIdx = 0;
    let uvIdx = 0;

    // Use Fan Triangulation with reversed winding (v0, v2, v1) to look inwards
    for (let i = 1; i < faceVerts.length - 1; i++) {
        const v0 = faceVerts[0];
        const v1 = faceVerts[i];
        const v2 = faceVerts[i+1];

        const tris = [v0, v2, v1]; // Flipped winding from [v0, v1, v2]

        for (const v of tris) {
            positions[posIdx++] = v.x;
            positions[posIdx++] = v.y;
            positions[posIdx++] = v.z;

            // HL coordinates for UV
            const hlx = -v.z; const hly = -v.x; const hlz = v.y;
            const u = (hlx * texInfo.s.x + hly * texInfo.s.y + hlz * texInfo.s.z) + texInfo.shiftS;
            const v_tex = (hlx * texInfo.t.x + hly * texInfo.t.y + hlz * texInfo.t.z) + texInfo.shiftT;

            // Normalized UVs. Ensure we don't divide by zero.
            uvs[uvIdx] = u / (miptex.width || 1);
            uvs[uvIdx + 1] = v_tex / (miptex.height || 1);

            if (atlasInfo) {
                // In GoldSrc/HL, lightmap coordinates for a vertex are:
                // luxel_u = (u / step) - floor(minU / step)
                // We add 0.5 to center on the luxel, and +1 because of the 1px padding in our atlas.
                const lu = (u / atlasInfo.step) - atlasInfo.minU_step + 0.5;
                const lv = (v_tex / atlasInfo.step) - atlasInfo.minV_step + 0.5;

                // atlasInfo.x/y is the top-left of the PADDED area.
                // The actual lightmap data starts at (x+1, y+1).
                lightUvs[uvIdx] = (atlasInfo.x + 1 + lu) / atlasInfo.atlasWidth;
                lightUvs[uvIdx + 1] = (atlasInfo.y + 1 + lv) / atlasInfo.atlasHeight;
            }
            uvIdx += 2;
        }
    }

    return { positions, uvs, lightUvs };
}
