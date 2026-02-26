import * as THREE from 'three';
import {
    FOV, NEAR_PLANE, FAR_PLANE, SKY_COLOR,
    AMBIENT_LIGHT_INTENSITY, DIR_LIGHT_INTENSITY,
    FOG_NEAR, FOG_FAR
} from '../utils/constants.js';

export class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(SKY_COLOR);
        this.scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);

        this.camera = new THREE.PerspectiveCamera(
            FOV,
            window.innerWidth / window.innerHeight,
            NEAR_PLANE,
            FAR_PLANE
        );
        // Add camera to scene so children (e.g. weapon model) render correctly
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this._setupLighting();
        this._setupResize();

        this.clock = new THREE.Clock();
        this.updateCallbacks = [];
    }

    _setupLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, DIR_LIGHT_INTENSITY);
        dirLight.position.set(50, 100, 30);
        this.scene.add(dirLight);
    }

    _setupResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    start() {
        const loop = () => {
            requestAnimationFrame(loop);
            const dt = this.clock.getDelta();
            const clampedDt = Math.min(dt, 0.1);

            for (const cb of this.updateCallbacks) {
                cb(clampedDt);
            }

            this.renderer.render(this.scene, this.camera);
        };
        loop();
    }
}
