import * as THREE from 'three';

export class EndCrystal {
    constructor(position, scene) {
        this.position = position.clone();
        this.scene = scene;
        this.health = 1;
        this.dead = false;
        this.time = Math.random() * Math.PI * 2; // random starting phase

        this.mesh = this._buildMesh();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    _buildMesh() {
        const group = new THREE.Group();

        // Spinning magenta cube
        const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const mat = new THREE.MeshLambertMaterial({
            color: 0xFF00FF,
            emissive: 0x880088,
            emissiveIntensity: 0.5
        });
        this.cube = new THREE.Mesh(geo, mat);
        group.add(this.cube);

        // Glow effect — slightly larger transparent cube
        const glowGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xFF88FF,
            transparent: true,
            opacity: 0.2
        });
        this.glow = new THREE.Mesh(glowGeo, glowMat);
        group.add(this.glow);

        return group;
    }

    update(dt) {
        if (this.dead) return;
        this.time += dt * 2;
        this.cube.rotation.y = this.time;
        this.cube.rotation.x = Math.sin(this.time * 0.7) * 0.3;
        // Bob up and down
        this.mesh.position.y = this.position.y + Math.sin(this.time) * 0.3;
    }

    takeDamage() {
        if (this.dead) return;
        this.health = 0;
        this.dead = true;
        this.dispose();
    }

    // AABB raycast for shooting
    raycast(origin, direction, maxDist) {
        const halfSize = 0.8;
        const min = new THREE.Vector3(
            this.position.x - halfSize,
            this.position.y - halfSize,
            this.position.z - halfSize
        );
        const max = new THREE.Vector3(
            this.position.x + halfSize,
            this.position.y + halfSize,
            this.position.z + halfSize
        );

        let tmin = 0;
        let tmax = maxDist;

        for (let i = 0; i < 3; i++) {
            const axis = ['x', 'y', 'z'][i];
            const o = origin[axis];
            const d = direction[axis];
            const lo = min[axis];
            const hi = max[axis];

            if (Math.abs(d) < 1e-8) {
                if (o < lo || o > hi) return null;
            } else {
                let t1 = (lo - o) / d;
                let t2 = (hi - o) / d;
                if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
                tmin = Math.max(tmin, t1);
                tmax = Math.min(tmax, t2);
                if (tmin > tmax) return null;
            }
        }

        return tmin;
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            for (const child of this.mesh.children) {
                child.geometry.dispose();
                child.material.dispose();
            }
            this.mesh = null;
        }
    }
}
