// Block ID → block definition
// UV refs point to TILE_UV keys from TextureAtlas

import { TILE_UV } from '../utils/TextureAtlas.js';

export const BLOCK_TYPES = {
    0: null, // air
    1: {
        name: 'grass',
        solid: true,
        topColor: '#4CAF50',
        topUV: TILE_UV.grass_top,
        sideUV: TILE_UV.grass_side,
        bottomUV: TILE_UV.dirt
    },
    2: {
        name: 'dirt',
        solid: true,
        topColor: '#8B6914',
        topUV: TILE_UV.dirt,
        sideUV: TILE_UV.dirt,
        bottomUV: TILE_UV.dirt
    },
    3: {
        name: 'stone',
        solid: true,
        topColor: '#808080',
        topUV: TILE_UV.stone,
        sideUV: TILE_UV.stone,
        bottomUV: TILE_UV.stone
    },
    4: {
        name: 'wood',
        solid: true,
        topColor: '#B8860B',
        topUV: TILE_UV.wood_top,
        sideUV: TILE_UV.wood_side,
        bottomUV: TILE_UV.wood_top
    },
    5: {
        name: 'leaves',
        solid: true,
        topColor: '#228B22',
        topUV: TILE_UV.leaves,
        sideUV: TILE_UV.leaves,
        bottomUV: TILE_UV.leaves
    },
    6: {
        name: 'water',
        solid: false,
        topColor: '#3F76E4',
        topUV: TILE_UV.water,
        sideUV: TILE_UV.water,
        bottomUV: TILE_UV.water
    },
    7: {
        name: 'sand',
        solid: true,
        topColor: '#D2B48C',
        topUV: TILE_UV.sand,
        sideUV: TILE_UV.sand,
        bottomUV: TILE_UV.sand
    },
    8: {
        name: 'bedrock',
        solid: true,
        topColor: '#333333',
        topUV: TILE_UV.bedrock,
        sideUV: TILE_UV.bedrock,
        bottomUV: TILE_UV.bedrock
    },
    9: {
        name: 'coal_ore',
        solid: true,
        topColor: '#2C2C2C',
        topUV: TILE_UV.coal_ore,
        sideUV: TILE_UV.coal_ore,
        bottomUV: TILE_UV.coal_ore
    },
    10: {
        name: 'iron_ore',
        solid: true,
        topColor: '#C8A882',
        topUV: TILE_UV.iron_ore,
        sideUV: TILE_UV.iron_ore,
        bottomUV: TILE_UV.iron_ore
    },
    11: {
        name: 'gold_ore',
        solid: true,
        topColor: '#FCEE4B',
        topUV: TILE_UV.gold_ore,
        sideUV: TILE_UV.gold_ore,
        bottomUV: TILE_UV.gold_ore
    },
    12: {
        name: 'diamond_ore',
        solid: true,
        topColor: '#5DECF5',
        topUV: TILE_UV.diamond_ore,
        sideUV: TILE_UV.diamond_ore,
        bottomUV: TILE_UV.diamond_ore
    },
    13: {
        name: 'snow',
        solid: true,
        topColor: '#F0F0F0',
        topUV: TILE_UV.snow,
        sideUV: TILE_UV.snow,
        bottomUV: TILE_UV.snow
    },
    14: {
        name: 'ice',
        solid: true,
        topColor: '#A5D6F5',
        topUV: TILE_UV.ice,
        sideUV: TILE_UV.ice,
        bottomUV: TILE_UV.ice
    },
    15: {
        name: 'spruce_log',
        solid: true,
        topColor: '#4A3728',
        topUV: TILE_UV.spruce_log_top,
        sideUV: TILE_UV.spruce_log,
        bottomUV: TILE_UV.spruce_log_top
    },
    16: {
        name: 'spruce_leaves',
        solid: true,
        topColor: '#3E6B3E',
        topUV: TILE_UV.spruce_leaves,
        sideUV: TILE_UV.spruce_leaves,
        bottomUV: TILE_UV.spruce_leaves
    },
    17: {
        name: 'birch_log',
        solid: true,
        topColor: '#D5C98C',
        topUV: TILE_UV.birch_log_top,
        sideUV: TILE_UV.birch_log,
        bottomUV: TILE_UV.birch_log_top
    },
    18: {
        name: 'birch_leaves',
        solid: true,
        topColor: '#6B8E23',
        topUV: TILE_UV.birch_leaves,
        sideUV: TILE_UV.birch_leaves,
        bottomUV: TILE_UV.birch_leaves
    },
    19: {
        name: 'jungle_log',
        solid: true,
        topColor: '#6B5839',
        topUV: TILE_UV.wood_top,
        sideUV: TILE_UV.jungle_log,
        bottomUV: TILE_UV.wood_top
    },
    20: {
        name: 'jungle_leaves',
        solid: true,
        topColor: '#1E8C1E',
        topUV: TILE_UV.jungle_leaves,
        sideUV: TILE_UV.jungle_leaves,
        bottomUV: TILE_UV.jungle_leaves
    },
    21: {
        name: 'cactus',
        solid: true,
        topColor: '#2E7D32',
        topUV: TILE_UV.cactus_top,
        sideUV: TILE_UV.cactus_side,
        bottomUV: TILE_UV.cactus_bottom
    },
    22: {
        name: 'obsidian',
        solid: true,
        topColor: '#1B0A2E',
        topUV: TILE_UV.obsidian,
        sideUV: TILE_UV.obsidian,
        bottomUV: TILE_UV.obsidian
    },
    23: {
        name: 'end_stone',
        solid: true,
        topColor: '#DBD3A0',
        topUV: TILE_UV.end_stone,
        sideUV: TILE_UV.end_stone,
        bottomUV: TILE_UV.end_stone
    },
    24: {
        name: 'end_stone_bricks',
        solid: true,
        topColor: '#D6CEA0',
        topUV: TILE_UV.end_stone_bricks,
        sideUV: TILE_UV.end_stone_bricks,
        bottomUV: TILE_UV.end_stone_bricks
    },
    25: {
        name: 'purpur_block',
        solid: true,
        topColor: '#A477A4',
        topUV: TILE_UV.purpur_block,
        sideUV: TILE_UV.purpur_block,
        bottomUV: TILE_UV.purpur_block
    },
    26: {
        name: 'chorus_plant',
        solid: true,
        topColor: '#7B5E7B',
        topUV: TILE_UV.chorus_plant,
        sideUV: TILE_UV.chorus_plant,
        bottomUV: TILE_UV.chorus_plant
    },
    27: {
        name: 'chorus_flower',
        solid: true,
        topColor: '#9B7D9B',
        topUV: TILE_UV.chorus_flower,
        sideUV: TILE_UV.chorus_flower,
        bottomUV: TILE_UV.chorus_flower
    },
    28: {
        name: 'end_portal_frame',
        solid: true,
        topColor: '#3B6B5E',
        topUV: TILE_UV.end_portal_frame,
        sideUV: TILE_UV.end_portal_frame,
        bottomUV: TILE_UV.end_stone
    },
    29: {
        name: 'end_portal',
        solid: false,
        topColor: '#1B0033',
        topUV: TILE_UV.end_portal,
        sideUV: TILE_UV.end_portal,
        bottomUV: TILE_UV.end_portal
    },
    30: {
        name: 'podzol',
        solid: true,
        topColor: '#6B4C2A',
        topUV: TILE_UV.podzol_top,
        sideUV: TILE_UV.podzol_side,
        bottomUV: TILE_UV.dirt
    },
    31: {
        name: 'mycelium',
        solid: true,
        topColor: '#8B7B8B',
        topUV: TILE_UV.mycelium_top,
        sideUV: TILE_UV.mycelium_side,
        bottomUV: TILE_UV.dirt
    }
};

export function isSolid(blockId) {
    const type = BLOCK_TYPES[blockId];
    return type !== null && type !== undefined && type.solid;
}
