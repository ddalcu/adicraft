import { CHUNK_SIZE, RENDER_DISTANCE, MAX_CHUNK_BUILDS_PER_FRAME } from '../utils/constants.js';
import { Chunk } from './Chunk.js';
import { TerrainGenerator } from './TerrainGenerator.js';
import { TextureAtlas } from '../utils/TextureAtlas.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.terrain = new TerrainGenerator(42);
        this.atlas = null;
    }

    async init() {
        this.atlas = new TextureAtlas();
        await this.atlas.load('texturepacks/Default/assets/minecraft/textures');
    }

    _chunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    getChunk(cx, cz) {
        return this.chunks.get(this._chunkKey(cx, cz)) || null;
    }

    getBlock(worldX, worldY, worldZ) {
        const cx = Math.floor(worldX / CHUNK_SIZE);
        const cz = Math.floor(worldZ / CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return 0;

        const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        return chunk.getBlock(lx, worldY, lz);
    }

    setBlock(worldX, worldY, worldZ, blockId) {
        const cx = Math.floor(worldX / CHUNK_SIZE);
        const cz = Math.floor(worldZ / CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return;

        const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        chunk.setBlock(lx, worldY, lz, blockId);

        // Mark neighbor chunks dirty if block is on edge
        if (lx === 0) this._markDirty(cx - 1, cz);
        if (lx === CHUNK_SIZE - 1) this._markDirty(cx + 1, cz);
        if (lz === 0) this._markDirty(cx, cz - 1);
        if (lz === CHUNK_SIZE - 1) this._markDirty(cx, cz + 1);
    }

    _markDirty(cx, cz) {
        const chunk = this.getChunk(cx, cz);
        if (chunk) chunk.dirty = true;
    }

    update(playerPosition) {
        const playerCX = Math.floor(playerPosition.x / CHUNK_SIZE);
        const playerCZ = Math.floor(playerPosition.z / CHUNK_SIZE);

        // Load chunks in range
        for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
            for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
                if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;

                const cx = playerCX + dx;
                const cz = playerCZ + dz;
                const key = this._chunkKey(cx, cz);

                if (!this.chunks.has(key)) {
                    const chunk = new Chunk(cx, cz);
                    this.terrain.fillChunk(chunk.blocks, cx, cz);
                    this.chunks.set(key, chunk);
                }
            }
        }

        // Unload chunks out of range
        for (const [key, chunk] of this.chunks) {
            const dx = chunk.chunkX - playerCX;
            const dz = chunk.chunkZ - playerCZ;
            if (dx * dx + dz * dz > (RENDER_DISTANCE + 2) * (RENDER_DISTANCE + 2)) {
                if (chunk.mesh) {
                    this.scene.remove(chunk.mesh);
                }
                chunk.dispose();
                this.chunks.delete(key);
            }
        }

        // Rebuild dirty chunk meshes (limit per frame)
        let buildsThisFrame = 0;
        for (const [key, chunk] of this.chunks) {
            if (!chunk.dirty) continue;
            if (buildsThisFrame >= MAX_CHUNK_BUILDS_PER_FRAME) break;

            const neighbors = {
                px: this.getChunk(chunk.chunkX + 1, chunk.chunkZ),
                nx: this.getChunk(chunk.chunkX - 1, chunk.chunkZ),
                pz: this.getChunk(chunk.chunkX, chunk.chunkZ + 1),
                nz: this.getChunk(chunk.chunkX, chunk.chunkZ - 1)
            };

            const oldMesh = chunk.mesh;
            if (oldMesh) {
                this.scene.remove(oldMesh);
            }

            const newMesh = chunk.buildMesh(neighbors, this.atlas);
            if (newMesh) {
                this.scene.add(newMesh);
            }

            buildsThisFrame++;
        }
    }
}
