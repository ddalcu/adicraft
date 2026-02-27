// DOM-based 3×3 crafting table overlay.
// Opened by right-clicking a crafting table block (ID 34).

import { ItemStack } from '../items/ItemStack.js';
import { getItemDef, isBlock, getItemName } from '../items/ItemRegistry.js';
import { findRecipe } from '../items/Recipes.js';

export class CraftingUI {
    constructor(inventory, getAtlas) {
        this.inventory = inventory;
        this.getAtlas = getAtlas;
        this.isOpen = false;

        // Drag state
        this.dragStack = null;

        // 3×3 crafting grid
        this.craftingSlots = Array.from({ length: 9 }, () => ItemStack.empty());
        this.craftingOutput = ItemStack.empty();

        this._tileCache = new Map();
        this._build();
    }

    _build() {
        this.container = document.createElement('div');
        this.container.id = 'crafting-overlay';
        this.container.style.cssText = `
            display:none; position:fixed; inset:0; z-index:1000;
            background:rgba(0,0,0,0.75); justify-content:center; align-items:center;
            font-family:monospace; user-select:none;
        `;

        const panel = document.createElement('div');
        panel.style.cssText = `
            background:#c6c6c6; border:3px solid #555; padding:8px;
            display:flex; flex-direction:column; gap:6px;
            image-rendering:pixelated;
        `;

        // Title
        const title = document.createElement('div');
        title.textContent = 'Crafting';
        title.style.cssText = 'text-align:center; font-size:14px; font-weight:bold; color:#404040;';
        panel.appendChild(title);

        // Crafting area: 3×3 grid + arrow + output
        const craftArea = document.createElement('div');
        craftArea.style.cssText = 'display:flex; align-items:center; gap:8px; justify-content:center;';

        // 3×3 grid
        const gridContainer = document.createElement('div');
        gridContainer.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
        this._craftSlotEls = [];
        for (let row = 0; row < 3; row++) {
            const rowEl = document.createElement('div');
            rowEl.style.cssText = 'display:flex; gap:2px;';
            for (let col = 0; col < 3; col++) {
                const idx = row * 3 + col;
                const slot = this._createSlot('craft', idx);
                this._craftSlotEls.push(slot);
                rowEl.appendChild(slot);
            }
            gridContainer.appendChild(rowEl);
        }
        craftArea.appendChild(gridContainer);

        // Arrow
        const arrow = document.createElement('div');
        arrow.textContent = '\u2192';
        arrow.style.cssText = 'font-size:24px; color:#404040; padding:0 4px;';
        craftArea.appendChild(arrow);

        // Output slot
        this._outputSlotEl = this._createSlot('output', 0);
        craftArea.appendChild(this._outputSlotEl);

        panel.appendChild(craftArea);

        // Separator
        const sep = document.createElement('div');
        sep.style.cssText = 'height:6px;';
        panel.appendChild(sep);

        // Main inventory (27 slots: 3 rows × 9 cols)
        this._mainSlots = [];
        for (let row = 0; row < 3; row++) {
            const rowEl = document.createElement('div');
            rowEl.style.cssText = 'display:flex; gap:2px;';
            for (let col = 0; col < 9; col++) {
                const slotIndex = 9 + row * 9 + col;
                const slot = this._createSlot('inv', slotIndex);
                this._mainSlots.push(slot);
                rowEl.appendChild(slot);
            }
            panel.appendChild(rowEl);
        }

        // Separator
        const sep2 = document.createElement('div');
        sep2.style.cssText = 'height:4px;';
        panel.appendChild(sep2);

        // Hotbar (9 slots)
        this._hotbarSlots = [];
        const hotbarRow = document.createElement('div');
        hotbarRow.style.cssText = 'display:flex; gap:2px;';
        for (let i = 0; i < 9; i++) {
            const slot = this._createSlot('inv', i);
            this._hotbarSlots.push(slot);
            hotbarRow.appendChild(slot);
        }
        panel.appendChild(hotbarRow);

        this.container.appendChild(panel);

        // Drag ghost
        this._dragGhost = document.createElement('div');
        this._dragGhost.style.cssText = `
            position:fixed; pointer-events:none; z-index:1001;
            width:36px; height:36px; display:none;
            image-rendering:pixelated;
        `;
        this.container.appendChild(this._dragGhost);

        // Tooltip
        this._tooltip = document.createElement('div');
        this._tooltip.style.cssText = `
            position:fixed; pointer-events:none; z-index:1002;
            background:rgba(20,0,30,0.9); color:#fff; padding:2px 6px;
            font-size:11px; border:1px solid #5030a0; display:none;
            white-space:nowrap;
        `;
        this.container.appendChild(this._tooltip);

        this.container.addEventListener('mousemove', (e) => {
            if (this.dragStack) {
                this._dragGhost.style.left = (e.clientX - 18) + 'px';
                this._dragGhost.style.top = (e.clientY - 18) + 'px';
            }
        });

        this.container.addEventListener('contextmenu', (e) => e.preventDefault());

        document.body.appendChild(this.container);
    }

