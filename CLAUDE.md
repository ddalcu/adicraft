# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AdiCraft is a browser-based Minecraft-like voxel game built with Three.js (v0.170.0). Pure ES6 modules, no build tools or bundler. Features multiplayer sync via Yjs CRDTs, 3 dimensions, 5 mob types, a boss fight, procedural audio, and mobile support.

## Running the Game

```bash
bun --bun x serve -l 3000
```
Open `http://localhost:3000`. Click to lock pointer and play. A local server is required for ES6 module CORS.

## Deployment

**Game client**: GitHub Actions deploys to GitHub Pages on push to main (`.github/workflows/deploy.yml`). Static site. Build ID (git hash) stamped into `index.html` via `sed` at deploy time (`data-build` attribute on `<html>`).

**Relay server**: Docker container deployed to `adiserver.deploy.dalcu.com`. Persistent data stored in `/app/dbDir` volume (LevelDB for Yjs docs, `branches.json` for branch metadata). Build: `docker build -t adiserver server/`, deploy via `mcp-deploy`.

## Architecture

The game loop lives in `js/main.js`, which orchestrates all systems via a callback-based update pattern:

```
engine.onUpdate((dt) => { player.update(dt); world.update(pos); ... })
```

### Core Systems

| System | File | Purpose |
|--------|------|---------|
| GameEngine | `js/engine/GameEngine.js` | Three.js scene, camera (added to scene for weapon model children), renderer, game loop |
| InputManager | `js/engine/InputManager.js` | Centralized keyboard/mouse state; other systems query it, never listen directly |
| World | `js/world/World.js` | Chunk management (16x64x16), lazy loading/unloading by player distance |
| Chunk | `js/world/Chunk.js` | Block storage (Uint8Array), mesh generation with face culling, dirty flag |
| Player | `js/player/Player.js` | FPS character, WASD, physics (gravity/jump/collision), health (20 HP), flying (double-space) |
| BlockInteraction | `js/player/BlockInteraction.js` | DDA voxel raycasting, block break/place, 9-slot hotbar |
| Weapon | `js/player/Weapon.js` | Quake-style nailgun model (3D, camera-attached), projectiles, muzzle flash, recoil, floating damage numbers |
| DimensionManager | `js/world/DimensionManager.js` | Switches between Overworld/End/Outer End (separate World instances) |
| EntityManager | `js/entities/EntityManager.js` | Mob spawning/despawning within radius, collision, attacks, authority-aware for multiplayer |
| Entity | `js/entities/Entity.js` | Base mob class: box mesh, hostile/passive AI, 3D aggro detection (range 10), gravity, hurt flash |
| MobTypes | `js/entities/MobTypes.js` | Data-driven definitions: zombie, skeleton, pig, cow, ryan_smith |
| Dragon | `js/entities/Dragon.js` | Ender Dragon boss (200 HP), circle/dive/perch AI phases, crystal healing beams |
| EndCrystal | `js/entities/EndCrystal.js` | Healing crystals on obsidian towers, one-shot destroyable |
| HUD | `js/ui/HUD.js` | Health bar, damage flash, boss bar, death screen, mode indicator, crosshair |
| SoundManager | `js/audio/SoundManager.js` | Procedural Web Audio synthesis (no audio files): shoot, hurt, jump, footstep, block break/place |
| SyncManager | `js/network/SyncManager.js` | Yjs CRDT sync: blocks, chat, player state, mob events via WebSocket + IndexedDB |
| RemotePlayer | `js/network/RemotePlayer.js` | 3D avatar with nametag, gun visibility, muzzle flash, lerped interpolation |
| MultiplayerUI | `js/network/MultiplayerUI.js` | Branch-oriented world menu: main menu, branch browser, create world |

### Key Design Patterns

- **Chunk streaming**: Only nearby chunks loaded (RENDER_DISTANCE = 12). Far chunks unloaded.
- **Face culling**: Only block faces adjacent to non-solid blocks are rendered.
- **Texture atlas** (`js/utils/TextureAtlas.js`): Single 1024x768 canvas texture (8x6 grid of 128px tiles) for all blocks, shared across dimensions via `shareAtlas()`.
- **Dirty flag**: Chunks only rebuilt when blocks change (MAX_CHUNK_BUILDS_PER_FRAME = 2).
- **Dynamic world reference**: Player receives `getWorld()` function, not a static reference, enabling dimension switching.
- **Camera-attached weapon**: Gun model is a child of the camera (camera added to scene in GameEngine).
- **Authority system**: Lowest Yjs clientID manages mob spawning/AI to prevent duplication in multiplayer.
- **CRDT sync**: All shared state (blocks, chat, ops) uses Yjs conflict-free replicated data types.
- **Overlay freeze**: Game loop skips player/entity updates while the menu overlay is visible, preventing physics from running before terrain syncs. Only chunk loading and camera positioning run during overlay.
- **Chunk-loading guard**: Player physics freeze if the chunk under the player isn't loaded yet, preventing fall-through on unloaded terrain.

