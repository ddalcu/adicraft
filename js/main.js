import * as THREE from 'three';
import { GameEngine } from './engine/GameEngine.js';
import { InputManager } from './engine/InputManager.js';
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { BlockInteraction } from './player/BlockInteraction.js';
import { BLOCK_TYPES } from './world/BlockTypes.js';
import { PLAYER_EYE_HEIGHT } from './utils/constants.js';
import { TerrainGenerator } from './world/TerrainGenerator.js';
import { EndTerrainGenerator, END_TOWERS } from './world/EndTerrainGenerator.js';
import { OuterEndTerrainGenerator } from './world/OuterEndTerrainGenerator.js';
import { DimensionManager } from './world/DimensionManager.js';
import { EntityManager } from './entities/EntityManager.js';
import { Weapon } from './player/Weapon.js';
import { HUD } from './ui/HUD.js';
import { Dragon } from './entities/Dragon.js';
import { EndCrystal } from './entities/EndCrystal.js';
import { placeEndPortal } from './world/Structures.js';
import { SoundManager } from './audio/SoundManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { RemotePlayer } from './network/RemotePlayer.js';
import { MSG, encodePos, encodeBlock, encodeBlockReq, encodeJoin, encodeLeave, encodeState } from './network/Protocol.js';

// DOM elements
const canvas = document.getElementById('game-canvas');
const overlay = document.getElementById('overlay');
const crosshair = document.getElementById('crosshair');
const hotbar = document.getElementById('hotbar');
const waterOverlay = document.getElementById('water-overlay');
const flyIndicator = document.getElementById('fly-indicator');
const healthContainer = document.getElementById('health-container');
const weaponIndicator = document.getElementById('weapon-indicator');

// Core systems
const engine = new GameEngine(canvas);
const input = new InputManager(canvas);
const hud = new HUD();
const sound = new SoundManager();

// Multiplayer state
const network = new NetworkManager();
const remotePlayers = new Map();
const blockChanges = []; // Host tracks all block changes for late joiners
const peerNames = new Map(); // peerId -> name
let multiplayerMode = null; // null | 'host' | 'client'
let positionTimer = 0;
const POSITION_SEND_INTERVAL = 0.05; // 20Hz

// Dimensions
const dimManager = new DimensionManager(engine.scene, engine);

// World seed — shared between host and clients
const WORLD_SEED = 42;

// Create worlds with different terrain generators
let overworldTerrain = new TerrainGenerator(WORLD_SEED);
const endTerrain = new EndTerrainGenerator();
const outerEndTerrain = new OuterEndTerrainGenerator(77777);

let overworldWorld = new World(engine.scene, overworldTerrain);
const endWorld = new World(engine.scene, endTerrain);
const outerEndWorld = new World(engine.scene, outerEndTerrain);

dimManager.register('overworld', overworldWorld, {
    skyColor: 0x87CEEB,
    fogNear: 50,
    fogFar: 250,
    spawnPoint: new THREE.Vector3(8, 64, 8),
});

dimManager.register('end', endWorld, {
    skyColor: 0x000000,
    fogNear: 30,
    fogFar: 200,
    spawnPoint: new THREE.Vector3(0, 50, 0),
});

dimManager.register('outer_end', outerEndWorld, {
    skyColor: 0x0A0015,
    fogNear: 30,
    fogFar: 200,
    spawnPoint: new THREE.Vector3(0, 50, 0),
});

// Player gets world via function to support dimension switching
const getWorld = () => dimManager.getActiveWorld();
const player = new Player(engine.camera, input, getWorld, sound);
const interaction = new BlockInteraction(engine.camera, getWorld, engine.scene, input, sound);

// Entity manager (overworld mobs)
const entityManager = new EntityManager(engine.scene, getWorld);

// Weapon system
const weapon = new Weapon(engine.camera, engine.scene, entityManager, sound);

// Weapon mode toggle
let weaponMode = false;

