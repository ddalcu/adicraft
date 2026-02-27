// 36-slot inventory: slots 0-8 = hotbar, slots 9-35 = main inventory.

import { ItemStack } from './ItemStack.js';
import { getItemDef } from './ItemRegistry.js';

export class Inventory {
    constructor() {
        this.slots = new Array(36).fill(null).map(() => ItemStack.empty());
        this.onChange = null; // callback when inventory changes
    }

    getHotbarSlot(index) {
        return this.slots[index]; // 0-8
    }

    // Add item to inventory, returns leftover count
    addItem(itemId, count = 1, durability = -1) {
        const def = getItemDef(itemId);
        if (!def) return count;

        // Tools don't stack — go straight to empty slots
        if (def.stackSize === 1) {
            for (let i = 0; i < 36; i++) {
                if (count <= 0) break;
                if (this.slots[i].isEmpty()) {
                    this.slots[i] = new ItemStack(itemId, 1, durability >= 0 ? durability : (def.baseDurability || -1));
                    count--;
                }
            }
            if (this.onChange) this.onChange();
            return count;
        }

        // First pass: merge with existing stacks
        for (let i = 0; i < 36; i++) {
            if (count <= 0) break;
            const slot = this.slots[i];
            if (!slot.isEmpty() && slot.itemId === itemId && slot.canMerge(new ItemStack(itemId))) {
                count = slot.addCount(count);
            }
        }

        // Second pass: fill empty slots
        for (let i = 0; i < 36; i++) {
            if (count <= 0) break;
            if (this.slots[i].isEmpty()) {
                const maxStack = def.stackSize;
                const toPlace = Math.min(count, maxStack);
                this.slots[i] = new ItemStack(itemId, toPlace, durability);
                count -= toPlace;
            }
        }

        if (this.onChange) this.onChange();
        return count; // leftover
    }

    // Remove from specific slot
    removeFromSlot(slotIndex, count = 1) {
        const slot = this.slots[slotIndex];
        if (slot.isEmpty()) return;
        slot.count -= count;
        if (slot.count <= 0) {
            this.slots[slotIndex] = ItemStack.empty();
        }
        if (this.onChange) this.onChange();
    }

    // Swap two slots (for drag & drop)
    swapSlots(from, to) {
        const temp = this.slots[from];
        this.slots[from] = this.slots[to];
        this.slots[to] = temp;
        if (this.onChange) this.onChange();
    }

    // Try to merge from -> to, return true if fully merged
    mergeSlots(from, to) {
        const src = this.slots[from];
        const dst = this.slots[to];
        if (src.isEmpty()) return true;
        if (dst.isEmpty()) {
            this.slots[to] = src;
            this.slots[from] = ItemStack.empty();
            if (this.onChange) this.onChange();
            return true;
        }
        if (src.itemId === dst.itemId && dst.canMerge(src)) {
            const leftover = dst.addCount(src.count);
            if (leftover <= 0) {
                this.slots[from] = ItemStack.empty();
            } else {
                src.count = leftover;
            }
            if (this.onChange) this.onChange();
            return leftover <= 0;
        }
        // Different items: swap
        this.swapSlots(from, to);
        return true;
    }

    toJSON() {
        return this.slots.map(s => s.toJSON());
    }

    static fromJSON(data) {
        const inv = new Inventory();
        if (Array.isArray(data)) {
            for (let i = 0; i < Math.min(data.length, 36); i++) {
                inv.slots[i] = ItemStack.fromJSON(data[i]);
            }
        }
        return inv;
    }

    static createDefault() {
        const inv = new Inventory();
        const defaultBlocks = [1, 2, 3, 4, 5, 7, 24, 25, 32];
        for (let i = 0; i < 9; i++) {
            inv.slots[i] = new ItemStack(defaultBlocks[i], 64);
        }
        return inv;
    }
}
