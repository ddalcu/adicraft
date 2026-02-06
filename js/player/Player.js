import * as THREE from 'three';
import {
    MOUSE_SENSITIVITY, MAX_PITCH, MOVE_SPEED, JUMP_VELOCITY,
    GRAVITY, PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_EYE_HEIGHT, CHUNK_HEIGHT
} from '../utils/constants.js';
import { isSolid } from '../world/BlockTypes.js';

export class Player {
    constructor(camera, input, world) {
        this.camera = camera;
        this.input = input;
        this.world = world;

        this.position = new THREE.Vector3(8, CHUNK_HEIGHT, 8);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.yaw = 0;
        this.pitch = 0;
        this.onGround = false;

        this.halfWidth = PLAYER_WIDTH / 2;
    }

    update(dt) {
        this._handleMouseLook();
        this._handleMovement(dt);
        this._applyPhysics(dt);
        this._updateCamera();
    }

    _handleMouseLook() {
        const { dx, dy } = this.input.consumeMouse();
        this.yaw -= dx * MOUSE_SENSITIVITY;
        this.pitch -= dy * MOUSE_SENSITIVITY;
        this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
    }

    _handleMovement(dt) {
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

        this.velocity.x = moveDir.x * MOVE_SPEED;
        this.velocity.z = moveDir.z * MOVE_SPEED;

        if (this.input.isKeyDown('Space') && this.onGround) {
            this.velocity.y = JUMP_VELOCITY;
            this.onGround = false;
        }
    }

    _applyPhysics(dt) {
        this.velocity.y -= GRAVITY * dt;
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
                    const block = this.world.getBlock(bx, by, bz);
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
