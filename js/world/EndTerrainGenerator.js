import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/constants.js';

// End dimension: single floating end_stone island with obsidian towers
const ISLAND_CENTER_X = 0;
const ISLAND_CENTER_Z = 0;
const ISLAND_Y = 40;
const ISLAND_RADIUS = 50;

// 8 obsidian towers arranged in a ring
const TOWER_RING_RADIUS = 40;
const TOWERS = [];
for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    TOWERS.push({
        x: Math.round(ISLAND_CENTER_X + Math.cos(angle) * TOWER_RING_RADIUS),
        z: Math.round(ISLAND_CENTER_Z + Math.sin(angle) * TOWER_RING_RADIUS),
        height: 25 + Math.round((i * 7 + 3) % 30) + (i % 2) * 10, // varied 25-55
        radius: 2
    });
}

export { TOWERS as END_TOWERS };

export class EndTerrainGenerator {
    constructor() {}

    fillChunk(blocks, chunkX, chunkZ) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldZ = chunkZ * CHUNK_SIZE + z;

                // Island shape: ellipsoid
                const dx = worldX - ISLAND_CENTER_X;
                const dz = worldZ - ISLAND_CENTER_Z;
                const distSq = dx * dx + dz * dz;
                const radiusSq = ISLAND_RADIUS * ISLAND_RADIUS;

                if (distSq <= radiusSq) {
                    // Height varies: thicker at center, thinner at edges
                    const edgeFactor = 1 - distSq / radiusSq;
                    const thickness = Math.floor(edgeFactor * 8) + 1; // 1-9 blocks thick

                    for (let dy = 0; dy < thickness; dy++) {
                        const y = ISLAND_Y - dy;
                        if (y >= 0 && y < CHUNK_HEIGHT) {
                            const idx = x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
                            blocks[idx] = 23; // end_stone
                        }
                    }
                    // Top surface
                    if (ISLAND_Y < CHUNK_HEIGHT) {
                        const idx = x + z * CHUNK_SIZE + ISLAND_Y * CHUNK_SIZE * CHUNK_SIZE;
                        blocks[idx] = 23; // end_stone
                    }
                }

                // Obsidian towers
                for (const tower of TOWERS) {
                    const tdx = worldX - tower.x;
                    const tdz = worldZ - tower.z;
                    if (Math.abs(tdx) <= tower.radius && Math.abs(tdz) <= tower.radius) {
                        for (let y = ISLAND_Y; y <= ISLAND_Y + tower.height && y < CHUNK_HEIGHT; y++) {
                            const idx = x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
                            blocks[idx] = 22; // obsidian
                        }
                    }
                }
            }
        }
    }
}
