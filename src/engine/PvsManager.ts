import * as THREE from 'three';

export class PvsManager {
    private bsp: any;
    private allLeaves: number[] | null = null;

    constructor(bsp: any) {
        this.bsp = bsp;
    }

    private getAllLeaves(): number[] {
        if (this.allLeaves === null) {
            this.allLeaves = Array.from({ length: this.bsp.leaves.length }, (_, i) => i);
        }
        return this.allLeaves;
    }

    public getLeafIndex(cameraPosition: THREE.Vector3): number {
        return this.findLeaf(cameraPosition);
    }

    public getVisibleLeafs(leafIdx: number): number[] {
        // If leafIdx <= 0, we are either in solid space or out of bounds.
        // Instead of hiding everything, let's show all leafs or at least return a safe fallback.
        if (leafIdx <= 0) {
            return this.getAllLeaves();
        }

        const leaf = this.bsp.leaves[leafIdx];
        if (!leaf || leaf.visOffset === -1) {
            return this.getAllLeaves();
        }

        return this.decompressVis(leaf.visOffset);
    }

    private findLeaf(pos: THREE.Vector3): number {
        // HL: x -> -z, y -> -x, z -> y
        // Three -> HL: hlx = -z, hly = -x, hlz = y
        // Actually, let's verify the mapping.
        // In EntityRenderer: const pos = new THREE.Vector3(-origin[1], origin[2], -origin[0]);
        // origin is [x, y, z] in HL.
        // pos.x = -origin.y  => origin.y = -pos.x
        // pos.y = origin.z   => origin.z = pos.y
        // pos.z = -origin.x  => origin.x = -pos.z

        const hlPos = { x: -pos.z, y: -pos.x, z: pos.y };

        let nodeIdx = 0; // Start at root node of world model
        let safety = 0;
        while (nodeIdx >= 0 && safety < 1000) {
            safety++;
            const node = this.bsp.nodes[nodeIdx];
            if (!node) break;
            const plane = this.bsp.planes[node.plane];

            const dist = hlPos.x * plane.normal.x + hlPos.y * plane.normal.y + hlPos.z * plane.normal.z - plane.dist;

            if (dist >= 0) {
                nodeIdx = node.children[0];
            } else {
                nodeIdx = node.children[1];
            }
        }

        return (nodeIdx < 0) ? ~nodeIdx : 0;
    }

    private decompressVis(offset: number): number[] {
        const visibleLeafs: number[] = [];
        const numLeafs = this.bsp.leaves.length;

        let currentLeaf = 1; // Leaf 0 is usually solid
        let p = offset;
        const visData = this.bsp.visibility;

        while (currentLeaf < numLeafs) {
            if (visData[p] === 0) {
                const skip = visData[p + 1];
                currentLeaf += skip * 8;
                p += 2;
            } else {
                for (let bit = 0; bit < 8; bit++) {
                    if (visData[p] & (1 << bit)) {
                        visibleLeafs.push(currentLeaf);
                    }
                    currentLeaf++;
                }
                p++;
            }
        }
        return visibleLeafs;
    }
}
