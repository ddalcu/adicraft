import * as THREE from 'three';

const TILE_SIZE = 128;
const COLS = 8;
const ROWS = 6;

export const TILE_UV = {
    // Row 0
    grass_top:      { col: 0, row: 0 },
    grass_side:     { col: 1, row: 0 },
    dirt:           { col: 2, row: 0 },
    stone:          { col: 3, row: 0 },
    bedrock:        { col: 4, row: 0 },
    coal_ore:       { col: 5, row: 0 },
    iron_ore:       { col: 6, row: 0 },
    gold_ore:       { col: 7, row: 0 },
    // Row 1
    wood_top:       { col: 0, row: 1 },
    wood_side:      { col: 1, row: 1 },
    leaves:         { col: 2, row: 1 },
    water:          { col: 3, row: 1 },
    diamond_ore:    { col: 4, row: 1 },
    snow:           { col: 5, row: 1 },
    ice:            { col: 6, row: 1 },
    spruce_log_top: { col: 7, row: 1 },
    // Row 2
    sand:           { col: 0, row: 2 },
    spruce_log:     { col: 1, row: 2 },
    spruce_leaves:  { col: 2, row: 2 },
    birch_log_top:  { col: 3, row: 2 },
    birch_log:      { col: 4, row: 2 },
    birch_leaves:   { col: 5, row: 2 },
    jungle_log:     { col: 6, row: 2 },
    jungle_leaves:  { col: 7, row: 2 },
    // Row 3
    cactus_side:    { col: 0, row: 3 },
    cactus_top:     { col: 1, row: 3 },
    cactus_bottom:  { col: 2, row: 3 },
    obsidian:       { col: 3, row: 3 },
    end_stone:      { col: 4, row: 3 },
    end_stone_bricks: { col: 5, row: 3 },
    purpur_block:   { col: 6, row: 3 },
    chorus_plant:   { col: 7, row: 3 },
    // Row 4
    chorus_flower:  { col: 0, row: 4 },
    end_portal_frame: { col: 1, row: 4 },
    end_portal:     { col: 2, row: 4 },
    podzol_top:     { col: 3, row: 4 },
    podzol_side:    { col: 4, row: 4 },
    mycelium_top:   { col: 5, row: 4 },
    mycelium_side:  { col: 6, row: 4 },
    grass_snow_side:{ col: 7, row: 4 },
    // Row 5
    waystone:           { col: 0, row: 5 },
    planks:             { col: 1, row: 5 },
    crafting_table_top: { col: 2, row: 5 },
    crafting_table_side:{ col: 3, row: 5 },
};

const GRASS_TINT = '#7CBD6B';
const FOLIAGE_TINT = '#6BBD6B';
const WATER_TINT = '#3F76E4';
const SPRUCE_TINT = '#619961';
const BIRCH_TINT = '#80A755';
const JUNGLE_TINT = '#30BB0B';

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

function createSolidTile(color) {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    return canvas;
}

export class TextureAtlas {
    constructor() {
        this.texture = null;
        this.material = null;
    }

