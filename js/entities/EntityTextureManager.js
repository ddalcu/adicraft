import * as THREE from 'three';
import { MOB_TYPES } from './MobTypes.js';

const textureCache = new Map();

const DRAGON_TEXTURE = 'texturepacks/Default/assets/minecraft/textures/entity/enderdragon/dragon.png';

/**
 * Loads, caches, and provides Minecraft-format UV mapping for entity textures.
 */
export class EntityTextureManager {
    static loadTexture(path) {
        if (textureCache.has(path)) {
            return Promise.resolve(textureCache.get(path));
        }
        return new Promise((resolve) => {
            const img = new Image();
            // External URLs need CORS
            if (path.startsWith('http')) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => {
                const texture = new THREE.Texture(img);
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.generateMipmaps = false;
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.needsUpdate = true;
                textureCache.set(path, texture);
                resolve(texture);
            };
            img.onerror = () => resolve(null);
            img.src = path;
        });
    }

    static getTexture(path) {
        return textureCache.get(path) || null;
    }

    static async preloadAll() {
        const promises = [];

        for (const typeDef of Object.values(MOB_TYPES)) {
            if (typeDef.texture) {
                promises.push(EntityTextureManager.loadTexture(typeDef.texture));
            }
        }

        promises.push(EntityTextureManager.loadTexture(DRAGON_TEXTURE));

        await Promise.all(promises);
    }

    /**
     * Converts Minecraft box UV parameters into 6 face region descriptors.
     * Minecraft convention: a box of pixel dimensions (w, h, d) starting at (u, v)
     * lays out faces as: right, front, left, back (horizontally), top/bottom above.
     *
     * Returns { right, front, left, back, top, bottom } each with { u, v, w, h } in texture pixels.
     */
    static minecraftBoxUV(u, v, w, h, d) {
        return {
            right:  { u: u,               v: v + d, w: d, h: h },
            front:  { u: u + d,           v: v + d, w: w, h: h },
            left:   { u: u + d + w,       v: v + d, w: d, h: h },
            back:   { u: u + d + w + d,   v: v + d, w: w, h: h },
            top:    { u: u + d,           v: v,     w: w, h: d },
            bottom: { u: u + d + w,       v: v,     w: w, h: d },
        };
    }

    /**
     * Remaps UV attribute of a BoxGeometry to sample from specific texture regions.
     *
     * Three.js BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
     * We map these to Minecraft faces: right(+X), left(-X), top(+Y), bottom(-Y), front(+Z), back(-Z)
     *
     * texW/texH = logical grid size (e.g. 64x64 for zombie, 64x32 for pig).
     * faceUVs = output of minecraftBoxUV().
     */
    static applyBoxUVs(geometry, texW, texH, faceUVs) {
        const uvAttr = geometry.getAttribute('uv');

        // Three.js BoxGeometry face order → Minecraft face name
        const faceMap = ['right', 'left', 'top', 'bottom', 'front', 'back'];

        for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
            const faceName = faceMap[faceIdx];
            const region = faceUVs[faceName];

            // Normalize pixel coords to 0-1 UV space
            // Minecraft: top-left origin. Three.js: bottom-left origin → flip V
            const u0 = region.u / texW;
            const u1 = (region.u + region.w) / texW;
            const v0 = 1.0 - (region.v + region.h) / texH;
            const v1 = 1.0 - region.v / texH;

            // BoxGeometry: each face has 4 vertices (indices faceIdx*4 + 0..3)
            // Default UV layout per face: (0,1),(1,1),(0,0),(1,0)
            // Vertex order: bottom-left, bottom-right, top-left, top-right
            const base = faceIdx * 4;
            uvAttr.setXY(base + 0, u0, v1); // top-left → maps to (u0, v1)
            uvAttr.setXY(base + 1, u1, v1); // top-right
            uvAttr.setXY(base + 2, u0, v0); // bottom-left
            uvAttr.setXY(base + 3, u1, v0); // bottom-right
        }

        uvAttr.needsUpdate = true;
    }
}

export { DRAGON_TEXTURE };