    _createSlot(type, index) {
        const slot = document.createElement('div');
        slot.style.cssText = `
            width:40px; height:40px; background:#8b8b8b; border:2px solid;
            border-color:#fff #555 #555 #fff; position:relative; cursor:pointer;
        `;
        slot.dataset.type = type;
        slot.dataset.index = index;

        const icon = document.createElement('div');
        icon.style.cssText = `
            width:32px; height:32px; margin:2px; background-size:contain;
            background-repeat:no-repeat; background-position:center;
            image-rendering:pixelated;
        `;
        slot.appendChild(icon);

        const count = document.createElement('span');
        count.style.cssText = `
            position:absolute; bottom:1px; right:2px; font-size:11px;
            color:#fff; text-shadow:1px 1px 0 #333; pointer-events:none;
        `;
        slot.appendChild(count);

        const durBar = document.createElement('div');
        durBar.style.cssText = `
            position:absolute; bottom:1px; left:3px; height:2px;
            background:#0f0; display:none; pointer-events:none;
        `;
        slot.appendChild(durBar);

        slot.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.button === 0) this._handleLeftClick(type, index);
            else if (e.button === 2) this._handleRightClick(type, index);
        });

        slot.addEventListener('mouseenter', (e) => {
            if (this.dragStack) return;
            const stack = this._getStack(type, index);
            if (!stack || stack.isEmpty()) {
                this._tooltip.style.display = 'none';
                return;
            }
            this._tooltip.textContent = getItemName(stack.itemId);
            this._tooltip.style.display = 'block';
            this._tooltip.style.left = (e.clientX + 12) + 'px';
            this._tooltip.style.top = (e.clientY - 20) + 'px';
        });

        slot.addEventListener('mouseleave', () => {
            this._tooltip.style.display = 'none';
        });

        slot._icon = icon;
        slot._count = count;
        slot._durBar = durBar;
        return slot;
    }

    _getStack(type, index) {
        if (type === 'inv') return this.inventory.slots[index];
        if (type === 'craft') return this.craftingSlots[index];
        if (type === 'output') return this.craftingOutput;
        return null;
    }

    _setStack(type, index, stack) {
        if (type === 'inv') this.inventory.slots[index] = stack;
        else if (type === 'craft') this.craftingSlots[index] = stack;
        else if (type === 'output') this.craftingOutput = stack;
    }

    _handleLeftClick(type, index) {
        if (type === 'output') {
            this._handleOutputClick();
            return;
        }

        if (!this.dragStack) {
            const stack = this._getStack(type, index);
            if (stack.isEmpty()) return;
            this.dragStack = stack;
            this._setStack(type, index, ItemStack.empty());
            this._showDragGhost();
        } else {
            const target = this._getStack(type, index);
            if (target.isEmpty()) {
                this._setStack(type, index, this.dragStack);
                this.dragStack = null;
                this._hideDragGhost();
            } else if (target.itemId === this.dragStack.itemId && target.canMerge(this.dragStack)) {
                const leftover = target.addCount(this.dragStack.count);
                if (leftover <= 0) {
                    this.dragStack = null;
                    this._hideDragGhost();
                } else {
                    this.dragStack.count = leftover;
                    this._showDragGhost();
                }
            } else {
                // Swap
                this._setStack(type, index, this.dragStack);
                this.dragStack = target;
                this._showDragGhost();
            }
        }
        this._updateCraftingOutput();
        this.refresh();
        if (this.inventory.onChange) this.inventory.onChange();
    }

    _handleRightClick(type, index) {
        if (type === 'output') return;

        if (!this.dragStack) {
            const stack = this._getStack(type, index);
            if (stack.isEmpty()) return;
            const half = Math.ceil(stack.count / 2);
            this.dragStack = new ItemStack(stack.itemId, half, stack.durability);
            stack.count -= half;
            if (stack.count <= 0) {
                this._setStack(type, index, ItemStack.empty());
            }
            this._showDragGhost();
        } else {
            const target = this._getStack(type, index);
            if (target.isEmpty()) {
                this._setStack(type, index, new ItemStack(this.dragStack.itemId, 1, this.dragStack.durability));
                this.dragStack.count--;
            } else if (target.itemId === this.dragStack.itemId && target.canMerge(this.dragStack)) {
                target.addCount(1);
                this.dragStack.count--;
            }
            if (this.dragStack.count <= 0) {
                this.dragStack = null;
                this._hideDragGhost();
            }
        }
        this._updateCraftingOutput();
        this.refresh();
        if (this.inventory.onChange) this.inventory.onChange();
    }

    _handleOutputClick() {
        if (this.craftingOutput.isEmpty()) return;

        if (this.dragStack) {
            if (this.dragStack.itemId !== this.craftingOutput.itemId) return;
            const def = getItemDef(this.dragStack.itemId);
            const maxStack = def ? def.stackSize : 64;
            if (this.dragStack.count + this.craftingOutput.count > maxStack) return;
            this.dragStack.count += this.craftingOutput.count;
        } else {
            this.dragStack = this.craftingOutput.clone();
            this._showDragGhost();
        }

        // Consume one of each ingredient
        for (let i = 0; i < 9; i++) {
            if (!this.craftingSlots[i].isEmpty()) {
                this.craftingSlots[i].count--;
                if (this.craftingSlots[i].count <= 0) {
                    this.craftingSlots[i] = ItemStack.empty();
                }
            }
        }

        this._updateCraftingOutput();
        this.refresh();
    }

    _updateCraftingOutput() {
        const grid = this.craftingSlots.map(s => s.isEmpty() ? 0 : s.itemId);
        const result = findRecipe(grid, 3, 3);
        this.craftingOutput = result ? new ItemStack(result.id, result.count) : ItemStack.empty();
    }

    _showDragGhost() {
        if (!this.dragStack || this.dragStack.isEmpty()) {
            this._hideDragGhost();
            return;
        }
        this._dragGhost.style.display = 'block';
        this._dragGhost.style.backgroundImage = this._getItemIcon(this.dragStack.itemId);
        this._dragGhost.style.backgroundSize = 'contain';
        this._dragGhost.style.backgroundRepeat = 'no-repeat';
    }

    _hideDragGhost() {
        this._dragGhost.style.display = 'none';
    }

    _getItemIcon(itemId) {
        if (this._tileCache.has(itemId)) return `url(${this._tileCache.get(itemId)})`;

        const def = getItemDef(itemId);
        if (!def) return 'none';

        if (isBlock(itemId)) {
            const atlas = this.getAtlas();
            if (atlas && atlas._canvas) {
                try {
                    const BT = window._BLOCK_TYPES;
                    if (BT && BT[itemId]) {
                        const { col, row } = BT[itemId].topUV;
                        const url = atlas.getTileDataURL(col, row);
                        this._tileCache.set(itemId, url);
                        return `url(${url})`;
                    }
                } catch {}
            }
        }

        const c = document.createElement('canvas');
        c.width = 32; c.height = 32;
        const ctx = c.getContext('2d');
        if (def.category === 'tool') {
            this._drawToolIcon(ctx, def);
        } else {
            ctx.fillStyle = def.color || '#888';
            ctx.fillRect(4, 4, 24, 24);
        }
        const url = c.toDataURL();
        this._tileCache.set(itemId, url);
        return `url(${url})`;
    }

    _drawToolIcon(ctx, def) {
        const color = def.color || '#888';
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(14, 16, 4, 14);
        ctx.fillStyle = color;
        switch (def.toolType) {
            case 'pickaxe':
                ctx.fillRect(4, 4, 24, 6);
                ctx.fillRect(4, 10, 4, 4);
                ctx.fillRect(24, 10, 4, 4);
                break;
            case 'axe':
                ctx.fillRect(4, 4, 14, 6);
                ctx.fillRect(4, 10, 10, 6);
                break;
            case 'shovel':
                ctx.fillRect(10, 2, 12, 14);
                break;
            case 'sword':
                ctx.fillRect(12, 2, 8, 18);
                ctx.fillRect(8, 14, 16, 4);
                break;
            case 'hoe':
                ctx.fillRect(4, 4, 18, 6);
                break;
        }
    }

    _buildTileCache() {
        const atlas = this.getAtlas();
        if (!atlas || !atlas._canvas) return;
        if (window._BLOCK_TYPES) {
            for (let id = 1; id <= 255; id++) {
                const bt = window._BLOCK_TYPES[id];
                if (!bt || !bt.topUV) continue;
                if (this._tileCache.has(id)) continue;
                const { col, row } = bt.topUV;
                this._tileCache.set(id, atlas.getTileDataURL(col, row));
            }
        }
    }

    open() {
        this.isOpen = true;
        this.container.style.display = 'flex';
        this._buildTileCache();
        this._updateCraftingOutput();
        this.refresh();
        if (document.pointerLockElement) document.exitPointerLock();
    }

    close() {
        this.isOpen = false;
        this.container.style.display = 'none';
        this._tooltip.style.display = 'none';

        // Return drag stack to inventory
        if (this.dragStack) {
            this.inventory.addItem(this.dragStack.itemId, this.dragStack.count, this.dragStack.durability);
            this.dragStack = null;
            this._hideDragGhost();
        }

        // Return crafting grid items to inventory
        for (let i = 0; i < 9; i++) {
            if (!this.craftingSlots[i].isEmpty()) {
                this.inventory.addItem(this.craftingSlots[i].itemId, this.craftingSlots[i].count, this.craftingSlots[i].durability);
                this.craftingSlots[i] = ItemStack.empty();
            }
        }
        this.craftingOutput = ItemStack.empty();

        if (this.inventory.onChange) this.inventory.onChange();
    }

    refresh() {
        // Crafting slots
        for (let i = 0; i < this._craftSlotEls.length; i++) {
            this._renderSlot(this._craftSlotEls[i], this.craftingSlots[i]);
        }

        // Output slot
        this._renderSlot(this._outputSlotEl, this.craftingOutput);

        // Inventory slots
        const allInvSlots = [...this._hotbarSlots, ...this._mainSlots];
        for (const el of allInvSlots) {
            const idx = parseInt(el.dataset.index);
            this._renderSlot(el, this.inventory.slots[idx]);
        }
    }

    _renderSlot(el, stack) {
        const icon = el._icon;
        const countEl = el._count;
        const durBar = el._durBar;

        if (!stack || stack.isEmpty()) {
            icon.style.backgroundImage = 'none';
            icon.style.backgroundColor = 'transparent';
            countEl.textContent = '';
            durBar.style.display = 'none';
        } else {
            const imgStr = this._getItemIcon(stack.itemId);
            if (imgStr.startsWith('url(')) {
                icon.style.backgroundImage = imgStr;
                icon.style.backgroundColor = 'transparent';
            } else {
                icon.style.backgroundImage = 'none';
                const def = getItemDef(stack.itemId);
                icon.style.backgroundColor = def ? def.color : '#888';
            }
            countEl.textContent = stack.count > 1 ? stack.count : '';

            if (stack.durability >= 0) {
                const def = getItemDef(stack.itemId);
                const max = def ? def.baseDurability : 1;
                const pct = stack.durability / max;
                durBar.style.display = 'block';
                durBar.style.width = Math.round(pct * 34) + 'px';
                durBar.style.background = pct > 0.5 ? '#0f0' : pct > 0.25 ? '#ff0' : '#f00';
            } else {
                durBar.style.display = 'none';
            }
        }
    }
}
