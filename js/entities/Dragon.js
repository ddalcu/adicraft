import * as THREE from 'three';
import { EntityTextureManager, DRAGON_TEXTURE } from './EntityTextureManager.js';

const DRAGON_HP = 200;
const CIRCLE_RADIUS = 35;
const CIRCLE_HEIGHT = 55;
const CONTACT_DAMAGE = 8;
const CONTACT_RANGE = 4;
const CRYSTAL_HEAL_RATE = 0.5; // HP per second per living crystal

// AI phases
const PHASE_CIRCLE = 'circle';
const PHASE_DIVE = 'dive';
const PHASE_PERCH = 'perch';

// Dragon texture is 256x256 logical
const DRAGON_TEX_SIZE = 256;

export class Dragon {
    constructor(scene, crystals) {
        this.scene = scene;
        this.crystals = crystals;
        this.health = DRAGON_HP;
        this.maxHealth = DRAGON_HP;
        this.dead = false;
        this.position = new THREE.Vector3(0, CIRCLE_HEIGHT, 0);

        // AI
        this.phase = PHASE_CIRCLE;
        this.phaseTimer = 15 + Math.random() * 5;
        this.circleAngle = 0;
        this.diveTarget = null;
        this.attackCooldown = 0;

        this.mesh = this._buildMesh();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Healing beams
        this.beams = [];
    }

