import * as THREE from 'three';
import { GameEngine } from './engine/GameEngine.js';
import { InputManager } from './engine/InputManager.js';
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { BlockInteraction } from './player/BlockInteraction.js';
import { BLOCK_TYPES } from './world/BlockTypes.js';
import { PLAYER_EYE_HEIGHT, CHUNK_SIZE } from './utils/constants.js';
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
import { EntityTextureManager } from './entities/EntityTextureManager.js';
import { SyncManager } from './network/SyncManager.js';
import { RemotePlayer } from './network/RemotePlayer.js';

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

// Sync state
let syncManager = null;
const remotePlayers = new Map(); // peerId -> RemotePlayer
let positionTimer = 0;
let saveTimer = 0;
const POSITION_SEND_INTERVAL = 0.05; // 20Hz
const SAVE_INTERVAL = 5.0; // save player state every 5s
let playerName = '';

// Dimensions
const dimManager = new DimensionManager(engine.scene, engine);

// World seed
const WORLD_SEED = 42;

// Create worlds with different terrain generators
const overworldTerrain = new TerrainGenerator(WORLD_SEED);
const endTerrain = new EndTerrainGenerator();
const outerEndTerrain = new OuterEndTerrainGenerator(77777);

const overworldWorld = new World(engine.scene, overworldTerrain);
const endWorld = new World(engine.scene, endTerrain);
const outerEndWorld = new World(engine.scene, outerEndTerrain);

// Dimension name -> World instance (for remote block changes)
const dimensionWorlds = {
    overworld: overworldWorld,
    end: endWorld,
    outer_end: outerEndWorld,
};

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

// Entity manager (overworld + outer end mobs)
const entityManager = new EntityManager(engine.scene, getWorld);

// Waystone teleport state
let waystonePos = null;

// Mob drops: place dropped block at death position
entityManager.onMobDrop = (blockId, x, y, z) => {
    const world = getWorld();
    world.setBlock(x, y, z, blockId);
};

// Weapon system
const weapon = new Weapon(engine.camera, engine.scene, entityManager, sound);

// Weapon mode toggle
let weaponMode = false;

// Chat state
let chatOpen = false;
let pinkTimer = 0;
let isAdmin = false;
const seenMessageIds = new Set();
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const chatLog = document.getElementById('chat-log');

function openChat() {
    chatOpen = true;
    chatInput.classList.add('visible-block');
    chatInput.value = '';
    chatInput.focus();
    input.enabled = false;
}

function closeChat() {
    chatOpen = false;
    chatInput.classList.remove('visible-block');
    chatInput.blur();
    chatInput.value = '';
    input.enabled = true;
}

function handleChatSubmit(text) {
    if (text.startsWith('/')) {
        handleCommand(text);
    } else {
        syncManager.sendChat(playerName, syncManager.playerId, text);
        // Easter egg: "Bugrock" triggers pink textures
        if (text.toLowerCase().includes('bugrock')) {
            triggerBugrock();
        }
    }
}

function displayChatMessage(msg) {
    if (seenMessageIds.has(msg.id)) return;
    seenMessageIds.add(msg.id);

    const el = document.createElement('div');
    el.className = 'chat-message';

    if (msg.system) {
        el.classList.add('chat-system');
        el.textContent = msg.text;
    } else {
        let nameClass = '';
        if (syncManager) {
            if (msg.senderId === syncManager.playerId && isAdmin) {
                nameClass = 'chat-admin';
            } else if (syncManager.isOp(msg.senderId)) {
                nameClass = 'chat-op';
            }
        }

        const nameSpan = document.createElement('span');
        if (nameClass) nameSpan.className = nameClass;
        nameSpan.textContent = `<${msg.sender}>`;

        el.appendChild(nameSpan);
        el.appendChild(document.createTextNode(` ${msg.text}`));
    }

    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
    setTimeout(() => el.remove(), 30000);

    // Detect kick messages targeting us
    if (msg.system && msg.text.startsWith('{')) {
        try {
            const data = JSON.parse(msg.text);
            if (data.type === 'kick' && data.targetId === syncManager?.playerId) {
                addSystemMessage('You have been kicked from the game.');
                syncManager.destroy();
                syncManager = null;
            }
        } catch { /* not JSON, ignore */ }
    }

    // Easter egg on any incoming message
    if (!msg.system && msg.text.toLowerCase().includes('bugrock')) {
        triggerBugrock();
    }
}

