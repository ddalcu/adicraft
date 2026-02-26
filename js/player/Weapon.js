import * as THREE from 'three';

const FIRE_RATE = 10; // shots per second
const DAMAGE = 2;
const MAX_RANGE = 50;
const TRAIL_DURATION = 0.08; // seconds

export class Weapon {
    constructor(camera, scene, entityManager, sound) {
        this.camera = camera;
        this.scene = scene;
        this.entityManager = entityManager;
        this.sound = sound;
        this.fireCooldown = 0;
        this.trails = [];
        // Extra targets (crystals, dragon) set by main.js
        this.extraTargets = [];
    }

    update(dt, input) {
        this.fireCooldown = Math.max(0, this.fireCooldown - dt);

        // Fire while left mouse held
        if (input.mouseLeft && this.fireCooldown <= 0) {
            this._fire();
            this.fireCooldown = 1 / FIRE_RATE;
        }

        // Update trail visuals
        this.trails = this.trails.filter(trail => {
            trail.life -= dt;
            if (trail.life <= 0) {
                this.scene.remove(trail.mesh);
                trail.mesh.geometry.dispose();
                trail.mesh.material.dispose();
                return false;
            }
            trail.mesh.material.opacity = trail.life / TRAIL_DURATION;
            return true;
        });
    }

    _fire() {
        if (this.sound) this.sound.playShoot();
        const origin = this.camera.position.clone();
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

        // Raycast against overworld entities
        let closestDist = MAX_RANGE;
        let closestTarget = null;

        const mobHit = this.entityManager.raycastEntities(origin, direction, closestDist);
        if (mobHit) {
            const t = mobHit.raycast(origin, direction, closestDist);
            if (t !== null && t < closestDist) {
                closestDist = t;
                closestTarget = mobHit;
            }
        }

        // Raycast against extra targets (crystals, dragon)
        for (const target of this.extraTargets) {
            if (target.dead) continue;
            const t = target.raycast(origin, direction, closestDist);
            if (t !== null && t < closestDist) {
                closestDist = t;
                closestTarget = target;
            }
        }

        let endPoint;
        if (closestTarget) {
            closestTarget.takeDamage(DAMAGE);
            endPoint = origin.clone().add(direction.clone().multiplyScalar(closestDist));
        } else {
            endPoint = origin.clone().add(direction.clone().multiplyScalar(MAX_RANGE));
        }

        this._createTrail(origin, endPoint);
    }

    _createTrail(start, end) {
        const points = [start, end];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 1.0
        });
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);

        this.trails.push({ mesh: line, life: TRAIL_DURATION });
    }

    dispose() {
        for (const trail of this.trails) {
            this.scene.remove(trail.mesh);
            trail.mesh.geometry.dispose();
            trail.mesh.material.dispose();
        }
        this.trails = [];
    }
}
