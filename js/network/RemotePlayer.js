import * as THREE from 'three';

export class RemotePlayer {
    constructor(id, name, scene) {
        this.id = id;
        this.name = name;
        this.scene = scene;
        this.group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x00AA00 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        this.group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xDDBB99 });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 1.45;
        this.group.add(this.head);

        // Name tag
        this.nameTag = this._createNameTag(name);
        this.nameTag.position.y = 2.0;
        this.group.add(this.nameTag);

        scene.add(this.group);

        // Interpolation targets
        this.targetPos = new THREE.Vector3();
        this.targetYaw = 0;
        this.targetPitch = 0;
    }

    _createNameTag(name) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2, 0.5, 1);
        return sprite;
    }

    setTarget(x, y, z, yaw, pitch) {
        this.targetPos.set(x, y, z);
        this.targetYaw = yaw;
        this.targetPitch = pitch;
    }

    update(dt) {
        const lerpFactor = Math.min(1, dt * 15);
        this.group.position.lerp(this.targetPos, lerpFactor);
        this.group.rotation.y = this._lerpAngle(this.group.rotation.y, this.targetYaw, lerpFactor);
        this.head.rotation.x = this._lerpAngle(this.head.rotation.x, this.targetPitch, lerpFactor);
    }

    _lerpAngle(from, to, t) {
        let diff = to - from;
        // Normalize to [-PI, PI]
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return from + diff * t;
    }

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
    }
}
