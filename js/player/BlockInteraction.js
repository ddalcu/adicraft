import * as THREE from 'three';
import { REACH_DISTANCE } from '../utils/constants.js';
import { isSolid } from '../world/BlockTypes.js';

export class BlockInteraction {
    constructor(camera, getWorld, scene, input, sound) {
        this.camera = camera;
        this.getWorld = getWorld;
        this.scene = scene;
        this.input = input;
        this.sound = sound;

        this.selectedSlot = 0;
        this.selectedBlockType = 1; // grass

        // Block highlight wireframe
        this.highlight = this._createHighlight();
        this.scene.add(this.highlight);
        this.highlight.visible = false;

        this.targetBlock = null;
        this.targetNormal = null;

        // Network callback: if set, block changes route through this instead of direct world.setBlock
        this.onBlockChange = null;

        // Track last placed block for waystone detection
        this._lastPlacedBlock = null;
        this._lastPlacedPos = null;
    }

    get world() {
        return this.getWorld();
    }

    _createHighlight() {
        const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
        const edges = new THREE.EdgesGeometry(geo);
        const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const line = new THREE.LineSegments(edges, mat);
        geo.dispose();
        return line;
    }

    update() {
        this._raycast();

        const clicks = this.input.consumeClicks();
        if (this.targetBlock) {
            if (clicks.left) {
                this._breakBlock();
            }
            if (clicks.right) {
                this._placeBlock();
            }
        }
    }

    _raycast() {
        const world = this.world;
        // DDA voxel traversal
        const origin = this.camera.position.clone();
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);

        let x = Math.floor(origin.x);
        let y = Math.floor(origin.y);
        let z = Math.floor(origin.z);

        const stepX = direction.x >= 0 ? 1 : -1;
        const stepY = direction.y >= 0 ? 1 : -1;
        const stepZ = direction.z >= 0 ? 1 : -1;

        const tDeltaX = direction.x !== 0 ? Math.abs(1 / direction.x) : Infinity;
        const tDeltaY = direction.y !== 0 ? Math.abs(1 / direction.y) : Infinity;
        const tDeltaZ = direction.z !== 0 ? Math.abs(1 / direction.z) : Infinity;

        let tMaxX = direction.x !== 0
            ? ((direction.x > 0 ? (x + 1 - origin.x) : (origin.x - x)) * tDeltaX)
            : Infinity;
        let tMaxY = direction.y !== 0
            ? ((direction.y > 0 ? (y + 1 - origin.y) : (origin.y - y)) * tDeltaY)
            : Infinity;
        let tMaxZ = direction.z !== 0
            ? ((direction.z > 0 ? (z + 1 - origin.z) : (origin.z - z)) * tDeltaZ)
            : Infinity;

        let t = 0;
        let normalX = 0, normalY = 0, normalZ = 0;

        this.targetBlock = null;
        this.targetNormal = null;
        this.highlight.visible = false;

        while (t < REACH_DISTANCE) {
            const block = world.getBlock(x, y, z);
            if (isSolid(block)) {
                this.targetBlock = { x, y, z };
                this.targetNormal = { x: normalX, y: normalY, z: normalZ };
                this.highlight.visible = true;
                this.highlight.position.set(x + 0.5, y + 0.5, z + 0.5);
                return;
            }

            if (tMaxX < tMaxY) {
                if (tMaxX < tMaxZ) {
                    t = tMaxX;
                    tMaxX += tDeltaX;
                    x += stepX;
                    normalX = -stepX; normalY = 0; normalZ = 0;
                } else {
                    t = tMaxZ;
                    tMaxZ += tDeltaZ;
                    z += stepZ;
                    normalX = 0; normalY = 0; normalZ = -stepZ;
                }
            } else {
                if (tMaxY < tMaxZ) {
                    t = tMaxY;
                    tMaxY += tDeltaY;
                    y += stepY;
                    normalX = 0; normalY = -stepY; normalZ = 0;
                } else {
                    t = tMaxZ;
                    tMaxZ += tDeltaZ;
                    z += stepZ;
                    normalX = 0; normalY = 0; normalZ = -stepZ;
                }
            }
        }
    }

    _breakBlock() {
        if (!this.targetBlock) return;
        const { x, y, z } = this.targetBlock;
        if (this.onBlockChange) {
            this.onBlockChange(x, y, z, 0);
        } else {
            this.world.setBlock(x, y, z, 0);
        }
        if (this.sound) this.sound.playBlockBreak();
    }

    _placeBlock() {
        if (!this.targetBlock || !this.targetNormal) return;

        const px = this.targetBlock.x + this.targetNormal.x;
        const py = this.targetBlock.y + this.targetNormal.y;
        const pz = this.targetBlock.z + this.targetNormal.z;

        // Don't place inside the player
        const cam = this.camera.position;
        const playerMinX = cam.x - 0.3;
        const playerMaxX = cam.x + 0.3;
        const playerMinY = cam.y - 1.52;
        const playerMaxY = cam.y + 0.1;
        const playerMinZ = cam.z - 0.3;
        const playerMaxZ = cam.z + 0.3;

        if (px + 1 > playerMinX && px < playerMaxX &&
            py + 1 > playerMinY && py < playerMaxY &&
            pz + 1 > playerMinZ && pz < playerMaxZ) {
            return;
        }

        if (this.onBlockChange) {
            this.onBlockChange(px, py, pz, this.selectedBlockType);
        } else {
            this.world.setBlock(px, py, pz, this.selectedBlockType);
        }

        // Track placed block for waystone detection
        this._lastPlacedBlock = this.selectedBlockType;
        this._lastPlacedPos = new THREE.Vector3(px, py, pz);

        if (this.sound) this.sound.playBlockPlace();
    }
}
