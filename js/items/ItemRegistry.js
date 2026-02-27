// Unified item registry — blocks (0-255) and non-block items (256+).
// Block items derive their metadata from BLOCK_TYPES at runtime.

import { BLOCK_TYPES } from '../world/BlockTypes.js';

// Tool tier hierarchy
export const TIER_LEVELS = { wood: 0, stone: 1, iron: 2, diamond: 3 };

// Non-block item definitions (256+)
export const ITEM_TYPES = {
    // --- Pickaxes (256-259) ---
    256: { name: 'wooden_pickaxe', stackSize: 1, category: 'tool',
           toolType: 'pickaxe', tier: 'wood', baseDurability: 59,
           miningSpeed: 2.0, attackDamage: 2, color: '#8B6914' },
    257: { name: 'stone_pickaxe', stackSize: 1, category: 'tool',
           toolType: 'pickaxe', tier: 'stone', baseDurability: 131,
           miningSpeed: 4.0, attackDamage: 3, color: '#808080' },
    258: { name: 'iron_pickaxe', stackSize: 1, category: 'tool',
           toolType: 'pickaxe', tier: 'iron', baseDurability: 250,
           miningSpeed: 6.0, attackDamage: 4, color: '#C8C8C8' },
    259: { name: 'diamond_pickaxe', stackSize: 1, category: 'tool',
           toolType: 'pickaxe', tier: 'diamond', baseDurability: 1561,
           miningSpeed: 8.0, attackDamage: 5, color: '#5DECF5' },

    // --- Axes (260-263) ---
    260: { name: 'wooden_axe', stackSize: 1, category: 'tool',
           toolType: 'axe', tier: 'wood', baseDurability: 59,
           miningSpeed: 2.0, attackDamage: 7, color: '#8B6914' },
    261: { name: 'stone_axe', stackSize: 1, category: 'tool',
           toolType: 'axe', tier: 'stone', baseDurability: 131,
           miningSpeed: 4.0, attackDamage: 9, color: '#808080' },
    262: { name: 'iron_axe', stackSize: 1, category: 'tool',
           toolType: 'axe', tier: 'iron', baseDurability: 250,
           miningSpeed: 6.0, attackDamage: 9, color: '#C8C8C8' },
    263: { name: 'diamond_axe', stackSize: 1, category: 'tool',
           toolType: 'axe', tier: 'diamond', baseDurability: 1561,
           miningSpeed: 8.0, attackDamage: 9, color: '#5DECF5' },

    // --- Shovels (264-267) ---
    264: { name: 'wooden_shovel', stackSize: 1, category: 'tool',
           toolType: 'shovel', tier: 'wood', baseDurability: 59,
           miningSpeed: 2.0, attackDamage: 1, color: '#8B6914' },
    265: { name: 'stone_shovel', stackSize: 1, category: 'tool',
           toolType: 'shovel', tier: 'stone', baseDurability: 131,
           miningSpeed: 4.0, attackDamage: 2, color: '#808080' },
    266: { name: 'iron_shovel', stackSize: 1, category: 'tool',
           toolType: 'shovel', tier: 'iron', baseDurability: 250,
           miningSpeed: 6.0, attackDamage: 3, color: '#C8C8C8' },
    267: { name: 'diamond_shovel', stackSize: 1, category: 'tool',
           toolType: 'shovel', tier: 'diamond', baseDurability: 1561,
           miningSpeed: 8.0, attackDamage: 4, color: '#5DECF5' },

    // --- Swords (268-271) ---
    268: { name: 'wooden_sword', stackSize: 1, category: 'tool',
           toolType: 'sword', tier: 'wood', baseDurability: 59,
           miningSpeed: 1.0, attackDamage: 4, color: '#8B6914' },
    269: { name: 'stone_sword', stackSize: 1, category: 'tool',
           toolType: 'sword', tier: 'stone', baseDurability: 131,
           miningSpeed: 1.0, attackDamage: 5, color: '#808080' },
    270: { name: 'iron_sword', stackSize: 1, category: 'tool',
           toolType: 'sword', tier: 'iron', baseDurability: 250,
           miningSpeed: 1.0, attackDamage: 6, color: '#C8C8C8' },
    271: { name: 'diamond_sword', stackSize: 1, category: 'tool',
           toolType: 'sword', tier: 'diamond', baseDurability: 1561,
           miningSpeed: 1.0, attackDamage: 7, color: '#5DECF5' },

    // --- Hoes (272-275) ---
    272: { name: 'wooden_hoe', stackSize: 1, category: 'tool',
           toolType: 'hoe', tier: 'wood', baseDurability: 59,
           miningSpeed: 1.0, attackDamage: 1, color: '#8B6914' },
    273: { name: 'stone_hoe', stackSize: 1, category: 'tool',
           toolType: 'hoe', tier: 'stone', baseDurability: 131,
           miningSpeed: 1.0, attackDamage: 1, color: '#808080' },
    274: { name: 'iron_hoe', stackSize: 1, category: 'tool',
           toolType: 'hoe', tier: 'iron', baseDurability: 250,
           miningSpeed: 1.0, attackDamage: 1, color: '#C8C8C8' },
    275: { name: 'diamond_hoe', stackSize: 1, category: 'tool',
           toolType: 'hoe', tier: 'diamond', baseDurability: 1561,
           miningSpeed: 1.0, attackDamage: 1, color: '#5DECF5' },

    // --- Materials (300-349) ---
    300: { name: 'stick', stackSize: 64, category: 'material', color: '#8B6914' },
    301: { name: 'coal', stackSize: 64, category: 'material', color: '#2C2C2C' },
    302: { name: 'iron_ingot', stackSize: 64, category: 'material', color: '#C8C8C8' },
    303: { name: 'gold_ingot', stackSize: 64, category: 'material', color: '#FCEE4B' },
    304: { name: 'diamond', stackSize: 64, category: 'material', color: '#5DECF5' },

    // --- Mob drops (350-399) ---
    350: { name: 'rotten_flesh', stackSize: 64, category: 'food', foodValue: 4, color: '#8B4513' },
    351: { name: 'bone', stackSize: 64, category: 'material', color: '#E8E8D0' },
    352: { name: 'leather', stackSize: 64, category: 'material', color: '#8B4513' },
    353: { name: 'raw_porkchop', stackSize: 64, category: 'food', foodValue: 3, color: '#E8A0A0' },
};

// Get item definition for any item ID (block or non-block)
export function getItemDef(itemId) {
    if (itemId === 0 || itemId == null) return null;

    // Block items (1-255)
    if (itemId >= 1 && itemId <= 255) {
        const bt = BLOCK_TYPES[itemId];
        if (!bt) return null;
        return {
            name: bt.name,
            stackSize: 64,
            category: 'block',
            placesBlock: itemId,
            color: bt.topColor,
        };
    }

    // Non-block items
    return ITEM_TYPES[itemId] || null;
}

// Check if an item ID represents a placeable block
export function isBlock(itemId) {
    if (itemId < 1 || itemId > 255) return false;
    return BLOCK_TYPES[itemId] != null;
}

// Get display name for an item
export function getItemName(itemId) {
    const def = getItemDef(itemId);
    if (!def) return 'Unknown';
    return def.name.replace(/_/g, ' ');
}