function addSystemMessage(text) {
    const el = document.createElement('div');
    el.className = 'chat-message chat-system';
    el.textContent = text;
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
    setTimeout(() => el.remove(), 30000);
}

function checkAdmin() {
    if (!isAdmin) {
        addSystemMessage('You must be an admin to use this command.');
        return false;
    }
    return true;
}

function checkAdminOrOp() {
    if (!isAdmin && !syncManager.isOp(syncManager.playerId)) {
        addSystemMessage('You must be an admin or op to use this command.');
        return false;
    }
    return true;
}

function findRemotePlayerByName(name) {
    const lower = name.toLowerCase();
    for (const [id, rp] of remotePlayers) {
        if (rp.name.toLowerCase() === lower) return { id, rp };
    }
    // Partial match
    for (const [id, rp] of remotePlayers) {
        if (rp.name.toLowerCase().includes(lower)) return { id, rp };
    }
    return null;
}

async function handleCommand(text) {
    const parts = text.slice(1).split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
        case 'help': {
            addSystemMessage('--- Commands ---');
            addSystemMessage('/help - Show this list');
            addSystemMessage('/clear - Clear chat');
            addSystemMessage('/setadmin <key> - Set/verify admin key');
            addSystemMessage('/op <player> - Grant op (admin)');
            addSystemMessage('/deop <player> - Revoke op (admin)');
            addSystemMessage('/tp <player> | <x> <y> <z> - Teleport (admin/op)');
            addSystemMessage('/give <blockId> - Set hotbar slot block (admin/op)');
            addSystemMessage('/kick <player> - Kick player (admin)');
            break;
        }
        case 'clear': {
            chatLog.innerHTML = '';
            seenMessageIds.clear();
            break;
        }
        case 'setadmin': {
            if (!args[0]) {
                addSystemMessage('Usage: /setadmin <key>');
                break;
            }
            const secret = args.join(' ');
            const existingHash = syncManager.getAdminHash();

            if (!existingHash) {
                // First player to set admin — bootstrap
                await syncManager.setAdminHash(secret);
                localStorage.setItem('adicraft-admin-key', secret);
                isAdmin = true;
                addSystemMessage('Admin key set. You are now admin.');
            } else {
                // Verify against stored hash
                const valid = await syncManager.verifyAdmin(secret);
                if (valid) {
                    localStorage.setItem('adicraft-admin-key', secret);
                    isAdmin = true;
                    addSystemMessage('Admin key verified. You are now admin.');
                } else {
                    addSystemMessage('Invalid admin key.');
                }
            }
            break;
        }
        case 'op': {
            if (!checkAdmin()) break;
            if (!args[0]) { addSystemMessage('Usage: /op <player>'); break; }
            const target = findRemotePlayerByName(args[0]);
            if (!target) { addSystemMessage(`Player "${args[0]}" not found.`); break; }
            syncManager.setOp(target.id, target.rp.name);
            syncManager.sendChat(playerName, syncManager.playerId,
                `${target.rp.name} is now an operator.`, true);
            break;
        }
        case 'deop': {
            if (!checkAdmin()) break;
            if (!args[0]) { addSystemMessage('Usage: /deop <player>'); break; }
            const target = findRemotePlayerByName(args[0]);
            if (!target) { addSystemMessage(`Player "${args[0]}" not found.`); break; }
            syncManager.removeOp(target.id);
            syncManager.sendChat(playerName, syncManager.playerId,
                `${target.rp.name} is no longer an operator.`, true);
            break;
        }
        case 'tp': {
            if (!checkAdminOrOp()) break;
            if (args.length >= 3) {
                // /tp <x> <y> <z>
                const x = parseFloat(args[0]);
                const y = parseFloat(args[1]);
                const z = parseFloat(args[2]);
                if (isNaN(x) || isNaN(y) || isNaN(z)) {
                    addSystemMessage('Invalid coordinates.');
                    break;
                }
                player.position.set(x, y, z);
                player.velocity.set(0, 0, 0);
                addSystemMessage(`Teleported to ${x}, ${y}, ${z}.`);
            } else if (args[0]) {
                // /tp <player>
                const target = findRemotePlayerByName(args[0]);
                if (!target) { addSystemMessage(`Player "${args[0]}" not found.`); break; }
                player.position.copy(target.rp.targetPos);
                player.velocity.set(0, 0, 0);
                addSystemMessage(`Teleported to ${target.rp.name}.`);
            } else {
                addSystemMessage('Usage: /tp <player> or /tp <x> <y> <z>');
            }
            break;
        }
        case 'give': {
            if (!checkAdminOrOp()) break;
            if (!args[0]) { addSystemMessage('Usage: /give <blockId>'); break; }
            const blockId = parseInt(args[0]);
            if (isNaN(blockId) || !BLOCK_TYPES[blockId]) {
                addSystemMessage(`Invalid block ID: ${args[0]}`);
                break;
            }
            hotbarBlocks[interaction.selectedSlot] = blockId;
            buildHotbarTileCache();
            updateHotbar();
            addSystemMessage(`Set current slot to ${BLOCK_TYPES[blockId].name} (${blockId}).`);
            break;
        }
        case 'kick': {
            if (!checkAdmin()) break;
            if (!args[0]) { addSystemMessage('Usage: /kick <player>'); break; }
            const target = findRemotePlayerByName(args[0]);
            if (!target) { addSystemMessage(`Player "${args[0]}" not found.`); break; }
            // Send kick as a system message with JSON payload
            syncManager.sendChat('System', 'system',
                JSON.stringify({ type: 'kick', targetId: target.id }), true);
            addSystemMessage(`Kicked ${target.rp.name}.`);
            break;
        }
        default: {
            addSystemMessage(`Unknown command: /${cmd}. Type /help for commands.`);
        }
    }
}

