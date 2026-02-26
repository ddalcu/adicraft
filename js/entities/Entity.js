import * as THREE from 'three';
import { EntityTextureManager } from './EntityTextureManager.js';

export class Entity {
    constructor(typeDef, position, scene) {
        this.type = typeDef;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.health = typeDef.health;
        this.maxHealth = typeDef.health;
        this.dead = false;
        this.scene = scene;

        // AI state
        this.wanderTimer = 0;
        this.wanderDir = new THREE.Vector3(0, 0, 0);
        this.attackCooldown = 0;
        this.hurtFlashTimer = 0;

        // Build mesh group from box definitions
        this.mesh = this._buildMesh();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    _buildMesh() {
        const group = new THREE.Group();
        this._boxMeshes = [];

        const texture = this.type.texture
            ? EntityTextureManager.getTexture(this.type.texture)
            : null;

        for (const box of this.type.boxes) {
            const geo = new THREE.BoxGeometry(box.size[0], box.size[1], box.size[2]);
            let mat;

            if (texture && this.type.fullTexture) {
                // Full texture mode: map entire texture to each face (nextbot style)
                mat = new THREE.MeshLambertMaterial({ map: texture });
            } else if (texture && box.uv && this.type.textureSize) {
                const [texW, texH] = this.type.textureSize;
                const faceUVs = EntityTextureManager.minecraftBoxUV(
                    box.uv.u, box.uv.v, box.uv.w, box.uv.h, box.uv.d
                );
                EntityTextureManager.applyBoxUVs(geo, texW, texH, faceUVs);
                mat = new THREE.MeshLambertMaterial({
                    map: texture,
                    alphaTest: 0.1,
                });
            } else {
                mat = new THREE.MeshLambertMaterial({ color: box.color });
            }

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(box.offset[0], box.offset[1], box.offset[2]);
            mesh.userData.originalColor = box.color;
            mesh.userData.hasTexture = !!texture;
            group.add(mesh);
            this._boxMeshes.push(mesh);
        }

        return group;
    }

    update(dt, playerPosition, getBlock) {
        if (this.dead) return;

        this.attackCooldown = Math.max(0, this.attackCooldown - dt);

        // Hurt flash
        if (this.hurtFlashTimer > 0) {
            this.hurtFlashTimer -= dt;
            if (this.hurtFlashTimer <= 0) {
                this._resetColors();
            }
        }

        if (this.type.hostile) {
            this._hostileAI(dt, playerPosition);
        } else {
            this._passiveAI(dt);
        }

        // Simple gravity — snap to ground
        this._applyGravity(getBlock);

        this.mesh.position.copy(this.position);
    }

    _hostileAI(dt, playerPosition) {
        const dx = playerPosition.x - this.position.x;
        const dz = playerPosition.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < this.type.detectRange) {
            // Chase player
            const dir = new THREE.Vector3(dx, 0, dz).normalize();
            this.position.x += dir.x * this.type.speed * dt;
            this.position.z += dir.z * this.type.speed * dt;

            // Face player
            this.mesh.rotation.y = Math.atan2(dx, dz);
        } else {
            this._wander(dt);
        }
    }

    _passiveAI(dt) {
        this._wander(dt);
    }

    _wander(dt) {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            this.wanderDir.set(Math.cos(angle), 0, Math.sin(angle));
            this.wanderTimer = 2 + Math.random() * 4;
        }

        this.position.x += this.wanderDir.x * this.type.speed * 0.3 * dt;
        this.position.z += this.wanderDir.z * this.type.speed * 0.3 * dt;
        this.mesh.rotation.y = Math.atan2(this.wanderDir.x, this.wanderDir.z);
    }

    _applyGravity(getBlock) {
        // Find ground below entity
        const bx = Math.floor(this.position.x);
        const bz = Math.floor(this.position.z);
        let groundY = 0;

        for (let y = Math.floor(this.position.y) + 2; y >= 0; y--) {
            const block = getBlock(bx, y, bz);
            if (block !== 0 && block !== 6) { // not air, not water
                groundY = y + 1;
                break;
            }
        }

        // Snap to ground (smooth)
        const targetY = groundY;
        if (this.position.y > targetY) {
            this.position.y = Math.max(targetY, this.position.y - 15 * 0.016);
        } else {
            this.position.y = targetY;
        }
    }

    takeDamage(amount) {
        if (this.dead) return;
        this.health -= amount;
        this.hurtFlashTimer = 0.15;

        // Flash red
        for (const mesh of this._boxMeshes) {
            mesh.material.color.setHex(0xFF0000);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            this.dispose();
        }
    }

    _resetColors() {
        for (const mesh of this._boxMeshes) {
            if (mesh.userData.hasTexture) {
                mesh.material.color.setHex(0xFFFFFF);
            } else {
                mesh.material.color.setHex(mesh.userData.originalColor);
            }
        }
    }

    // Check if a ray from origin in direction hits this entity's AABB
    raycast(origin, direction, maxDist) {
        const halfW = this.type.width / 2;
        const min = new THREE.Vector3(
            this.position.x - halfW,
            this.position.y,
            this.position.z - halfW
        );
        const max = new THREE.Vector3(
            this.position.x + halfW,
            this.position.y + this.type.height,
            this.position.z + halfW
        );

        // AABB ray intersection
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

    canAttackPlayer(playerPosition) {
        if (!this.type.hostile || this.attackCooldown > 0 || this.dead) return false;
        const dx = playerPosition.x - this.position.x;
        const dy = playerPosition.y - this.position.y;
        const dz = playerPosition.z - this.position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) < this.type.attackRange;
    }

    getAttackDamage() {
        this.attackCooldown = 1.0; // 1 second cooldown
        return this.type.damage;
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