### Block System

Block types defined in `js/world/BlockTypes.js` (IDs 0-32). Each has name, solid flag, and texture UVs. Textures live in `texturepacks/Default/assets/minecraft/textures/block/`.

Key blocks: air(0), grass(1), dirt(2), stone(3), wood(4), leaves(5), water(6), sand(7), bedrock(8), ores(9-12), snow(13), ice(14), spruce/birch/jungle logs+leaves(15-20), cactus(21), obsidian(22), end blocks(23-29), podzol(30), mycelium(31), waystone(32).

### Terrain Generation

`js/world/TerrainGenerator.js` uses multi-octave simplex noise (`js/utils/noise.js`) with a biome system (`js/world/Biomes.js`). 7 biomes: Plains, Forest, Desert, Snow, Mountains, Swamp, Jungle. Separate generators exist for End (`EndTerrainGenerator.js`) and Outer End (`OuterEndTerrainGenerator.js`). Trees handled by `js/world/TreeGenerator.js` (oak, birch, spruce, jungle, cactus).

### Dimensions

- **Overworld** (seed=42): Biome-based terrain, spawn at (8, terrain_height+2, 8), sky 0x87CEEB
- **End**: Central end_stone island, 8 obsidian towers, dragon boss + crystals, sky black
- **Outer End**: Floating islands, chorus plants, end cities (purpur towers), Ryan Smith NPC

### Multiplayer Architecture

Uses Yjs CRDTs with a y-websocket relay server (`wss://adiserver.deploy.dalcu.com`).

- **Block sync**: One YMap per dimension, keyed by `"x,y,z"` coordinates
- **Player positions**: Yjs Awareness protocol (ephemeral, 20Hz updates)
- **Chat**: YArray with max 100 messages, supports system messages and `/worlds` command
- **Mob coordination**: Authority client (lowest clientID) manages spawning; mob events YArray for cross-client damage
- **Persistence**: IndexedDB stores Yjs doc locally; block changes survive disconnects
- **Admin/Ops**: SHA-256 hashed admin password, ops list in YMap
- **World branching**: Git-style branch system. Each branch = separate Yjs room with metadata. Server tracks branches in `branches.json` (parent, createdAt, lastActivity). Forking copies parent Yjs doc state via `Y.encodeStateAsUpdate`/`Y.applyUpdate`. `adicraft-main` is permanent and auto-created.
- **Branch API**: `GET /api/branches` (list with player counts), `POST /api/branches` (create/fork), `DELETE /api/branches/:name` (remove). Auto-cleanup hourly removes branches inactive 30+ days with 0 players.

### Startup Flow

- **First visit** (no `adicraft-name` in localStorage): Shows MultiplayerUI main menu (name input, Join Main World, Browse Worlds, Create New World)
- **Return visit**: Auto-connects to last branch from localStorage, shows "Click to Play" overlay
- **`/worlds` chat command**: Opens branch browser without page reload; selecting a world saves to localStorage and reloads
- **Game loop frozen during overlay**: Only chunk loading and camera positioning run while menu is visible, preventing physics fall-through during Yjs sync

### Configuration

All tunable parameters centralized in `js/utils/constants.js`: CHUNK_SIZE=16, CHUNK_HEIGHT=64, RENDER_DISTANCE=12, MOVE_SPEED=5.0, FLY_SPEED=30.0, JUMP_VELOCITY=8.0, GRAVITY=20.0, REACH_DISTANCE=6, FOV=75, WATER_LEVEL=18.

## Extending the Game

**New block type**: Add entry to `BlockTypes.js` with ID/metadata, add texture PNG to `texturepacks/Default/assets/minecraft/textures/block/`, register UV in `TextureAtlas.js`, optionally add to hotbar in `main.js`.

**New mob type**: Add entry to `MobTypes.js` with stats, box geometry, texture path. Entity system handles the rest.

**New dimension**: Create a terrain generator, instantiate a new World, register via `dimManager.register()` in `main.js`, add portal detection in the game loop.

## Dependencies

- **Three.js v0.170.0** loaded via CDN import map in `index.html`
- **Yjs** + **y-websocket** + **y-indexeddb** loaded via ESM CDN (`esm.sh`)
- **Simplex noise** bundled locally (`js/utils/noise.js`)
- No npm packages or build step