// End dimension entities
let endCrystals = [];
let dragon = null;
let dragonDefeated = false;

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
        Object.values(blockColorClasses).forEach(cls => el.classList.remove(cls));
        const cls = blockColorClasses[hotbarBlocks[i]];
        if (cls) el.classList.add(cls);
    });
}
updateHotbar();

// Mobile detection
const isMobile = input.isMobile;

if (isMobile) {
    document.getElementById('death-respawn-text').textContent = 'Tap to respawn';
}

function showGameUI() {
    overlay.classList.add('hidden');
    crosshair.classList.toggle('visible-block', !isMobile);
    hotbar.classList.add('visible-flex');
    healthContainer.classList.add('visible-block');
    weaponIndicator.classList.add('visible-block');
    input.enabled = true;
    if (isMobile) {
        document.getElementById('touch-controls').classList.add('visible-block');
    }
}

function hideGameUI() {
    overlay.classList.remove('hidden');
    crosshair.classList.remove('visible-block');
    hotbar.classList.remove('visible-flex');
    healthContainer.classList.remove('visible-block');
    weaponIndicator.classList.remove('visible-block');
    input.enabled = false;
    if (isMobile) {
        document.getElementById('touch-controls').classList.remove('visible-block');
    }
}

// Pointer lock — starts game on click (desktop only)
function requestPointerLock() {
    canvas.requestPointerLock();
    sound.startMusic('game-music-loop.mp3');
}

if (isMobile) {
    // Mobile: tap overlay to start, no pointer lock needed
    overlay.addEventListener('click', () => {
        sound.startMusic('game-music-loop.mp3');
        showGameUI();
    });

    // Touch buttons
    const touchJump = document.getElementById('touch-jump');
    const touchMode = document.getElementById('touch-mode');
    const touchAction = document.getElementById('touch-action');

    touchJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        input.simulateKeyPress('Space');
    }, { passive: false });
    touchJump.addEventListener('touchend', (e) => {
        e.preventDefault();
        input.simulateKeyRelease('Space');
    }, { passive: false });

    touchMode.addEventListener('touchstart', (e) => {
        e.preventDefault();
        input.simulateKeyPress('KeyG');
    }, { passive: false });
    touchMode.addEventListener('touchend', (e) => {
        e.preventDefault();
        input.simulateKeyRelease('KeyG');
    }, { passive: false });

    const touchDescend = document.getElementById('touch-descend');
    touchDescend.addEventListener('touchstart', (e) => {
        e.preventDefault();
        input.simulateKeyPress('ShiftLeft');
    }, { passive: false });
    touchDescend.addEventListener('touchend', (e) => {
        e.preventDefault();
        input.simulateKeyRelease('ShiftLeft');
    }, { passive: false });

    touchAction.addEventListener('touchstart', (e) => {
        e.preventDefault();
        input.mouseLeftDown = true;
        input.mouseLeft = true;
    }, { passive: false });
    touchAction.addEventListener('touchend', (e) => {
        e.preventDefault();
        input.mouseLeft = false;
    }, { passive: false });

    // Make hotbar slots tappable
    hotbarSlots.forEach((slot, i) => {
        slot.addEventListener('touchstart', (e) => {
            e.preventDefault();
            interaction.selectedSlot = i;
            interaction.selectedBlockType = hotbarBlocks[i];
            updateHotbar();
        }, { passive: false });
    });

    // Death screen: tap to respawn on mobile
    document.getElementById('death-overlay').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (player.dead) {
            input.simulateKeyPress('KeyR');
            requestAnimationFrame(() => input.simulateKeyRelease('KeyR'));
        }
    }, { passive: false });
} else {
    // Desktop: pointer lock flow
    overlay.addEventListener('click', () => {
        requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        const locked = document.pointerLockElement === canvas;
        if (locked) {
            showGameUI();
        } else {
            hideGameUI();
        }
    });
}

// Number keys for block selection
document.addEventListener('keydown', (e) => {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 5) {
        interaction.selectedSlot = num - 1;
        interaction.selectedBlockType = hotbarBlocks[num - 1];
        updateHotbar();
    }
});

