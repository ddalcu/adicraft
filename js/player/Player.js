import * as THREE from 'three';
import {
    MOUSE_SENSITIVITY, MAX_PITCH, MOVE_SPEED, FLY_SPEED, JUMP_VELOCITY,
    GRAVITY, PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_EYE_HEIGHT, CHUNK_HEIGHT,
    DOUBLE_TAP_WINDOW
} from '../utils/constants.js';
import { isSolid } from '../world/BlockTypes.js';

export class Player {
    constructor(camera, input, getWorld, sound) {
        this.camera = camera;
        this.input = input;
        this.getWorld = getWorld;
        this.sound = sound;

        this.spawnPosition = new THREE.Vector3(8, CHUNK_HEIGHT, 8);
        this.position = this.spawnPosition.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.yaw = 0;
        this.pitch = 0;
        this.onGround = false;
        this.flying = false;
        this._lastSpacePressTime = 0;

        this.halfWidth = PLAYER_WIDTH / 2;

        // Health
        this.maxHealth = 20;
        this.health = this.maxHealth;
        this.dead = false;
        this.invulnTimer = 0; // brief invulnerability after hit
    }

    get world() {
        return this.getWorld();
    }

    update(dt) {
        if (this.dead) return;

        this.invulnTimer = Math.max(0, this.invulnTimer - dt);

        this._handleMouseLook();
        this._handleMovement(dt);
        this._applyPhysics(dt);
        this._updateCamera();
    }

    takeDamage(amount, hud) {
        if (this.dead || this.invulnTimer > 0) return;
        this.health -= amount;
        this.invulnTimer = 0.5;

        if (this.sound) this.sound.playHurt();
        if (hud) hud.showDamageFlash();

        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            if (hud) hud.showDeathScreen();
        }
    }

    respawn(hud) {
        this.position.copy(this.spawnPosition);
        this.velocity.set(0, 0, 0);
        this.health = this.maxHealth;
        this.dead = false;
        this.invulnTimer = 1.0;
        if (hud) hud.hideDeathScreen();
    }

    _handleMouseLook() {
        const { dx, dy } = this.input.consumeMouse();
        this.yaw -= dx * MOUSE_SENSITIVITY;
        this.pitch -= dy * MOUSE_SENSITIVITY;
        this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
    }

    _handleMovement(dt) {
        // Double-tap Space to toggle fly mode
        if (this.input.wasJustPressed('Space')) {
            const now = performance.now();
            if (now - this._lastSpacePressTime < DOUBLE_TAP_WINDOW) {
                this.flying = !this.flying;
                this.velocity.y = 0;
                this._lastSpacePressTime = 0;
            } else {
                this._lastSpacePressTime = now;
            }
        }

        const speed = this.flying ? FLY_SPEED : MOVE_SPEED;

        const forward = new THREE.Vector3(
            -Math.sin(this.yaw),
            0,
            -Math.cos(this.yaw)
        );
        const right = new THREE.Vector3(
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        );

        const moveDir = new THREE.Vector3(0, 0, 0);

        if (this.input.isKeyDown('KeyW')) moveDir.add(forward);
        if (this.input.isKeyDown('KeyS')) moveDir.sub(forward);
        if (this.input.isKeyDown('KeyA')) moveDir.sub(right);
        if (this.input.isKeyDown('KeyD')) moveDir.add(right);

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
        }

        this.velocity.x = moveDir.x * speed;
        this.velocity.z = moveDir.z * speed;

        if (this.flying) {
            let vy = 0;
            if (this.input.isKeyDown('Space')) vy += FLY_SPEED;
            if (this.input.isKeyDown('ShiftLeft') || this.input.isKeyDown('ShiftRight')) vy -= FLY_SPEED;
            this.velocity.y = vy;
        } else if (this.input.isKeyDown('Space') && this.onGround) {
            this.velocity.y = JUMP_VELOCITY;
            this.onGround = false;
            if (this.sound) this.sound.playJump();
        }

        // Footstep sounds when walking on ground
        const isWalking = !this.flying && this.onGround && moveDir.lengthSq() > 0;
        if (this.sound) this.sound.updateWalking(dt, isWalking);
    }

    _applyPhysics(dt) {
        if (!this.flying) {
            this.velocity.y -= GRAVITY * dt;
        }
        this.onGround = false;

        // Move and resolve each axis independently
        this.position.x += this.velocity.x * dt;
        this._resolveAxis('x');

        this.position.y += this.velocity.y * dt;
        this._resolveAxis('y');

        this.position.z += this.velocity.z * dt;
        this._resolveAxis('z');

        // Prevent falling into the void
        if (this.position.y < -10) {
            this.position.y = CHUNK_HEIGHT;
            this.velocity.y = 0;
        }
    }

    _resolveAxis(axis) {
        const world = this.world;
        const min = new THREE.Vector3(
            this.position.x - this.halfWidth,
            this.position.y,
            this.position.z - this.halfWidth
        );
        const max = new THREE.Vector3(
            this.position.x + this.halfWidth,
            this.position.y + PLAYER_HEIGHT,
            this.position.z + this.halfWidth
        );

        const startX = Math.floor(min.x);
        const endX = Math.floor(max.x);
        const startY = Math.floor(min.y);
        const endY = Math.floor(max.y);
        const startZ = Math.floor(min.z);
        const endZ = Math.floor(max.z);

        for (let bx = startX; bx <= endX; bx++) {
            for (let by = startY; by <= endY; by++) {
                for (let bz = startZ; bz <= endZ; bz++) {
                    const block = world.getBlock(bx, by, bz);
                    if (!isSolid(block)) continue;

                    // Block AABB is [bx, bx+1] x [by, by+1] x [bz, bz+1]
                    const overlap = this._getOverlap(min, max, bx, by, bz);
                    if (overlap === null) continue;

                    if (axis === 'x') {
                        if (this.velocity.x > 0) {
                            this.position.x -= overlap.x;
                        } else {
                            this.position.x += overlap.x;
                        }
                        this.velocity.x = 0;
                        return;
                    } else if (axis === 'y') {
                        if (this.velocity.y < 0) {
                            this.position.y += overlap.y;
                            this.onGround = true;
                        } else {
                            this.position.y -= overlap.y;
                        }
                        this.velocity.y = 0;
                        return;
                    } else {
                        if (this.velocity.z > 0) {
                            this.position.z -= overlap.z;
                        } else {
                            this.position.z += overlap.z;
                        }
                        this.velocity.z = 0;
                        return;
                    }
                }
            }
        }
    }

    _getOverlap(min, max, bx, by, bz) {
        const overlapX = Math.min(max.x - bx, bx + 1 - min.x);
        const overlapY = Math.min(max.y - by, by + 1 - min.y);
        const overlapZ = Math.min(max.z - bz, bz + 1 - min.z);

        if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
            return { x: overlapX, y: overlapY, z: overlapZ };
        }
        return null;
    }

    _updateCamera() {
        this.camera.position.set(
            this.position.x,
            this.position.y + PLAYER_EYE_HEIGHT,
            this.position.z
        );

        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }
}
