// Manages multiple dimensions (worlds), each with their own World + TerrainGenerator.
// Only one dimension is active at a time.

import * as THREE from 'three';

export class DimensionManager {
    constructor(scene, engine) {
        this.scene = scene;
        this.engine = engine;
        this.dimensions = new Map();
        this.activeDimension = null;
    }

    register(name, world, options = {}) {
        this.dimensions.set(name, {
            world,
            skyColor: options.skyColor ?? 0x87CEEB,
            fogNear: options.fogNear ?? 50,
            fogFar: options.fogFar ?? 250,
            spawnPoint: options.spawnPoint ?? new THREE.Vector3(8, 64, 8),
        });
    }

    getActiveWorld() {
        if (!this.activeDimension) return null;
        return this.dimensions.get(this.activeDimension).world;
    }

    getActiveName() {
        return this.activeDimension;
    }

    async switchTo(name, player) {
        if (name === this.activeDimension) return;

        const dim = this.dimensions.get(name);
        if (!dim) return;

        // Unload old world
        if (this.activeDimension) {
            const oldDim = this.dimensions.get(this.activeDimension);
            oldDim.world.unloadAll();
        }

        this.activeDimension = name;

        // Update sky and fog
        this.scene.background = new THREE.Color(dim.skyColor);
        this.scene.fog = new THREE.Fog(dim.skyColor, dim.fogNear, dim.fogFar);

        // Teleport player to spawn
        player.position.copy(dim.spawnPoint);
        player.velocity.set(0, 0, 0);
        player.spawnPosition.copy(dim.spawnPoint);
    }
}