function spawnEndEntities() {
    endCrystals = [];
    for (const tower of END_TOWERS) {
        const crystalPos = new THREE.Vector3(tower.x + 0.5, 40 + tower.height + 1.5, tower.z + 0.5);
        const crystal = new EndCrystal(crystalPos, engine.scene);
        endCrystals.push(crystal);
    }
    dragon = new Dragon(engine.scene, endCrystals);
}

function cleanupEndEntities() {
    for (const crystal of endCrystals) {
        crystal.dispose();
    }
    endCrystals = [];
    if (dragon) {
        dragon._onDeath();
        dragon = null;
    }
}

let portalCooldown = 0;
function checkPortalDetection(dt) {
    if (portalCooldown > 0) {
        portalCooldown -= dt;
        return;
    }

    const bx = Math.floor(player.position.x);
    const by = Math.floor(player.position.y);
    const bz = Math.floor(player.position.z);
    const world = getWorld();
    const feetBlock = world.getBlock(bx, by, bz);
    const belowBlock = world.getBlock(bx, by - 1, bz);

    const onPortal = feetBlock === 29 || belowBlock === 29;
    if (!onPortal) return;

    portalCooldown = 2.0;
    const currentDim = dimManager.getActiveName();

    if (currentDim === 'overworld') {
        entityManager.disposeAll();
        dimManager.switchTo('end', player);
        if (!dragonDefeated) spawnEndEntities();
    } else if (currentDim === 'end') {
        const dx = player.position.x;
        const dz = player.position.z - 60;
        if (Math.abs(dx) < 3 && Math.abs(dz) < 3) {
            cleanupEndEntities();
            dimManager.switchTo('outer_end', player);
        } else {
            cleanupEndEntities();
            dimManager.switchTo('overworld', player);
        }
    } else if (currentDim === 'outer_end') {
        dimManager.switchTo('overworld', player);
    }
}

// =====================
// Multiplayer Networking
// =====================

function setupBlockInteractionNetworking() {
    if (!multiplayerMode) return;

    interaction.onBlockChange = (x, y, z, blockId) => {
        if (multiplayerMode === 'host') {
            // Host: apply locally and broadcast
            getWorld().setBlock(x, y, z, blockId);
            const msg = encodeBlock(x, y, z, blockId);
            network.send(msg);
            blockChanges.push({ x, y, z, blockId });
        } else {
            // Client: request from host, don't apply locally yet
            network.send(encodeBlockReq(x, y, z, blockId));
        }
    };
}