function triggerBugrock() {
    pinkTimer = 5.0;
    const atlas = overworldWorld.atlas;
    if (atlas && atlas.material) {
        atlas.material.color.setHex(0xFF69B4);
    }
    for (const entity of entityManager.entities) {
        if (!entity._boxMeshes) continue;
        for (const mesh of entity._boxMeshes) {
            mesh.material.color.setHex(0xFF69B4);
        }
    }
}

function resetTextures() {
    const atlas = overworldWorld.atlas;
    if (atlas && atlas.material) {
        atlas.material.color.setHex(0xFFFFFF);
    }
    for (const entity of entityManager.entities) {
        if (entity._resetColors) entity._resetColors();
    }
}

chatInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Shift' || e.key === 'Escape') {
        e.preventDefault();
        closeChat();
    } else if (e.key === 'Enter') {
        const text = chatInput.value.trim();
        if (text) handleChatSubmit(text);
        closeChat();
    }
});

// End dimension entities
let endCrystals = [];
let dragon = null;
let dragonDefeated = false;

// Hotbar setup — 9 slots like Minecraft
const hotbarBlocks = [1, 2, 3, 4, 5, 7, 24, 25, 32];
// grass, dirt, stone, wood, leaves, sand, end_stone_bricks, purpur_block, waystone
const hotbarSlots = document.querySelectorAll('.hotbar-slot');
const hotbarBlockEls = document.querySelectorAll('.hotbar-block');

// Cache for hotbar tile data URLs (populated after atlas loads)
const hotbarTileCache = new Map();

function updateHotbar() {
    hotbarSlots.forEach((slot, i) => {
        slot.classList.toggle('selected', i === interaction.selectedSlot);
    });
    hotbarBlockEls.forEach((el, i) => {
        const blockId = hotbarBlocks[i];
        if (hotbarTileCache.has(blockId)) {
            el.style.backgroundImage = `url(${hotbarTileCache.get(blockId)})`;
        } else {
            // Fallback: use topColor from block type
            const bt = BLOCK_TYPES[blockId];
            if (bt) el.style.backgroundColor = bt.topColor;
        }
    });
}