    async load(basePath) {
        const blockPath = `${basePath}/block`;

        const [
            grassTop, grassSide, dirt, stone,
            bedrock, coalOre, ironOre, goldOre,
            oakLogTop, oakLog, oakLeaves, waterStill,
            diamondOre, snow, ice, spruceLogTop,
            sand, spruceLog, spruceLeaves,
            birchLogTop, birchLog, birchLeaves,
            jungleLog, jungleLeaves,
            cactusSide, cactusTop, cactusBottom,
            obsidian, endStone, endStoneBricks,
            purpurBlock, chorusPlant, chorusFlower,
            podzolTop, podzolSide,
            myceliumTop, myceliumSide,
            grassSnowSide,
            oakPlanks, craftingTableTop, craftingTableSide
        ] = await Promise.all([
            loadImage(`${blockPath}/grass_block_top.png`),
            loadImage(`${blockPath}/grass_block_side.png`),
            loadImage(`${blockPath}/dirt.png`),
            loadImage(`${blockPath}/stone.png`),
            loadImage(`${blockPath}/bedrock.png`),
            loadImage(`${blockPath}/coal_ore.png`),
            loadImage(`${blockPath}/iron_ore.png`),
            loadImage(`${blockPath}/gold_ore.png`),
            loadImage(`${blockPath}/oak_log_top.png`),
            loadImage(`${blockPath}/oak_log.png`),
            loadImage(`${blockPath}/oak_leaves.png`),
            loadImage(`${blockPath}/water_still.png`),
            loadImage(`${blockPath}/diamond_ore.png`),
            loadImage(`${blockPath}/snow.png`),
            loadImage(`${blockPath}/ice.png`),
            loadImage(`${blockPath}/spruce_log_top.png`),
            loadImage(`${blockPath}/sand.png`),
            loadImage(`${blockPath}/spruce_log.png`),
            loadImage(`${blockPath}/spruce_leaves.png`),
            loadImage(`${blockPath}/birch_log_top.png`),
            loadImage(`${blockPath}/birch_log.png`),
            loadImage(`${blockPath}/birch_leaves.png`),
            loadImage(`${blockPath}/jungle_log.png`),
            loadImage(`${blockPath}/jungle_leaves.png`),
            loadImage(`${blockPath}/cactus_side.png`),
            loadImage(`${blockPath}/cactus_top.png`),
            loadImage(`${blockPath}/cactus_bottom.png`),
            loadImage(`${blockPath}/obsidian.png`),
            loadImage(`${blockPath}/end_stone.png`),
            loadImage(`${blockPath}/end_stone_bricks.png`),
            loadImage(`${blockPath}/purpur_block.png`),
            loadImage(`${blockPath}/chorus_plant.png`),
            loadImage(`${blockPath}/chorus_flower.png`),
            loadImage(`${blockPath}/podzol_top.png`),
            loadImage(`${blockPath}/podzol_side.png`),
            loadImage(`${blockPath}/mycelium_top.png`),
            loadImage(`${blockPath}/mycelium_side.png`),
            loadImage(`${blockPath}/grass_side_snowed.png`),
            loadImage(`${blockPath}/oak_planks.png`),
            loadImage(`${blockPath}/crafting_table_top.png`),
            loadImage(`${blockPath}/crafting_table_side.png`),
        ]);

        // Tint grayscale textures
        const tintedGrassTop = tintImage(grassTop, GRASS_TINT);
        const tintedLeaves = tintImage(oakLeaves, FOLIAGE_TINT);
        const tintedWater = tintImage(waterStill, WATER_TINT);
        const tintedSpruceLeaves = tintImage(spruceLeaves, SPRUCE_TINT);
        const tintedBirchLeaves = tintImage(birchLeaves, BIRCH_TINT);
        const tintedJungleLeaves = tintImage(jungleLeaves, JUNGLE_TINT);

        // End portal frame — use end_stone_bricks as base (close enough)
        const endPortalFrame = endStoneBricks;
        // End portal — solid dark purple/black
        const endPortalTile = createSolidTile('#1B0033');

        // Build atlas canvas
        const canvas = document.createElement('canvas');
        canvas.width = COLS * TILE_SIZE;
        canvas.height = ROWS * TILE_SIZE;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const drawTile = (img, col, row, srcW, srcH) => {
            if (srcW && srcH) {
                ctx.drawImage(img, 0, 0, srcW, srcH, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else {
                ctx.drawImage(img, 0, 0, img.width, img.height, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        };

        // Row 0
        drawTile(tintedGrassTop, 0, 0);
        drawTile(grassSide, 1, 0);
        drawTile(dirt, 2, 0);
        drawTile(stone, 3, 0);
        drawTile(bedrock, 4, 0);
        drawTile(coalOre, 5, 0);
        drawTile(ironOre, 6, 0);
        drawTile(goldOre, 7, 0);

        // Row 1
        drawTile(oakLogTop, 0, 1);
        drawTile(oakLog, 1, 1);
        drawTile(tintedLeaves, 2, 1);
        // water_still.png is 16x512 animated strip — draw only first 16x16 frame
        ctx.drawImage(tintedWater, 0, 0, 16, 16, 3 * TILE_SIZE, 1 * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        drawTile(diamondOre, 4, 1);
        drawTile(snow, 5, 1);
        drawTile(ice, 6, 1);
        drawTile(spruceLogTop, 7, 1);

        // Row 2
        drawTile(sand, 0, 2);
        drawTile(spruceLog, 1, 2);
        drawTile(tintedSpruceLeaves, 2, 2);
        drawTile(birchLogTop, 3, 2);
        drawTile(birchLog, 4, 2);
        drawTile(tintedBirchLeaves, 5, 2);
        drawTile(jungleLog, 6, 2);
        drawTile(tintedJungleLeaves, 7, 2);

        // Row 3
        drawTile(cactusSide, 0, 3);
        drawTile(cactusTop, 1, 3);
        drawTile(cactusBottom, 2, 3);
        drawTile(obsidian, 3, 3);
        drawTile(endStone, 4, 3);
        drawTile(endStoneBricks, 5, 3);
        drawTile(purpurBlock, 6, 3);
        drawTile(chorusPlant, 7, 3);

        // Row 4
        drawTile(chorusFlower, 0, 4);
        drawTile(endPortalFrame, 1, 4);
        drawTile(endPortalTile, 2, 4);
        drawTile(podzolTop, 3, 4);
        drawTile(podzolSide, 4, 4);
        drawTile(myceliumTop, 5, 4);
        drawTile(myceliumSide, 6, 4);
        drawTile(grassSnowSide, 7, 4);

        // Row 5
        const waystoneTile = createSolidTile('#5CE1E6');
        drawTile(waystoneTile, 0, 5);
        drawTile(oakPlanks, 1, 5);
        drawTile(craftingTableTop, 2, 5);
        drawTile(craftingTableSide, 3, 5);

        // Store canvas reference for hotbar texture extraction
        this._canvas = canvas;

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

    getTileDataURL(col, row) {
        const c = document.createElement('canvas');
        c.width = TILE_SIZE;
        c.height = TILE_SIZE;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this._canvas, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
        return c.toDataURL();
    }
}