function handleNetworkMessage(data, fromId) {
    switch (data.type) {
        case '_hello': {
            // Host receives client name
            peerNames.set(fromId, data.name);

            // Send state to the new joiner
            const players = [];
            // Add host
            players.push({
                id: network.playerId,
                name: network.playerName,
                x: player.position.x,
                y: player.position.y,
                z: player.position.z,
            });
            // Add existing remote players
            for (const [id, rp] of remotePlayers) {
                players.push({
                    id,
                    name: rp.name,
                    x: rp.targetPos.x,
                    y: rp.targetPos.y,
                    z: rp.targetPos.z,
                });
            }

            network.sendTo(fromId, encodeState(WORLD_SEED, players, blockChanges));

            // Create remote player for the new joiner
            const spawnPoint = new THREE.Vector3(8, 64, 8);
            const rp = new RemotePlayer(fromId, data.name, engine.scene);
            rp.setTarget(spawnPoint.x, spawnPoint.y, spawnPoint.z, 0, 0);
            remotePlayers.set(fromId, rp);

            // Broadcast join to all other clients
            network.sendToAllExcept(fromId, encodeJoin(fromId, data.name, spawnPoint.x, spawnPoint.y, spawnPoint.z));

            const mpUI = document.getElementById('host-info');
            if (mpUI) {
                const count = remotePlayers.size + 1;
                const countEl = document.getElementById('player-count');
                if (countEl) countEl.textContent = `${count} player${count !== 1 ? 's' : ''}`;
            }
            break;
        }

        case MSG.STATE: {
            // Client receives initial state from host
            // Apply block changes
            for (const change of data.blockChanges) {
                getWorld().setBlock(change.x, change.y, change.z, change.blockId);
            }
            // Create remote players for existing players
            for (const p of data.players) {
                if (p.id === network.playerId) continue;
                const rp = new RemotePlayer(p.id, p.name, engine.scene);
                rp.setTarget(p.x, p.y, p.z, 0, 0);
                remotePlayers.set(p.id, rp);
            }
            break;
        }

        case MSG.POS: {
            const rp = remotePlayers.get(data.id);
            if (rp) rp.setTarget(data.x, data.y, data.z, data.yaw, data.pitch);

            // Host relays position to other clients
            if (multiplayerMode === 'host') {
                network.sendToAllExcept(fromId, data);
            }
            break;
        }

        case MSG.BLOCK_REQ: {
            // Host only: validate and apply, then broadcast
            if (multiplayerMode === 'host') {
                getWorld().setBlock(data.x, data.y, data.z, data.blockId);
                const msg = encodeBlock(data.x, data.y, data.z, data.blockId);
                network.send(msg);
                blockChanges.push({ x: data.x, y: data.y, z: data.z, blockId: data.blockId });
            }
            break;
        }

        case MSG.BLOCK: {
            // Client receives confirmed block change
            getWorld().setBlock(data.x, data.y, data.z, data.blockId);
            break;
        }

        case MSG.JOIN: {
            const rp = new RemotePlayer(data.id, data.name, engine.scene);
            rp.setTarget(data.x, data.y, data.z, 0, 0);
            remotePlayers.set(data.id, rp);
            break;
        }

        case MSG.LEAVE: {
            const rp = remotePlayers.get(data.id);
            if (rp) rp.dispose();
            remotePlayers.delete(data.id);
            break;
        }
    }
}

function setupNetworkCallbacks() {
    network.onMessage = handleNetworkMessage;

    network.onPeerLeave = (peerId) => {
        const rp = remotePlayers.get(peerId);
        if (rp) rp.dispose();
        remotePlayers.delete(peerId);
        peerNames.delete(peerId);

        // Broadcast leave to remaining clients
        if (multiplayerMode === 'host') {
            network.send(encodeLeave(peerId));
            const count = remotePlayers.size + 1;
            const countEl = document.getElementById('player-count');
            if (countEl) countEl.textContent = `${count} player${count !== 1 ? 's' : ''}`;
        }
    };
}

// =========================
// Game Loop (with networking)
// =========================

