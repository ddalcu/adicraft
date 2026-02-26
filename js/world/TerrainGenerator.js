import { SimplexNoise } from '../utils/noise.js';
import { SEA_LEVEL, TERRAIN_SCALE, TERRAIN_HEIGHT, CHUNK_SIZE, CHUNK_HEIGHT, WATER_LEVEL } from '../utils/constants.js';
import { getBiome } from './Biomes.js';
import { getTreeBlocks } from './TreeGenerator.js';

export class TerrainGenerator {
    constructor(seed) {
        this.noise = new SimplexNoise(seed || 12345);
        // Separate noise instances for temperature, humidity, and ores
        this.tempNoise = new SimplexNoise((seed || 12345) + 100);
        this.humidNoise = new SimplexNoise((seed || 12345) + 200);
    }

    getBiomeAt(worldX, worldZ) {
        const temp = this.tempNoise.noise2D(worldX * 0.005, worldZ * 0.005);
        const humid = this.humidNoise.noise2D(worldX * 0.005, worldZ * 0.005);
        return getBiome(temp, humid);
    }

    getHeight(worldX, worldZ) {
        const biome = this.getBiomeAt(worldX, worldZ);

        let height = 0;
        height += this.noise.noise2D(worldX * TERRAIN_SCALE, worldZ * TERRAIN_SCALE) * TERRAIN_HEIGHT;
        height += this.noise.noise2D(worldX * TERRAIN_SCALE * 2, worldZ * TERRAIN_SCALE * 2) * (TERRAIN_HEIGHT / 2);
        height += this.noise.noise2D(worldX * TERRAIN_SCALE * 4, worldZ * TERRAIN_SCALE * 4) * (TERRAIN_HEIGHT / 4);

        height *= biome.heightScale;
        height += biome.heightOffset;

        return Math.floor(SEA_LEVEL + height);
    }

    // Deterministic hash for ore placement
    _coordHash(x, y, z) {
        let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
        h = ((h ^ (h >> 13)) * 1274126177) | 0;
        return (h ^ (h >> 16)) & 0x7FFFFFFF;
    }

    _getOre(worldX, y, worldZ) {
        const hash = this._coordHash(worldX, y, worldZ);
        const chance = (hash % 1000) / 1000;

        // Diamond: below y=16, rare (0.8%)
        if (y < 16 && chance < 0.008) return 12;
        // Gold: below y=32, uncommon (1.2%)
        if (y < 32 && chance < 0.012) return 11;
        // Iron: below y=48, moderate (2%)
        if (y < 48 && chance < 0.02) return 10;
        // Coal: any depth, common (3%)
        if (chance < 0.03) return 9;

        return 3; // stone
    }

    // Deterministic per-column RNG for trees
    _columnRng(worldX, worldZ) {
        let seed = this._coordHash(worldX, 0, worldZ);
        return () => {
            seed = ((seed * 1103515245 + 12345) & 0x7FFFFFFF);
            return (seed % 10000) / 10000;
        };
    }

    fillChunk(blocks, chunkX, chunkZ) {
        // Pending tree blocks that may spill into this chunk from neighboring columns
        const pendingBlocks = [];

        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldZ = chunkZ * CHUNK_SIZE + z;
                const biome = this.getBiomeAt(worldX, worldZ);
                const surfaceHeight = this.getHeight(worldX, worldZ);
                const isUnderwater = surfaceHeight < WATER_LEVEL;

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    let blockId = 0; // air

                    if (y === 0) {
                        blockId = 8; // bedrock
                    } else if (y === surfaceHeight) {
                        blockId = isUnderwater ? 7 : biome.surfaceBlock;
                    } else if (y >= surfaceHeight - 3 && y < surfaceHeight) {
                        blockId = isUnderwater ? 7 : biome.fillerBlock;
                    } else if (y < surfaceHeight - 3 && y > 0) {
                        blockId = this._getOre(worldX, y, worldZ);
                    } else if (isUnderwater && y > surfaceHeight && y <= WATER_LEVEL) {
                        blockId = 6; // water
                    }

                    blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = blockId;
                }

                // Tree placement (only on dry land)
                if (!isUnderwater && surfaceHeight > WATER_LEVEL) {
                    const rng = this._columnRng(worldX, worldZ);
                    if (rng() < biome.treeChance) {
                        const treeBlocks = getTreeBlocks(biome.treeType, rng);
                        for (const tb of treeBlocks) {
                            const bx = x + tb.dx;
                            const by = surfaceHeight + 1 + tb.dy;
                            const bz = z + tb.dz;

                            // Only place blocks within this chunk
                            if (bx >= 0 && bx < CHUNK_SIZE &&
                                bz >= 0 && bz < CHUNK_SIZE &&
                                by >= 0 && by < CHUNK_HEIGHT) {
                                const idx = bx + bz * CHUNK_SIZE + by * CHUNK_SIZE * CHUNK_SIZE;
                                // Don't overwrite trunk with leaves
                                if (blocks[idx] === 0) {
                                    blocks[idx] = tb.blockId;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
