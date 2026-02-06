import { SimplexNoise } from '../utils/noise.js';
import { SEA_LEVEL, TERRAIN_SCALE, TERRAIN_HEIGHT, CHUNK_SIZE, CHUNK_HEIGHT, WATER_LEVEL } from '../utils/constants.js';

export class TerrainGenerator {
    constructor(seed) {
        this.noise = new SimplexNoise(seed || 12345);
    }

    getHeight(worldX, worldZ) {
        // Multi-octave noise for more interesting terrain
        let height = 0;
        height += this.noise.noise2D(worldX * TERRAIN_SCALE, worldZ * TERRAIN_SCALE) * TERRAIN_HEIGHT;
        height += this.noise.noise2D(worldX * TERRAIN_SCALE * 2, worldZ * TERRAIN_SCALE * 2) * (TERRAIN_HEIGHT / 2);
        height += this.noise.noise2D(worldX * TERRAIN_SCALE * 4, worldZ * TERRAIN_SCALE * 4) * (TERRAIN_HEIGHT / 4);

        return Math.floor(SEA_LEVEL + height);
    }

    fillChunk(blocks, chunkX, chunkZ) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldZ = chunkZ * CHUNK_SIZE + z;
                const surfaceHeight = this.getHeight(worldX, worldZ);

                const isUnderwater = surfaceHeight < WATER_LEVEL;

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    let blockId = 0; // air

                    if (y === surfaceHeight) {
                        blockId = isUnderwater ? 7 : 1; // sand if underwater, grass otherwise
                    } else if (y >= surfaceHeight - 3 && y < surfaceHeight) {
                        blockId = 2; // dirt
                    } else if (y < surfaceHeight - 3 && y > 0) {
                        blockId = 3; // stone
                    } else if (y === 0) {
                        blockId = 3; // bedrock layer (stone)
                    } else if (isUnderwater && y > surfaceHeight && y <= WATER_LEVEL) {
                        blockId = 6; // water
                    }

                    blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = blockId;
                }
            }
        }
    }
}
