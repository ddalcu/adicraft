// Represents a stack of items in an inventory slot.

import { getItemDef } from './ItemRegistry.js';

export class ItemStack {
    constructor(itemId, count = 1, durability = -1) {
        this.itemId = itemId;
        this.count = count;
        this.durability = durability; // -1 = no durability tracking
    }

    static empty() {
        return new ItemStack(0, 0);
    }

    isEmpty() {
        return this.itemId === 0 || this.count <= 0;
    }

    getMaxStack() {
        const def = getItemDef(this.itemId);
        return def ? def.stackSize : 64;
    }

    canMerge(other) {
        return this.itemId === other.itemId
            && this.durability === -1
            && other.durability === -1
            && this.count < this.getMaxStack();
    }

    // Returns leftover count that couldn't be added
    addCount(amount) {
        const max = this.getMaxStack();
        const canAdd = max - this.count;
        const toAdd = Math.min(amount, canAdd);
        this.count += toAdd;
        return amount - toAdd;
    }

    clone() {
        return new ItemStack(this.itemId, this.count, this.durability);
    }

    toJSON() {
        if (this.isEmpty()) return null;
        const obj = { id: this.itemId, n: this.count };
        if (this.durability >= 0) obj.d = this.durability;
        return obj;
    }

    static fromJSON(obj) {
        if (!obj || !obj.id) return ItemStack.empty();
        return new ItemStack(obj.id, obj.n || 1, obj.d ?? -1);
    }
}
