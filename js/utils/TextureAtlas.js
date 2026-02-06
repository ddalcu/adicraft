import * as THREE from 'three';

const TILE_SIZE = 128;
const COLS = 4;
const ROWS = 3;

export const TILE_UV = {
    grass_top:  { col: 0, row: 0 },
    grass_side: { col: 1, row: 0 },
    dirt:       { col: 2, row: 0 },
    stone:      { col: 3, row: 0 },
    wood_top:   { col: 0, row: 1 },
    wood_side:  { col: 1, row: 1 },
    leaves:     { col: 2, row: 1 },
    water:      { col: 3, row: 1 },
    sand:       { col: 0, row: 2 },
};

const GRASS_TINT = '#7CBD6B';
const FOLIAGE_TINT = '#6BBD6B';
const WATER_TINT = '#3F76E4';

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load: ${src}`));
        img.src = src;
    });
}

function tintImage(img, tintColor) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // Draw the grayscale image
    ctx.drawImage(img, 0, 0);

    // Multiply with tint color
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = tintColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Restore alpha from original image
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);

    return canvas;
}

export class TextureAtlas {
    constructor() {
        this.texture = null;
        this.material = null;
    }

    async load(basePath) {
        const blockPath = `${basePath}/block`;

        const [grassTop, grassSide, dirt, stone, oakLogTop, oakLog, oakLeaves, waterStill, sand] = await Promise.all([
            loadImage(`${blockPath}/grass_block_top.png`),
            loadImage(`${blockPath}/grass_block_side.png`),
            loadImage(`${blockPath}/dirt.png`),
            loadImage(`${blockPath}/stone.png`),
            loadImage(`${blockPath}/oak_log_top.png`),
            loadImage(`${blockPath}/oak_log.png`),
            loadImage(`${blockPath}/oak_leaves.png`),
            loadImage(`${blockPath}/water_still.png`),
            loadImage(`${blockPath}/sand.png`),
        ]);

        // Tint grayscale textures
        const tintedGrassTop = tintImage(grassTop, GRASS_TINT);
        const tintedLeaves = tintImage(oakLeaves, FOLIAGE_TINT);
        const tintedWater = tintImage(waterStill, WATER_TINT);

        // Build atlas canvas
        const canvas = document.createElement('canvas');
        canvas.width = COLS * TILE_SIZE;
        canvas.height = ROWS * TILE_SIZE;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Row 0: grass_top(tinted) | grass_side | dirt | stone
        ctx.drawImage(tintedGrassTop, 0 * TILE_SIZE, 0 * TILE_SIZE);
        ctx.drawImage(grassSide,      1 * TILE_SIZE, 0 * TILE_SIZE);
        ctx.drawImage(dirt,            2 * TILE_SIZE, 0 * TILE_SIZE);
        ctx.drawImage(stone,           3 * TILE_SIZE, 0 * TILE_SIZE);

        // Row 1: oak_log_top | oak_log | oak_leaves(tinted) | water(tinted)
        ctx.drawImage(oakLogTop,       0 * TILE_SIZE, 1 * TILE_SIZE);
        ctx.drawImage(oakLog,          1 * TILE_SIZE, 1 * TILE_SIZE);
        ctx.drawImage(tintedLeaves,    2 * TILE_SIZE, 1 * TILE_SIZE);
        // water_still.png is 16×512 animated strip — draw only first 16×16 frame scaled to tile
        ctx.drawImage(tintedWater, 0, 0, 16, 16, 3 * TILE_SIZE, 1 * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Row 2: sand | (spare) | (spare) | (spare)
        ctx.drawImage(sand, 0, 0, sand.width, sand.height, 0 * TILE_SIZE, 2 * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Create Three.js texture
        this.texture = new THREE.CanvasTexture(canvas);
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.generateMipmaps = false;
        this.texture.colorSpace = THREE.SRGBColorSpace;

        // Single shared material for all chunks
        this.material = new THREE.MeshLambertMaterial({ map: this.texture });
    }

    getUVs(col, row) {
        // Canvas Y is top-down, UV Y is bottom-up
        const u0 = col / COLS;
        const u1 = (col + 1) / COLS;
        const v0 = 1 - (row + 1) / ROWS;
        const v1 = 1 - row / ROWS;
        return { u0, v0, u1, v1 };
    }
}
