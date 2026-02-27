import * as THREE from 'three';
import { Entity } from './Entity.js';
import { MOB_TYPES } from './MobTypes.js';

const SPAWN_RADIUS = 40;
const DESPAWN_RADIUS = 80;
const MAX_ENTITIES = 30;
const SPAWN_INTERVAL = 2; // seconds between spawn attempts
const PARTICLE_GRAVITY = 15;

export class EntityManager {
    constructor(scene, getWorld) {
        this.scene = scene;
        this.getWorld = getWorld;
        this.entities = [];
        this.spawnTimer = 0;
        this.currentDimension = 'overworld';
        this.authorityMode = true;
        this.onMobDrop = null; // callback(dropId, x, y, z) when mob drops an item
        this.onPlaySound = null; // callback(soundType) for mob ambient sounds
        this.particles = [];
    }

    update(dt, playerPosition) {
        // Always update particles (visual only)
        this._updateParticles(dt);

        // Drain any pending death particles from Entity
        while (Entity.pendingParticles.length > 0) {
            this.particles.push(Entity.pendingParticles.pop());
        }

        if (!this.authorityMode) {
            // Non-authority: only tick hurt flash timers for visual feedback
            for (const entity of this.entities) {
                if (entity.hurtFlashTimer > 0) {
                    entity.hurtFlashTimer -= dt;
                    if (entity.hurtFlashTimer <= 0) entity._resetColors();
                }
                // Still animate non-authority mobs
                if (entity.animator) {
                    entity.animator.update(dt, false);
                }
            }
            return;
        }

        const world = this.getWorld();

        // Update existing entities
        for (const entity of this.entities) {
            entity.update(dt, playerPosition, (x, y, z) => world.getBlock(x, y, z));
        }

        // Despawn far entities and handle dead entities (drops)
        this.entities = this.entities.filter(entity => {
            if (entity.dead) {
                // Handle drops
                if (entity.type.drops && this.onMobDrop) {
                    const bx = Math.floor(entity.position.x);
                    const by = Math.floor(entity.position.y);
                    const bz = Math.floor(entity.position.z);
                    for (const dropId of entity.type.drops) {
                        this.onMobDrop(dropId, bx, by, bz);
                    }
                }
                return false;
            }

            const dx = entity.position.x - playerPosition.x;
            const dz = entity.position.z - playerPosition.z;
            if (dx * dx + dz * dz > DESPAWN_RADIUS * DESPAWN_RADIUS) {
                entity.dispose();
                return false;
            }
            return true;
        });

        // Spawn new entities
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.entities.length < MAX_ENTITIES) {
            this.spawnTimer = SPAWN_INTERVAL;
            this._trySpawn(playerPosition, world);
        }
    }

    _updateParticles(dt) {
        this.particles = this.particles.filter(p => {
            p.userData.life -= dt;
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                return false;
            }
            // Apply gravity and velocity
            p.userData.velocity.y -= PARTICLE_GRAVITY * dt;
            p.position.x += p.userData.velocity.x * dt;
            p.position.y += p.userData.velocity.y * dt;
            p.position.z += p.userData.velocity.z * dt;
            // Fade out
            p.material.opacity = p.userData.life;
            // Spin
            p.rotation.x += dt * 5;
            p.rotation.z += dt * 3;
            return true;
        });
    }

    _trySpawn(playerPosition, world) {
        // Random position around player
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * (SPAWN_RADIUS - 20);
        const wx = Math.floor(playerPosition.x + Math.cos(angle) * dist);
        const wz = Math.floor(playerPosition.z + Math.sin(angle) * dist);

        // Find ground
        let groundY = -1;
        for (let y = 60; y >= 1; y--) {
            const block = world.getBlock(wx, y, wz);
            const above = world.getBlock(wx, y + 1, wz);
            if (block !== 0 && block !== 6 && above === 0) {
                groundY = y + 1;
                break;
            }
        }
        if (groundY < 0) return;

        // Filter mob types by current dimension and build weighted list
        const eligible = [];
        let totalWeight = 0;
        for (const typeDef of Object.values(MOB_TYPES)) {
            const dim = typeDef.dimension || 'overworld';
            if (dim !== this.currentDimension) continue;
            const weight = typeDef.spawnWeight || 10;
            eligible.push({ typeDef, weight });
            totalWeight += weight;
        }
        if (eligible.length === 0) return;

        // Weighted random selection
        let roll = Math.random() * totalWeight;
        let typeDef = eligible[0].typeDef;
        for (const entry of eligible) {
            roll -= entry.weight;
            if (roll <= 0) {
                typeDef = entry.typeDef;
                break;
            }
        }

        const pos = new THREE.Vector3(wx + 0.5, groundY, wz + 0.5);
        const entity = new Entity(typeDef, pos, this.scene);
        // Wire up sound callback
        if (this.onPlaySound) {
            entity.onPlaySound = this.onPlaySound;
        }
        this.entities.push(entity);
    }

    // Get all entities that could be attacked by a ray
    raycastEntities(origin, direction, maxDist) {
        let closest = null;
        let closestDist = maxDist;

        for (const entity of this.entities) {
            if (entity.dead) continue;
            const t = entity.raycast(origin, direction, closestDist);
            if (t !== null && t < closestDist) {
                closestDist = t;
                closest = entity;
            }
        }

        return closest;
    }

    // Check if any hostile mob can attack player, return damage
    checkMobAttacks(playerPosition) {
        let totalDamage = 0;
        for (const entity of this.entities) {
            if (entity.canAttackPlayer(playerPosition)) {
                totalDamage += entity.getAttackDamage();
            }
        }
        return totalDamage;
    }

    getSerializableMobs() {
        const mobs = [];
        for (const entity of this.entities) {
            if (entity.dead) continue;
            // Find mob type key for reconstruction on remote
            let typeKey = null;
            for (const [key, def] of Object.entries(MOB_TYPES)) {
                if (def === entity.type) { typeKey = key; break; }
            }
            if (!typeKey) continue;
            mobs.push({
                id: entity.id,
                type: typeKey,
                x: entity.position.x,
                y: entity.position.y,
                z: entity.position.z,
                yaw: entity.mesh ? entity.mesh.rotation.y : 0,
                health: entity.health,
            });
        }
        return mobs;
    }

    syncFromAuthority(mobDataArray) {
        const remoteIds = new Set();

        for (const data of mobDataArray) {
            remoteIds.add(data.id);
            let entity = this.entities.find(e => e.id === data.id);

            if (!entity) {
                // Create new entity matching authority
                const typeDef = MOB_TYPES[data.type];
                if (!typeDef) continue;
                const pos = new THREE.Vector3(data.x, data.y, data.z);
                entity = new Entity(typeDef, pos, this.scene, data.id);
                entity.health = data.health;
                if (this.onPlaySound) {
                    entity.onPlaySound = this.onPlaySound;
                }
                this.entities.push(entity);
            }

            entity.setPositionFromSync(data.x, data.y, data.z, data.yaw);
            entity.setHealthFromSync(data.health);
        }

        // Remove entities that authority no longer has
        this.entities = this.entities.filter(entity => {
            if (!remoteIds.has(entity.id)) {
                entity.dispose();
                return false;
            }
            return true;
        });
    }

    applyDamageById(mobId, amount) {
        const entity = this.entities.find(e => e.id === mobId);
        if (entity && !entity.dead) {
            entity.takeDamage(amount);
        }
    }

    disposeAll() {
        for (const entity of this.entities) {
            entity.dispose();
        }
        this.entities = [];
        // Clean up particles
        for (const p of this.particles) {
            this.scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
        }
        this.particles = [];
    }
}
