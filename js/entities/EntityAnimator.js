// Sine-based limb animation for humanoid and quadruped mobs.
// Uses the same approach as dragon wing flapping — rotate box meshes around adjusted pivot points.

export class EntityAnimator {
    constructor(boxDefs, boxMeshes) {
        this.parts = {};
        this.animTime = 0;
        this.isHumanoid = false;

        // Map roles to mesh references
        for (let i = 0; i < boxDefs.length; i++) {
            const role = boxDefs[i].role;
            if (!role) continue;
            this.parts[role] = {
                mesh: boxMeshes[i],
                def: boxDefs[i],
                originalY: boxDefs[i].offset[1],
            };
        }

        this.isHumanoid = !!(this.parts.arm_left || this.parts.arm_right);
        this._adjustPivots(boxDefs, boxMeshes);
    }

    _adjustPivots(boxDefs, boxMeshes) {
        // Shift arm/leg geometry so pivot is at shoulder/hip (top of limb)
        for (let i = 0; i < boxDefs.length; i++) {
            const role = boxDefs[i].role;
            if (!role) continue;
            const def = boxDefs[i];
            const mesh = boxMeshes[i];

            if (role.startsWith('arm_') || role.startsWith('leg_')) {
                const halfH = def.size[1] / 2;
                // Shift geometry down so local origin is at the top (joint)
                mesh.geometry.translate(0, -halfH, 0);
                // Reposition mesh to joint location
                mesh.position.y = def.offset[1] + halfH;
            }
        }
    }

    update(dt, isMoving) {
        if (isMoving) {
            this.animTime += dt * 8;
        } else {
            this.animTime += dt * 1.5;
        }

        const swing = Math.sin(this.animTime);
        const breathe = Math.sin(this.animTime * 0.5) * 0.02;

        if (this.isHumanoid) {
            this._animateHumanoid(swing, breathe, isMoving);
        } else {
            this._animateQuadruped(swing, breathe, isMoving);
        }
    }

    _animateHumanoid(swing, breathe, isMoving) {
        const amplitude = isMoving ? 0.8 : 0.05;

        if (this.parts.arm_right) {
            this.parts.arm_right.mesh.rotation.x = swing * amplitude;
        }
        if (this.parts.arm_left) {
            this.parts.arm_left.mesh.rotation.x = -swing * amplitude;
        }
        if (this.parts.leg_right) {
            this.parts.leg_right.mesh.rotation.x = -swing * amplitude * 0.7;
        }
        if (this.parts.leg_left) {
            this.parts.leg_left.mesh.rotation.x = swing * amplitude * 0.7;
        }
        // Subtle head bob
        if (this.parts.head) {
            this.parts.head.mesh.rotation.x = breathe;
        }
        // Body breathe
        if (this.parts.body) {
            this.parts.body.mesh.position.y = this.parts.body.originalY + breathe;
        }
    }

    _animateQuadruped(swing, breathe, isMoving) {
        const amplitude = isMoving ? 0.5 : 0.03;

        // Diagonal gait: front-left + back-right in phase
        if (this.parts.leg_front_left) {
            this.parts.leg_front_left.mesh.rotation.x = swing * amplitude;
        }
        if (this.parts.leg_back_right) {
            this.parts.leg_back_right.mesh.rotation.x = swing * amplitude;
        }
        if (this.parts.leg_front_right) {
            this.parts.leg_front_right.mesh.rotation.x = -swing * amplitude;
        }
        if (this.parts.leg_back_left) {
            this.parts.leg_back_left.mesh.rotation.x = -swing * amplitude;
        }
        // Head bob
        if (this.parts.head) {
            this.parts.head.mesh.rotation.x = breathe;
        }
    }
}
