import { GameEngine } from './engine/GameEngine.js';
import { InputManager } from './engine/InputManager.js';
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { BlockInteraction } from './player/BlockInteraction.js';
import { BLOCK_TYPES } from './world/BlockTypes.js';
import { PLAYER_EYE_HEIGHT } from './utils/constants.js';

const canvas = document.getElementById('game-canvas');
const overlay = document.getElementById('overlay');
const crosshair = document.getElementById('crosshair');
const hotbar = document.getElementById('hotbar');
const waterOverlay = document.getElementById('water-overlay');

const engine = new GameEngine(canvas);
const input = new InputManager(canvas);
const world = new World(engine.scene);
const player = new Player(engine.camera, input, world);
const interaction = new BlockInteraction(engine.camera, world, engine.scene, input);

// Hotbar setup
const hotbarBlocks = [1, 2, 3, 4, 5]; // grass, dirt, stone, wood, leaves
const hotbarSlots = document.querySelectorAll('.hotbar-slot');
const hotbarBlockEls = document.querySelectorAll('.hotbar-block');

const blockColorClasses = {
    1: 'block-color-grass',
    2: 'block-color-dirt',
    3: 'block-color-stone',
    4: 'block-color-wood',
    5: 'block-color-leaves'
};

function updateHotbar() {
    hotbarSlots.forEach((slot, i) => {
        slot.classList.toggle('selected', i === interaction.selectedSlot);
    });
    hotbarBlockEls.forEach((el, i) => {
        // Remove all block color classes
        Object.values(blockColorClasses).forEach(cls => el.classList.remove(cls));
        // Add the correct one
        const cls = blockColorClasses[hotbarBlocks[i]];
        if (cls) el.classList.add(cls);
    });
}
updateHotbar();

// Pointer lock
overlay.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    overlay.classList.toggle('hidden', locked);
    crosshair.classList.toggle('visible-block', locked);
    hotbar.classList.toggle('visible-flex', locked);
    input.enabled = locked;
});

// Number keys for block selection
document.addEventListener('keydown', (e) => {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 5) {
        interaction.selectedSlot = num - 1;
        interaction.selectedBlockType = hotbarBlocks[num - 1];
        updateHotbar();
    }
});

// Game loop
engine.onUpdate((dt) => {
    player.update(dt);
    world.update(player.position);
    interaction.update();

    const eyeX = Math.floor(player.position.x);
    const eyeY = Math.floor(player.position.y + PLAYER_EYE_HEIGHT);
    const eyeZ = Math.floor(player.position.z);
    const eyeBlock = world.getBlock(eyeX, eyeY, eyeZ);
    waterOverlay.classList.toggle('visible-block', eyeBlock === 6);
});

// Load texture atlas, then start
(async () => {
    await world.init();
    engine.start();
})();
