import * as THREE from 'three';
import { REACH_DISTANCE } from '../utils/constants.js';
import { isSolid, BLOCK_TYPES } from '../world/BlockTypes.js';
import { isBlock, getItemDef, TIER_LEVELS } from '../items/ItemRegistry.js';
import { ItemStack } from '../items/ItemStack.js';

export class BlockInteraction {
    constructor(camera, getWorld, scene, input, sound) {
        this.camera = camera;
        this.getWorld = getWorld;
        this.scene = scene;
        this.input = input;
        this.sound = sound;
        this.inventory = null; // set from main.js

        this.selectedSlot = 0;
        this.selectedBlockType = 1; // kept for backward compat

        // Block highlight wireframe
        this.highlight = this._createHighlight();
        this.scene.add(this.highlight);
        this.highlight.visible = false;

        this.targetBlock = null;
        this.targetNormal = null;

        // Mining progress
        this._miningTarget = null; // {x,y,z} of block being mined
        this._miningProgress = 0;
        this._miningTime = 0;
        this._miningCanHarvest = true;

        // Network callback
        this.onBlockChange = null;

        // Crafting table interaction callback
        this.onOpenCraftingTable = null;

        // Track last placed block for waystone detection
        this._lastPlacedBlock = null;
        this._lastPlacedPos = null;
    }

    get world() {
        return this.getWorld();
    }

    getHeldBlockType() {
        if (this.inventory) {
            const stack = this.inventory.getHotbarSlot(this.selectedSlot);
            if (stack && !stack.isEmpty() && isBlock(stack.itemId)) {
                return stack.itemId;
            }
            return 0;
        }
        return this.selectedBlockType;
    }

    getHeldItemId() {
        if (this.inventory) {
            const stack = this.inventory.getHotbarSlot(this.selectedSlot);
            return (stack && !stack.isEmpty()) ? stack.itemId : 0;
        }
        return this.selectedBlockType;
    }

    // Get tool definition if holding a tool
    _getHeldTool() {
        if (!this.inventory) return null;
        const stack = this.inventory.getHotbarSlot(this.selectedSlot);
        if (!stack || stack.isEmpty()) return null;
        const def = getItemDef(stack.itemId);
        if (!def || def.category !== 'tool') return null;
        return def;
    }

    // Get mining time for a block given current tool
    _getMiningTime(blockId) {
        const blockDef = BLOCK_TYPES[blockId];
        if (!blockDef) return 0.5;

        const hardness = blockDef.hardness || 0.5;
        if (hardness === Infinity) return Infinity;

        const tool = this._getHeldTool();
        let speedMultiplier = 1.0;
        let canHarvest = true;

        // Correct tool bonus
        if (tool && tool.toolType === blockDef.preferredTool) {
            speedMultiplier = tool.miningSpeed;
        }

        // Check tier requirement
        if (blockDef.minTier) {
            const required = TIER_LEVELS[blockDef.minTier] ?? 0;
            const hasTier = tool ? (TIER_LEVELS[tool.tier] ?? -1) : -1;
            if (hasTier < required) {
                canHarvest = false;
                speedMultiplier = 0.3; // much slower without correct tier
            }
        }

        this._miningCanHarvest = canHarvest;
        return hardness / speedMultiplier;
    }

    // Get mining progress as 0-1
    getMiningProgress() {
        if (!this._miningTarget || this._miningTime <= 0) return 0;
        return Math.min(1, this._miningProgress / this._miningTime);
    }

    _createHighlight() {
        const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
        const edges = new THREE.EdgesGeometry(geo);
        const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const line = new THREE.LineSegments(edges, mat);
        geo.dispose();
        return line;
    }

    update(dt) {
        this._raycast();

        const clicks = this.input.consumeClicks();

        // Handle right click
        if (this.targetBlock && clicks.right) {
            const { x, y, z } = this.targetBlock;
            const blockId = this.world.getBlock(x, y, z);
            if (blockId === 34 && this.onOpenCraftingTable) {
                this.onOpenCraftingTable();
            } else {
                this._placeBlock();
            }
        }

        // Handle left click (mining)
        if (this.targetBlock && (clicks.left || this.input.mouseLeft)) {
            const { x, y, z } = this.targetBlock;

            // Check if we're mining a new block
            if (!this._miningTarget ||
                this._miningTarget.x !== x ||
                this._miningTarget.y !== y ||
                this._miningTarget.z !== z) {
                // Start mining new block
                const blockId = this.world.getBlock(x, y, z);
                this._miningTarget = { x, y, z };
                this._miningProgress = 0;
                this._miningTime = this._getMiningTime(blockId);
            }

            // Advance mining
            if (dt > 0) {
                this._miningProgress += dt;
            } else {
                // Fallback for when dt isn't passed (single click)
                this._miningProgress += 0.016;
            }

            // Darken highlight based on progress
            const progress = this.getMiningProgress();
            if (this.highlight.material) {
                const darkness = Math.floor(progress * 5);
                const colors = [0x000000, 0x333300, 0x666600, 0x996600, 0xCC3300, 0xFF0000];
                this.highlight.material.color.setHex(colors[Math.min(darkness, 5)]);
            }

            // Check if mining complete
            if (this._miningProgress >= this._miningTime && this._miningTime !== Infinity) {
                this._breakBlock();
                this._miningTarget = null;
                this._miningProgress = 0;
            }
        } else {
            // Not mining — reset
            if (this._miningTarget) {
                this._miningTarget = null;
                this._miningProgress = 0;
                if (this.highlight.material) {
                    this.highlight.material.color.setHex(0x000000);
                }
            }
        }
    }

    _raycast() {
        const world = this.world;
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
        const blockId = this.world.getBlock(x, y, z);

        if (this.onBlockChange) {
            this.onBlockChange(x, y, z, 0);
        } else {
            this.world.setBlock(x, y, z, 0);
        }

        // Add broken block to inventory (only if can harvest)
        if (this.inventory && blockId > 0 && this._miningCanHarvest) {
            this.inventory.addItem(blockId, 1);
        }

        // Consume tool durability
        if (this.inventory) {
            const stack = this.inventory.getHotbarSlot(this.selectedSlot);
            if (stack && !stack.isEmpty() && stack.durability >= 0) {
                stack.durability--;
                if (stack.durability <= 0) {
                    this.inventory.slots[this.selectedSlot] = ItemStack.empty();
                    if (this.sound) this.sound.playToolBreak();
                }
                if (this.inventory.onChange) this.inventory.onChange();
            }
        }

        if (this.sound) this.sound.playBlockBreak();
    }

    _placeBlock() {
        if (!this.targetBlock || !this.targetNormal) return;

        const blockType = this.getHeldBlockType();
        if (blockType === 0) return;

        if (this.inventory) {
            const stack = this.inventory.getHotbarSlot(this.selectedSlot);
            if (!stack || stack.isEmpty()) return;
        }

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
            this.onBlockChange(px, py, pz, blockType);
        } else {
            this.world.setBlock(px, py, pz, blockType);
        }

        this._lastPlacedBlock = blockType;
        this._lastPlacedPos = new THREE.Vector3(px, py, pz);

        if (this.inventory) {
            this.inventory.removeFromSlot(this.selectedSlot, 1);
        }

        if (this.sound) this.sound.playBlockPlace();
    }
}
