import * as THREE from 'three';

const FIRE_RATE = 10; // shots per second
const DAMAGE = 2;
const MAX_RANGE = 50;
const PROJECTILE_SPEED = 120;
const MUZZLE_FLASH_DURATION = 0.05;
const DMG_NUMBER_DURATION = 0.8;
const DMG_NUMBER_RISE_SPEED = 2.5;

export class Weapon {
    constructor(camera, scene, entityManager, sound) {
        this.camera = camera;
        this.scene = scene;
        this.entityManager = entityManager;
        this.sound = sound;
        this.fireCooldown = 0;
        this.projectiles = [];
        this.damageNumbers = [];
        this.extraTargets = [];

        // Recoil animation state
        this.recoilOffset = 0;
        this.muzzleFlashTimer = 0;
        this.firing = false;

        // Remote damage callback: (mobId, damage) => void
        this.onRemoteHit = null;

        // Shared projectile geometry + materials (avoid per-shot allocations)
        this._nailGeo = new THREE.CylinderGeometry(0.05, 0.02, 0.7, 4);
        this._nailGeo.rotateX(Math.PI / 2);
        this._nailMat = new THREE.MeshBasicMaterial({
            color: 0xFFDD44,
            transparent: true,
            opacity: 1.0
        });
        this._coreGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.5, 4);
        this._coreGeo.rotateX(Math.PI / 2);
        this._coreMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFAA,
            transparent: true,
            opacity: 1.0
        });

        this._buildGunModel();
        this.gunGroup.visible = false;
    }

    _buildGunModel() {
        this.gunGroup = new THREE.Group();

        const darkMetal = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
        const medMetal = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const lightMetal = new THREE.MeshLambertMaterial({ color: 0x999999 });
        const brass = new THREE.MeshLambertMaterial({ color: 0xBB8833 });

        // Main body — chunky rectangular housing
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.13, 0.09, 0.38),
            darkMetal
        );
        body.position.set(0, 0, -0.06);
        this.gunGroup.add(body);

        // Barrel shroud — extends forward, slightly narrower
        const shroud = new THREE.Mesh(
            new THREE.BoxGeometry(0.10, 0.07, 0.22),
            medMetal
        );
        shroud.position.set(0, 0.005, -0.28);
        this.gunGroup.add(shroud);

        // Twin barrels — the classic nailgun look
        const barrelGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.30, 6);
        barrelGeo.rotateX(Math.PI / 2);

        const barrel1 = new THREE.Mesh(barrelGeo, lightMetal);
        barrel1.position.set(-0.025, 0.01, -0.34);
        this.gunGroup.add(barrel1);

        const barrel2 = new THREE.Mesh(barrelGeo, lightMetal);
        barrel2.position.set(0.025, 0.01, -0.34);
        this.gunGroup.add(barrel2);

        // Barrel tips — small rings at the muzzle end
        const tipGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 6);
        tipGeo.rotateX(Math.PI / 2);

        const tip1 = new THREE.Mesh(tipGeo, brass);
        tip1.position.set(-0.025, 0.01, -0.49);
        this.gunGroup.add(tip1);

        const tip2 = new THREE.Mesh(tipGeo, brass);
        tip2.position.set(0.025, 0.01, -0.49);
        this.gunGroup.add(tip2);

        // Ammo drum on top — cylindrical magazine (signature Quake nailgun feature)
        const drum = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.045, 0.12, 8),
            brass
        );
        drum.position.set(0, 0.08, -0.06);
        this.gunGroup.add(drum);

        // Drum cap
        const drumCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.02, 8),
            darkMetal
        );
        drumCap.position.set(0, 0.145, -0.06);
        this.gunGroup.add(drumCap);

        // Handle / grip
        const grip = new THREE.Mesh(
            new THREE.BoxGeometry(0.065, 0.13, 0.06),
            darkMetal
        );
        grip.position.set(0, -0.09, 0.05);
        grip.rotation.x = 0.2;
        this.gunGroup.add(grip);

        // Trigger guard
        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.02, 0.08),
            medMetal
        );
        guard.position.set(0, -0.035, 0.0);
        this.gunGroup.add(guard);

        // Muzzle flash — hidden by default, flashes bright on fire
        const flashGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xFFFF44,
            transparent: true,
            opacity: 0
        });
        this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
        this.muzzleFlash.position.set(0, 0.01, -0.52);
        this.gunGroup.add(this.muzzleFlash);

        // Position: lower-right of view, classic FPS style
        this.gunGroup.position.set(0.28, -0.22, -0.45);

        this.camera.add(this.gunGroup);
    }

    show() {
        this.gunGroup.visible = true;
    }

    hide() {
        this.gunGroup.visible = false;
    }

    update(dt, input) {
        this.fireCooldown = Math.max(0, this.fireCooldown - dt);

        if (input.mouseLeft && this.fireCooldown <= 0) {
            this._fire();
            this.fireCooldown = 1 / FIRE_RATE;
        }

        // Recoil spring-back
        if (this.recoilOffset > 0) {
            this.recoilOffset = Math.max(0, this.recoilOffset - dt * 10);
            this.gunGroup.position.z = -0.45 + this.recoilOffset * 0.06;
            this.gunGroup.rotation.x = -this.recoilOffset * 0.05;
        }

        // Muzzle flash fade
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
            this.muzzleFlash.material.opacity = Math.max(0, this.muzzleFlashTimer / MUZZLE_FLASH_DURATION);
            if (this.muzzleFlashTimer <= 0) this.firing = false;
        }

        // Update floating damage numbers
        this.damageNumbers = this.damageNumbers.filter(dn => {
            dn.life -= dt;
            if (dn.life <= 0) {
                this.scene.remove(dn.sprite);
                dn.sprite.material.map.dispose();
                dn.sprite.material.dispose();
                return false;
            }
            dn.sprite.position.y += DMG_NUMBER_RISE_SPEED * dt;
            dn.sprite.material.opacity = dn.life / DMG_NUMBER_DURATION;
            return true;
        });

        // Update projectiles
        this.projectiles = this.projectiles.filter(proj => {
            proj.life -= dt;
            if (proj.life <= 0) {
                this.scene.remove(proj.group);
                return false;
            }
            proj.group.position.addScaledVector(proj.velocity, dt);
            // Fade in last 25% of life
            const alpha = Math.min(1, proj.life * 5);
            proj.nailMesh.material.opacity = alpha;
            proj.coreMesh.material.opacity = alpha;
            return true;
        });
    }

    _fire() {
        if (this.sound) this.sound.playShoot();

        const origin = this.camera.position.clone();
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

        // Raycast against entities (instant hit detection)
        let closestDist = MAX_RANGE;
        let closestTarget = null;

        const mobHit = this.entityManager.raycastEntities(origin, direction, closestDist);
        if (mobHit) {
            const t = mobHit.raycast(origin, direction, closestDist);
            if (t !== null && t < closestDist) {
                closestDist = t;
                closestTarget = mobHit;
            }
        }

        for (const target of this.extraTargets) {
            if (target.dead) continue;
            const t = target.raycast(origin, direction, closestDist);
            if (t !== null && t < closestDist) {
                closestDist = t;
                closestTarget = target;
            }
        }

        let endPoint;
        if (closestTarget) {
            // Check if this is a mob (has .id) and we have a remote hit callback
            if (closestTarget.id && this.onRemoteHit) {
                this.onRemoteHit(closestTarget.id, DAMAGE);
            } else {
                closestTarget.takeDamage(DAMAGE);
            }
            this._spawnDamageNumber(closestTarget, DAMAGE);
            endPoint = origin.clone().add(direction.clone().multiplyScalar(closestDist));
        } else {
            endPoint = origin.clone().add(direction.clone().multiplyScalar(MAX_RANGE));
        }

        this._createProjectile(origin, endPoint, direction);

        // Trigger recoil kick
        this.recoilOffset = 1;
        this.muzzleFlashTimer = MUZZLE_FLASH_DURATION;
        this.muzzleFlash.material.opacity = 1;
        this.firing = true;
    }

    _createProjectile(start, end, direction) {
        const group = new THREE.Group();

        // Outer nail body — bright, visible spike
        const nailMat = this._nailMat.clone();
        const nail = new THREE.Mesh(this._nailGeo, nailMat);
        group.add(nail);

        // Inner glowing core — brighter center
        const coreMat = this._coreMat.clone();
        const core = new THREE.Mesh(this._coreGeo, coreMat);
        group.add(core);

        // Spawn slightly ahead of camera to avoid clipping
        group.position.copy(start).addScaledVector(direction, 1.5);
        group.lookAt(end);

        this.scene.add(group);

        const totalDist = start.distanceTo(end);
        const travelTime = totalDist / PROJECTILE_SPEED;

        this.projectiles.push({
            group,
            nailMesh: nail,
            coreMesh: core,
            velocity: direction.clone().multiplyScalar(PROJECTILE_SPEED),
            life: Math.min(travelTime, 0.5)
        });
    }

    _spawnDamageNumber(target, damage) {
        // Determine spawn position above the entity's head
        const pos = target.position.clone();
        const height = target.type?.height || 2;
        pos.y += height + 0.3;
        // Small random x/z offset so rapid hits don't stack exactly
        pos.x += (Math.random() - 0.5) * 0.5;
        pos.z += (Math.random() - 0.5) * 0.5;

        const texture = this._createDamageTexture(damage);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 1.0,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(pos);
        sprite.scale.set(1.2, 0.6, 1);
        this.scene.add(sprite);

        this.damageNumbers.push({ sprite, life: DMG_NUMBER_DURATION });
    }

    _createDamageTexture(damage) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Black outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5;
        ctx.strokeText(`-${damage}`, 64, 32);

        // Red fill
        ctx.fillStyle = '#FF3333';
        ctx.fillText(`-${damage}`, 64, 32);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    dispose() {
        for (const proj of this.projectiles) {
            this.scene.remove(proj.group);
            proj.nailMesh.material.dispose();
            proj.coreMesh.material.dispose();
        }
        this.projectiles = [];

        for (const dn of this.damageNumbers) {
            this.scene.remove(dn.sprite);
            dn.sprite.material.map.dispose();
            dn.sprite.material.dispose();
        }
        this.damageNumbers = [];

        this._nailGeo.dispose();
        this._nailMat.dispose();
        this._coreGeo.dispose();
        this._coreMat.dispose();

        if (this.gunGroup) {
            this.camera.remove(this.gunGroup);
            this.gunGroup.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
        }
    }
}
