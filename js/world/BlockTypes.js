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
    }
};

export function isSolid(blockId) {
    const type = BLOCK_TYPES[blockId];
    return type !== null && type !== undefined && type.solid;
}
