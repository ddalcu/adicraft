import { SimplexNoise } from '../utils/noise.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/constants.js';

const ISLAND_Y = 40;
const NOISE_THRESHOLD = 0.2;

export class OuterEndTerrainGenerator {
    constructor(seed) {
        this.noise = new SimplexNoise(seed || 99999);
        this.detailNoise = new SimplexNoise((seed || 99999) + 1);
    }

    // Deterministic hash for chorus/city placement
    _hash(x, z) {
        let h = (x * 374761393 + z * 668265263) | 0;
        h = ((h ^ (h >> 13)) * 1274126177) | 0;
        return (h ^ (h >> 16)) & 0x7FFFFFFF;
    }

    fillChunk(blocks, chunkX, chunkZ) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldZ = chunkZ * CHUNK_SIZE + z;

                // Island noise — scattered floating islands
                const islandNoise = this.noise.noise2D(worldX * 0.015, worldZ * 0.015);

                if (islandNoise > NOISE_THRESHOLD) {
                    // Island present at this column
                    const detail = this.detailNoise.noise2D(worldX * 0.05, worldZ * 0.05);
                    const thickness = Math.floor((islandNoise - NOISE_THRESHOLD) * 15) + 1;
                    const surfaceY = ISLAND_Y + Math.floor(detail * 3);

                    for (let dy = 0; dy < thickness; dy++) {
                        const y = surfaceY - dy;
                        if (y >= 0 && y < CHUNK_HEIGHT) {
                            blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = 23; // end_stone
                        }
                    }

                    // Chorus plants on surface (deterministic)
                    const chorusHash = this._hash(worldX, worldZ) % 100;
                    if (chorusHash < 8 && islandNoise > 0.3) {
                        const height = 2 + (this._hash(worldX + 1, worldZ + 1) % 4); // 2-5
                        for (let dy = 1; dy <= height; dy++) {
                            const y = surfaceY + dy;
                            if (y < CHUNK_HEIGHT) {
                                blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = 26; // chorus_plant
                            }
                        }
                        // Flower on top
                        const flowerY = surfaceY + height + 1;
                        if (flowerY < CHUNK_HEIGHT) {
                            blocks[x + z * CHUNK_SIZE + flowerY * CHUNK_SIZE * CHUNK_SIZE] = 27; // chorus_flower
                        }
                    }
                }
            }
        }

        // End cities: simple purpur towers in chunks where island noise is high
        const centerX = chunkX * CHUNK_SIZE + 8;
        const centerZ = chunkZ * CHUNK_SIZE + 8;
        const cityNoise = this.noise.noise2D(centerX * 0.015, centerZ * 0.015);

        if (cityNoise > 0.45 && this._hash(chunkX, chunkZ) % 5 === 0) {
            // Place a simple 5x5, 10-block tall purpur tower
            const towerX = 6; // local coords within chunk
            const towerZ = 6;
            const baseY = ISLAND_Y + 1;

            for (let tx = towerX; tx < towerX + 5 && tx < CHUNK_SIZE; tx++) {
                for (let tz = towerZ; tz < towerZ + 5 && tz < CHUNK_SIZE; tz++) {
                    for (let ty = baseY; ty < baseY + 10 && ty < CHUNK_HEIGHT; ty++) {
                        const isWall = tx === towerX || tx === towerX + 4 ||
                                       tz === towerZ || tz === towerZ + 4 ||
                                       ty === baseY + 9; // roof
                        if (isWall) {
                            blocks[tx + tz * CHUNK_SIZE + ty * CHUNK_SIZE * CHUNK_SIZE] = 25; // purpur_block
                        }
                    }
                }
            }
        }
    }
}