function buildHotbarTileCache() {
    const atlas = overworldWorld.atlas;
    if (!atlas || !atlas._canvas) return;
    for (const blockId of hotbarBlocks) {
        const bt = BLOCK_TYPES[blockId];
        if (!bt) continue;
        const { col, row } = bt.topUV;
        hotbarTileCache.set(blockId, atlas.getTileDataURL(col, row));
    }
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
}

if (isMobile) {
    // Mobile: tap overlay to start, no pointer lock needed
    overlay.addEventListener('click', () => {
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

// Number keys for block selection (1-9)
document.addEventListener('keydown', (e) => {
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
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
        entityManager.disposeAll();
        dimManager.switchTo('overworld', player);
    }
}

// =====================
// Yjs Sync Integration
// =====================

function setupSync() {
    // Block changes: write to Yjs + apply locally
    interaction.onBlockChange = (x, y, z, blockId) => {
        const dim = dimManager.getActiveName();
        getWorld().setBlock(x, y, z, blockId);
        syncManager.setBlock(dim, x, y, z, blockId);
    };

    // Remote block changes from other peers or IndexedDB restore
    syncManager.onRemoteBlockChange = (dim, x, y, z, blockId) => {
        const world = dimensionWorlds[dim];
        if (!world) return;

        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const chunk = world.getChunk(cx, cz);
        if (!chunk) return; // chunk not loaded yet, will be applied via onChunkLoaded

        world.setBlock(x, y, z, blockId);
    };

    // When a chunk loads, apply persisted block modifications
    function makeChunkLoadedHandler(dimName) {
        return (cx, cz, chunk) => {
            const mods = syncManager.getChunkMods(dimName, cx, cz);
            if (!mods) return;

            mods.forEach((blockId, coordKey) => {
                const [wx, wy, wz] = coordKey.split(',').map(Number);
                const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
                const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
                chunk.setBlock(lx, wy, lz, blockId);
            });
        };
    }

    overworldWorld.onChunkLoaded = makeChunkLoadedHandler('overworld');
    endWorld.onChunkLoaded = makeChunkLoadedHandler('end');
    outerEndWorld.onChunkLoaded = makeChunkLoadedHandler('outer_end');

    // Chat: display incoming synced messages
    syncManager.onChatMessage = (msg) => {
        displayChatMessage(msg);
    };

    // Awareness: remote player positions + weapon state + mob sync
    syncManager.onPeerChange = (states) => {
        const currentIds = new Set();

        for (const state of states) {
            currentIds.add(state.id);

            let rp = remotePlayers.get(state.id);
            if (!rp) {
                rp = new RemotePlayer(state.id, state.name || 'Player', engine.scene);
                remotePlayers.set(state.id, rp);
            }
            rp.setTarget(state.x, state.y, state.z, state.yaw, state.pitch,
                state.weaponMode, state.shooting);
        }

        // Remove players who left
        for (const [id, rp] of remotePlayers) {
            if (!currentIds.has(id)) {
                rp.dispose();
                remotePlayers.delete(id);
            }
        }

        updatePlayerCount();
    };
}

function savePlayerState() {
    if (!syncManager) return;
    syncManager.savePlayerState({
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        yaw: player.yaw,
        pitch: player.pitch,
        health: player.health,
        dimension: dimManager.getActiveName(),
        hotbarSlot: interaction.selectedSlot,
    });
}

function restorePlayerState() {
    if (!syncManager) return;
    const state = syncManager.loadPlayerState();
    if (!state) return;

    // Restore dimension first
    if (state.dimension && state.dimension !== dimManager.getActiveName()) {
        dimManager.switchTo(state.dimension, player);
        if (state.dimension === 'end' && !dragonDefeated) {
            spawnEndEntities();
        }
    }

    // Restore position
    if (state.x !== undefined) {
        player.position.set(state.x, state.y, state.z);
    }
    if (state.yaw !== undefined) {
        player.yaw = state.yaw;
        player.pitch = state.pitch;
    }
    if (state.health !== undefined) {
        player.health = state.health;
    }
    if (state.hotbarSlot !== undefined) {
        interaction.selectedSlot = state.hotbarSlot;
        interaction.selectedBlockType = hotbarBlocks[state.hotbarSlot];
        updateHotbar();
    }
}

function updatePlayerCount() {
    const countEl = document.getElementById('player-count');
    if (!countEl) return;
    const count = remotePlayers.size + 1;
    countEl.textContent = `${count} player${count !== 1 ? 's' : ''}`;
}

// =========================
// Game Loop
// =========================

engine.onUpdate((dt) => {
    // Pink texture effect timer (ticks even during chat)
    if (pinkTimer > 0) {
        pinkTimer -= dt;
        // Re-pink newly spawned entities
        for (const entity of entityManager.entities) {
            if (!entity._boxMeshes) continue;
            for (const mesh of entity._boxMeshes) {
                mesh.material.color.setHex(0xFF69B4);
            }
        }
        if (pinkTimer <= 0) {
            resetTextures();
        }
    }

    // Chat: open on T, skip game logic while open
    if (!chatOpen && input.wasJustPressed('KeyT')) {
        openChat();
        return;
    }
    if (chatOpen) {
        hud.update(dt);
        return;
    }

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
        if (weaponMode) {
            weapon.show();
        } else {
            weapon.hide();
        }
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

    // Waystone teleport: if holding waystone slot, no target block in range, and a waystone exists
    const holdingWaystone = hotbarBlocks[interaction.selectedSlot] === 32;
    if (!weaponMode && holdingWaystone && waystonePos && input.mouseRightDown && !interaction.targetBlock) {
        player.position.set(waystonePos.x + 0.5, waystonePos.y + 1, waystonePos.z + 0.5);
        player.velocity.set(0, 0, 0);
        input.mouseRightDown = false;
    }

    // Block interaction or weapon
    if (weaponMode) {
        weapon.update(dt, input);
        input.consumeClicks();
    } else {
        interaction.update();
    }

    // Track waystone placement
    if (interaction._lastPlacedBlock === 32 && interaction._lastPlacedPos) {
        waystonePos = interaction._lastPlacedPos.clone();
    }
    interaction._lastPlacedBlock = null;

    // Update entity manager dimension
    entityManager.currentDimension = currentDim;

    // Entity updates (overworld + outer_end)
    if (currentDim === 'overworld' || currentDim === 'outer_end') {
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

    // === Sync: update remote players and send position ===
    if (syncManager) {
        // Determine authority
        const isAuth = syncManager.isAuthority();
        entityManager.authorityMode = isAuth;

        // Authority: process mob damage events from remote players
        if (isAuth) {
            const events = syncManager.consumeMobEvents();
            for (const evt of events) {
                if (evt.type === 'damage') {
                    entityManager.applyDamageById(evt.mobId, evt.data);
                }
            }
        }

        // Non-authority: sync mobs from authority's awareness
        if (!isAuth) {
            const mobData = syncManager.getAuthorityMobs();
            if (mobData) {
                entityManager.syncFromAuthority(mobData);
            }
        }

        // Update remote player avatars (interpolation)
        for (const [id, rp] of remotePlayers) {
            rp.update(dt);
        }

        // Send local position at 20Hz
        positionTimer += dt;
        if (positionTimer >= POSITION_SEND_INTERVAL) {
            positionTimer = 0;

            const extra = {
                weaponMode,
                shooting: weapon.firing ? Date.now() : 0,
            };

            // Authority includes mob data in awareness
            if (isAuth && (currentDim === 'overworld' || currentDim === 'outer_end')) {
                extra.mobs = entityManager.getSerializableMobs();
            }

            syncManager.updatePosition(
                playerName,
                player.position.x, player.position.y, player.position.z,
                player.yaw, player.pitch,
                extra
            );
        }

        // Save player state periodically
        saveTimer += dt;
        if (saveTimer >= SAVE_INTERVAL) {
            saveTimer = 0;
            savePlayerState();
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

    // Preload all entity textures (mobs + dragon)
    await EntityTextureManager.preloadAll();

    // Build hotbar texture cache from atlas and refresh hotbar display
    buildHotbarTileCache();
    updateHotbar();

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

// ==================
// Startup
// ==================

(async () => {
    const content = document.getElementById('overlay-content');
    content.innerHTML = '<h1>AdiCraft</h1><p>Loading...</p>';

    try {
        // Get room and player name from localStorage or defaults
        const roomId = localStorage.getItem('adicraft-room') || 'adicraft-main';
        playerName = localStorage.getItem('adicraft-name') || 'Player-' + Math.random().toString(36).substring(2, 6);

        // Initialize Yjs sync
        syncManager = new SyncManager(roomId);
        setupSync();
        syncManager.connect();

        // Wire weapon remote hit: non-authority sends damage via mob events
        weapon.onRemoteHit = (mobId, damage) => {
            if (syncManager.isAuthority()) {
                // Authority applies damage directly
                entityManager.applyDamageById(mobId, damage);
            } else {
                syncManager.sendMobEvent(mobId, 'damage', damage);
            }
        };

        // On IndexedDB sync: show chat history and re-verify admin key
        syncManager.indexeddbProvider.once('synced', async () => {
            const history = syncManager.getChatHistory(20);
            for (const msg of history) {
                displayChatMessage(msg);
            }

            // Re-verify stored admin key
            const storedKey = localStorage.getItem('adicraft-admin-key');
            if (storedKey) {
                const valid = await syncManager.verifyAdmin(storedKey);
                isAdmin = valid;
                if (valid) addSystemMessage('Admin session restored.');
            }
        });

        await initGame();

        // Restore player state from previous session
        restorePlayerState();

        // Show player info in top-right
        let info = document.getElementById('host-info');
        if (!info) {
            info = document.createElement('div');
            info.id = 'host-info';
            document.body.appendChild(info);
        }
        info.innerHTML = `<span class="host-info-label">${playerName}</span> <span id="player-count">1 player</span>`;
        info.classList.add('visible-block');

        const playText = isMobile ? 'Tap to Play' : 'Click to Play';
        const controls = isMobile
            ? `<div class="controls-grid">
                <span class="key">Joystick</span><span class="action">Move</span>
                <span class="key">Drag screen</span><span class="action">Look around</span>
                <span class="key">JUMP</span><span class="action">Jump / Fly up</span>
                <span class="key">DOWN</span><span class="action">Fly down</span>
                <span class="key">ACT</span><span class="action">Break / Shoot</span>
                <span class="key">MODE</span><span class="action">Toggle gun</span>
               </div>`
            : `<div class="controls-grid">
                <span class="key">WASD</span><span class="action">Move</span>
                <span class="key">Mouse</span><span class="action">Look around</span>
                <span class="key">Left Click</span><span class="action">Break block / Shoot</span>
                <span class="key">Right Click</span><span class="action">Place block</span>
                <span class="key">Space</span><span class="action">Jump (double-tap: fly)</span>
                <span class="key">Shift</span><span class="action">Descend while flying</span>
                <span class="key">1-9</span><span class="action">Select hotbar slot</span>
                <span class="key">G</span><span class="action">Toggle gun mode</span>
                <span class="key">T</span><span class="action">Open chat</span>
               </div>`;
        content.innerHTML = `<h1>AdiCraft</h1><p>${playText}</p>${controls}`;
        overlay.style.cursor = 'pointer';

        // Save state on tab close
        window.addEventListener('beforeunload', () => {
            savePlayerState();
        });
    } catch (err) {
        console.error('Init error:', err);
        content.innerHTML = `<h2>Error</h2><p>${err.message}</p>`;
        const retryBtn = document.createElement('button');
        retryBtn.className = 'mp-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', () => location.reload());
        content.appendChild(retryBtn);
    }
})();
