// Biome definitions
// Each biome defines surface blocks, tree types, and terrain parameters.
// Selected by temperature + humidity noise values.

export const BIOMES = {
    plains: {
        name: 'Plains',
        surfaceBlock: 1,   // grass
        fillerBlock: 2,    // dirt
        treeChance: 0.005,
        treeType: 'oak',
        heightScale: 1.0,
        heightOffset: 0,
    },
    forest: {
        name: 'Forest',
        surfaceBlock: 1,   // grass
        fillerBlock: 2,    // dirt
        treeChance: 0.08,
        treeType: 'oak',
        heightScale: 1.0,
        heightOffset: 1,
    },
    desert: {
        name: 'Desert',
        surfaceBlock: 7,   // sand
        fillerBlock: 7,    // sand
        treeChance: 0.003,
        treeType: 'cactus',
        heightScale: 0.5,
        heightOffset: 0,
    },
    snow: {
        name: 'Snow',
        surfaceBlock: 13,  // snow
        fillerBlock: 2,    // dirt
        treeChance: 0.03,
        treeType: 'spruce',
        heightScale: 1.2,
        heightOffset: 1,
    },
    mountains: {
        name: 'Mountains',
        surfaceBlock: 3,   // stone
        fillerBlock: 3,    // stone
        treeChance: 0.01,
        treeType: 'spruce',
        heightScale: 3.0,
        heightOffset: 5,
    },
    swamp: {
        name: 'Swamp',
        surfaceBlock: 1,   // grass
        fillerBlock: 2,    // dirt
        treeChance: 0.04,
        treeType: 'oak',
        heightScale: 0.3,
        heightOffset: -2,
    },
    jungle: {
        name: 'Jungle',
        surfaceBlock: 1,   // grass
        fillerBlock: 2,    // dirt
        treeChance: 0.1,
        treeType: 'jungle',
        heightScale: 1.0,
        heightOffset: 1,
    },
};

// Map temperature/humidity ranges to biomes
// temperature: cold(-1..0) to hot(0..1)
// humidity: dry(-1..0) to wet(0..1)
export function getBiome(temperature, humidity) {
    if (temperature < -0.4) {
        return BIOMES.snow;
    }
    if (temperature > 0.5) {
        if (humidity > 0.2) {
            return BIOMES.jungle;
        }
        return BIOMES.desert;
    }
    if (humidity < -0.3) {
        return BIOMES.mountains;
    }
    if (humidity > 0.3) {
        return BIOMES.swamp;
    }
    if (temperature > 0.0 && humidity > -0.1) {
        return BIOMES.forest;
    }
    return BIOMES.plains;
}