engine.onUpdate((dt) => {
    // Handle respawn
    if (player.dead) {
        if (input.wasJustPressed('KeyR')) {
            player.respawn(hud);
            if (dimManager.getActiveName() !== 'overworld') {
                cleanupEndEntities();
                dimManager.switchTo('overworld', player);
            }
        }
        return;
    }

    // Weapon mode toggle
    if (input.wasJustPressed('KeyG')) {
        weaponMode = !weaponMode;
        hud.setWeaponMode(weaponMode);
    }

    player.update(dt);

    const world = getWorld();
    world.update(player.position);

    const currentDim = dimManager.getActiveName();

    // Set weapon extra targets for End dimension
    if (currentDim === 'end') {
        const targets = [...endCrystals];
        if (dragon && !dragon.dead) targets.push(dragon);
        weapon.extraTargets = targets;
    } else {
        weapon.extraTargets = [];
    }

    // Block interaction or weapon
    if (weaponMode) {
        weapon.update(dt, input);
        input.consumeClicks();
    } else {
        interaction.update();
    }

    // Entity updates (only in overworld)
    if (currentDim === 'overworld') {
        entityManager.update(dt, player.position);
        if (!player.flying) {
            const mobDamage = entityManager.checkMobAttacks(player.position);
            if (mobDamage > 0) {
                player.takeDamage(mobDamage, hud);
            }
        }
    }

    // End dimension updates
    if (currentDim === 'end') {
        for (const crystal of endCrystals) {
            crystal.update(dt);
        }
        if (dragon && !dragon.dead) {
            dragon.update(dt, player, hud);
        } else if (dragon && dragon.dead && !dragonDefeated) {
            dragonDefeated = true;
            hud.hideBossBar();
            hud.showVictoryMessage('The Ender Dragon has been defeated!');
            const endW = getWorld();
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    endW.setBlock(dx, 40, dz, 29);
                }
            }
            endW.setBlock(0, 40, 60, 29);
            endW.setBlock(1, 40, 60, 29);
            endW.setBlock(-1, 40, 60, 29);
        }
    }

    // HUD updates
    hud.update(dt);
    hud.updateHealth(player.health, player.maxHealth);

    // Portal detection
    checkPortalDetection(dt);

    // Water overlay
    const eyeX = Math.floor(player.position.x);
    const eyeY = Math.floor(player.position.y + PLAYER_EYE_HEIGHT);
    const eyeZ = Math.floor(player.position.z);
    const eyeBlock = world.getBlock(eyeX, eyeY, eyeZ);
    waterOverlay.classList.toggle('visible-block', eyeBlock === 6);
    flyIndicator.classList.toggle('visible-block', player.flying);

    // === Multiplayer: update remote players and send position ===
    if (multiplayerMode) {
        // Update remote player avatars (interpolation)
        for (const [id, rp] of remotePlayers) {
            rp.update(dt);
        }

        // Send local position at 20Hz
        positionTimer += dt;
        if (positionTimer >= POSITION_SEND_INTERVAL) {
            positionTimer = 0;
            network.send(encodePos(
                network.playerId,
                player.position.x, player.position.y, player.position.z,
                player.yaw, player.pitch
            ));
        }
    }
});

// ==================
// Initialization Flow
// ==================

async function initGame() {
    // Load atlas once, share across worlds
    await overworldWorld.init();
    endWorld.shareAtlas(overworldWorld.atlas);
    outerEndWorld.shareAtlas(overworldWorld.atlas);

    // Set initial dimension
    dimManager.switchTo('overworld', player);

    // Place End portal in overworld near spawn once chunk is loaded
    let portalPlacedInOverworld = false;
    engine.onUpdate(() => {
        if (portalPlacedInOverworld) return;
        const chunk = overworldWorld.getChunk(3, 3);
        if (!chunk) return;
        const surfaceY = overworldTerrain.getHeight(50, 50);
        placeEndPortal(overworldWorld, 50, surfaceY + 1, 50);
        portalPlacedInOverworld = true;
    });

    engine.start();
}

// Fixed room ID — everyone joins the same game
const ROOM_ID = 'adicraft-main';
const PLAYER_NAME = 'Player-' + Math.random().toString(36).substring(2, 6);

(async () => {
    const content = document.getElementById('overlay-content');
    content.innerHTML = '<h1>AdiCraft</h1><p>Connecting...</p>';

    try {
        const role = await network.autoJoin(ROOM_ID, PLAYER_NAME);
        multiplayerMode = role;

        setupNetworkCallbacks();
        setupBlockInteractionNetworking();

        await initGame();

        // Show player info in top-right
        let info = document.getElementById('host-info');
        if (!info) {
            info = document.createElement('div');
            info.id = 'host-info';
            document.body.appendChild(info);
        }
        const roleLabel = role === 'host' ? 'Hosting' : 'Connected';
        info.innerHTML = `<span class="host-info-label">${roleLabel}</span> <span id="player-count">1 player</span>`;
        info.classList.add('visible-block');

        const playText = isMobile ? 'Tap to Play' : 'Click to Play';
        content.innerHTML = `<h1>AdiCraft</h1><p>${playText}</p>`;
        overlay.style.cursor = 'pointer';
    } catch (err) {
        content.innerHTML = `<h2>Connection Error</h2><p>${err.message}</p>`;
        const retryBtn = document.createElement('button');
        retryBtn.className = 'mp-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', () => location.reload());
        content.appendChild(retryBtn);
    }
})();