    _buildMesh() {
        const group = new THREE.Group();
        const texture = EntityTextureManager.getTexture(DRAGON_TEXTURE);

        // Helper to create a textured box or fallback to solid color
        const makeBox = (w, h, d, color, uvParams) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            let mat;
            if (texture && uvParams) {
                const faceUVs = EntityTextureManager.minecraftBoxUV(
                    uvParams.u, uvParams.v, uvParams.w, uvParams.h, uvParams.d
                );
                EntityTextureManager.applyBoxUVs(geo, DRAGON_TEX_SIZE, DRAGON_TEX_SIZE, faceUVs);
                mat = new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.1 });
            } else {
                mat = new THREE.MeshLambertMaterial({ color });
            }
            return new THREE.Mesh(geo, mat);
        };

        // Body (main) — use body region from dragon texture
        const body = makeBox(3, 2, 7, 0x2C0050, { u: 0, v: 0, w: 48, h: 32, d: 112 });
        body.position.set(0, 0, 0);
        group.add(body);

        // Head — use head region
        const head = makeBox(2, 1.5, 2.5, 0x2C0050, { u: 176, v: 44, w: 32, h: 24, d: 40 });
        head.position.set(0, 0.5, 4.5);
        group.add(head);

        // Eyes (glowing — keep as solid emissive, no texture)
        const eyeGeo = new THREE.BoxGeometry(0.4, 0.3, 0.3);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFF00FF });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.5, 0.7, 5.5);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeMat.clone());
        rightEye.position.set(0.5, 0.7, 5.5);
        group.add(rightEye);

        // Left wing — keep as solid color (wing texture is triangular, poor box mapping)
        const wingGeo = new THREE.BoxGeometry(7, 0.3, 4);
        const wingMat = new THREE.MeshLambertMaterial({ color: 0x3A0070 });
        this.leftWing = new THREE.Mesh(wingGeo, wingMat);
        this.leftWing.position.set(-5, 0.5, -0.5);
        group.add(this.leftWing);

        // Right wing
        this.rightWing = new THREE.Mesh(wingGeo.clone(), wingMat.clone());
        this.rightWing.position.set(5, 0.5, -0.5);
        group.add(this.rightWing);

        // Tail — use tail region
        const tail = makeBox(1, 1, 4, 0x2C0050, { u: 192, v: 104, w: 16, h: 16, d: 64 });
        tail.position.set(0, 0, -5);
        group.add(tail);

        return group;
    }

    update(dt, player, hud) {
        if (this.dead) return;

        this.attackCooldown = Math.max(0, this.attackCooldown - dt);

        // Crystal healing
        const livingCrystals = this.crystals.filter(c => !c.dead).length;
        if (livingCrystals > 0 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + CRYSTAL_HEAL_RATE * livingCrystals * dt);
        }

        // Update healing beams
        this._updateBeams();

        // Phase logic
        this.phaseTimer -= dt;

        switch (this.phase) {
            case PHASE_CIRCLE:
                this._circlePhase(dt);
                if (this.phaseTimer <= 0) {
                    this.phase = PHASE_DIVE;
                    this.phaseTimer = 5 + Math.random() * 3;
                    this.diveTarget = player.position.clone();
                }
                break;

            case PHASE_DIVE:
                this._divePhase(dt, player);
                if (this.phaseTimer <= 0) {
                    this.phase = PHASE_PERCH;
                    this.phaseTimer = 8 + Math.random() * 4;
                }
                break;

            case PHASE_PERCH:
                this._perchPhase(dt);
                if (this.phaseTimer <= 0) {
                    this.phase = PHASE_CIRCLE;
                    this.phaseTimer = 15 + Math.random() * 5;
                }
                break;
        }

        // Contact damage
        if (this.attackCooldown <= 0) {
            const dx = player.position.x - this.position.x;
            const dy = player.position.y - this.position.y;
            const dz = player.position.z - this.position.z;
            if (Math.sqrt(dx * dx + dy * dy + dz * dz) < CONTACT_RANGE) {
                player.takeDamage(CONTACT_DAMAGE, hud);
                this.attackCooldown = 1.5;
            }
        }

        this.mesh.position.copy(this.position);

        // Wing animation
        const wingFlap = Math.sin(performance.now() * 0.005) * 0.3;
        this.leftWing.rotation.z = wingFlap;
        this.rightWing.rotation.z = -wingFlap;

        // Boss bar
        if (hud) {
            hud.showBossBar('Ender Dragon', this.health, this.maxHealth);
        }
    }

    _circlePhase(dt) {
        this.circleAngle += dt * 0.3;
        this.position.x = Math.cos(this.circleAngle) * CIRCLE_RADIUS;
        this.position.z = Math.sin(this.circleAngle) * CIRCLE_RADIUS;
        this.position.y = CIRCLE_HEIGHT + Math.sin(this.circleAngle * 2) * 3;

        // Face movement direction
        this.mesh.rotation.y = -this.circleAngle + Math.PI / 2;
    }

    _divePhase(dt, player) {
        // Swoop toward the stored target position
        const target = this.diveTarget;
        const dir = new THREE.Vector3(
            target.x - this.position.x,
            (target.y + 2) - this.position.y,
            target.z - this.position.z
        );
        const dist = dir.length();
        if (dist > 1) {
            dir.normalize();
            const speed = 20;
            this.position.x += dir.x * speed * dt;
            this.position.y += dir.y * speed * dt;
            this.position.z += dir.z * speed * dt;

            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        } else {
            // Reached target, go back up
            this.position.y += 15 * dt;
        }
    }

    _perchPhase(dt) {
        // Hover low near center
        const targetY = 45;
        this.position.y += (targetY - this.position.y) * 2 * dt;
        this.position.x += (0 - this.position.x) * dt;
        this.position.z += (0 - this.position.z) * dt;
    }

    _updateBeams() {
        // Remove old beams
        for (const beam of this.beams) {
            this.scene.remove(beam);
            beam.geometry.dispose();
            beam.material.dispose();
        }
        this.beams = [];

        // Draw beams from living crystals to dragon
        for (const crystal of this.crystals) {
            if (crystal.dead) continue;
            const points = [crystal.position.clone(), this.position.clone()];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({
                color: 0xFF88FF,
                transparent: true,
                opacity: 0.5
            });
            const line = new THREE.Line(geo, mat);
            this.scene.add(line);
            this.beams.push(line);
        }
    }

    takeDamage(amount) {
        if (this.dead) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            this._onDeath();
        }
    }

    // Raycast for weapon hit detection
    raycast(origin, direction, maxDist) {
        const halfW = 5;
        const halfH = 2;
        const min = new THREE.Vector3(
            this.position.x - halfW,
            this.position.y - halfH,
            this.position.z - halfW
        );
        const max = new THREE.Vector3(
            this.position.x + halfW,
            this.position.y + halfH,
            this.position.z + halfW
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

    _onDeath() {
        // Clean up beams
        for (const beam of this.beams) {
            this.scene.remove(beam);
            beam.geometry.dispose();
            beam.material.dispose();
        }
        this.beams = [];

        // Remove mesh
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.mesh = null;
        }
    }
}
