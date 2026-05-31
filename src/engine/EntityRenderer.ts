import * as THREE from 'three';
import { FgdParser } from '../parsers/FgdParser';

export class EntityRenderer {
    private scene: THREE.Scene;
    private fgd: Map<string, any> = new Map();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public async loadFgd(text: string) {
        const parser = new FgdParser();
        this.fgd = parser.parse(text);
    }

    public renderEntities(entities: any[]): THREE.Group {
        const group = new THREE.Group();
        group.name = "entities";

        entities.forEach(ent => {
            if (!ent.origin) return;

            const origin = ent.origin.split(' ').map(Number);
            const classname = ent.classname;
            const fgdClass = this.fgd.get(classname);

            const color = fgdClass?.color ?
                new THREE.Color(fgdClass.color[0]/255, fgdClass.color[1]/255, fgdClass.color[2]/255) :
                new THREE.Color(0x808080);

            // HL Coordinates -> Three.js
            // x -> -z, y -> -x, z -> y
            const pos = new THREE.Vector3(-origin[1], origin[2], -origin[0]);

            const geometry = new THREE.BoxGeometry(8, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color,
                wireframe: false,
                transparent: true,
                opacity: 0.8
            });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.copy(pos);
            cube.userData = { entity: ent };

            group.add(cube);

            // Add wireframe
            const wireframeGeom = new THREE.EdgesGeometry(geometry);
            const wireframeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
            const wireframe = new THREE.LineSegments(wireframeGeom, wireframeMat);
            wireframe.name = 'point_helper_wireframe';
            cube.add(wireframe);
        });

        this.scene.add(group);
        return group;
    }
}
