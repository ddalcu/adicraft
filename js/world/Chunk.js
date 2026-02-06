import * as THREE from 'three';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/constants.js';
import { BLOCK_TYPES, isSolid } from './BlockTypes.js';

// Face definitions with corrected winding order (CCW when viewed from outside)
// Each face has: normal direction, 4 corner offsets, UV key, per-corner normalized UVs
const FACES = [
    { // +Y (top) — fixed winding
        dir: [0, 1, 0],
        corners: [
            [0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]
        ],
        uvKey: 'topUV',
        uvs: [[0, 0], [1, 0], [1, 1], [0, 1]]
    },
    { // -Y (bottom) — fixed winding
        dir: [0, -1, 0],
        corners: [
            [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]
        ],
        uvKey: 'bottomUV',
        uvs: [[0, 0], [1, 0], [1, 1], [0, 1]]
    },
    { // +X (right)
        dir: [1, 0, 0],
        corners: [
            [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]
        ],
        uvKey: 'sideUV',
        uvs: [[1, 0], [1, 1], [0, 1], [0, 0]]
    },
    { // -X (left) — reverted to correct original winding
        dir: [-1, 0, 0],
        corners: [
            [0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]
        ],
        uvKey: 'sideUV',
        uvs: [[1, 0], [1, 1], [0, 1], [0, 0]]
    },
    { // +Z (front)
        dir: [0, 0, 1],
        corners: [
            [1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]
        ],
        uvKey: 'sideUV',
        uvs: [[0, 0], [0, 1], [1, 1], [1, 0]]
    },
    { // -Z (back) — reverted to correct original winding
        dir: [0, 0, -1],
        corners: [
            [0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]
        ],
        uvKey: 'sideUV',
        uvs: [[0, 0], [0, 1], [1, 1], [1, 0]]
    }
];

export class Chunk {
    constructor(chunkX, chunkZ) {
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
        this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
        this.mesh = null;
        this.dirty = true;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
            return 0;
        }
        return this.blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
    }

    setBlock(x, y, z, blockId) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
            return;
        }
        this.blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = blockId;
        this.dirty = true;
    }

    _getNeighborBlock(x, y, z, neighbors) {
        if (y < 0 || y >= CHUNK_HEIGHT) return 0;

        if (x < 0) {
            return neighbors.nx ? neighbors.nx.getBlock(CHUNK_SIZE - 1, y, z) : 0;
        }
        if (x >= CHUNK_SIZE) {
            return neighbors.px ? neighbors.px.getBlock(0, y, z) : 0;
        }
        if (z < 0) {
            return neighbors.nz ? neighbors.nz.getBlock(x, y, CHUNK_SIZE - 1) : 0;
        }
        if (z >= CHUNK_SIZE) {
            return neighbors.pz ? neighbors.pz.getBlock(x, y, 0) : 0;
        }

        return this.getBlock(x, y, z);
    }

    buildMesh(neighbors, atlas) {
        const positions = [];
        const uvs = [];
        const indices = [];
        let vertexCount = 0;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const blockId = this.getBlock(x, y, z);
                    if (blockId === 0) continue;

                    const blockType = BLOCK_TYPES[blockId];
                    if (!blockType) continue;

                    for (const face of FACES) {
                        const nx = x + face.dir[0];
                        const ny = y + face.dir[1];
                        const nz = z + face.dir[2];

                        const neighborBlock = this._getNeighborBlock(nx, ny, nz, neighbors);

                        if (isSolid(neighborBlock)) continue;
                        if (neighborBlock === blockId && !blockType.solid) continue;

                        // Get atlas UV range for this face's texture tile
                        const tileRef = blockType[face.uvKey];
                        const { u0, v0, u1, v1 } = atlas.getUVs(tileRef.col, tileRef.row);

                        for (let i = 0; i < 4; i++) {
                            const corner = face.corners[i];
                            positions.push(
                                x + corner[0],
                                y + corner[1],
                                z + corner[2]
                            );

                            // Map normalized [0,1] face UV to atlas UV range
                            const nu = face.uvs[i][0];
                            const nv = face.uvs[i][1];
                            uvs.push(
                                u0 + nu * (u1 - u0),
                                v0 + nv * (v1 - v0)
                            );
                        }

                        indices.push(
                            vertexCount, vertexCount + 1, vertexCount + 2,
                            vertexCount, vertexCount + 2, vertexCount + 3
                        );
                        vertexCount += 4;
                    }
                }
            }
        }

        // Dispose old geometry (material is shared, don't dispose it)
        if (this.mesh) {
            this.mesh.geometry.dispose();
        }

        if (positions.length === 0) {
            this.mesh = null;
            this.dirty = false;
            return null;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        this.mesh = new THREE.Mesh(geometry, atlas.material);
        this.mesh.position.set(
            this.chunkX * CHUNK_SIZE,
            0,
            this.chunkZ * CHUNK_SIZE
        );
        this.dirty = false;

        return this.mesh;
    }

    dispose() {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            // Material is shared via atlas, don't dispose here
        }
    }
}
