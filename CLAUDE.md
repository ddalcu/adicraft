# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AdiCraft is a browser-based Minecraft-like voxel game built with Three.js (v0.170.0). Pure ES6 modules, no build tools or bundler.

## Running the Game

```bash
bun --bun x serve -l 3000
```
Open `http://localhost:3000`. Click to lock pointer and play. A local server is required for ES6 module CORS.

## Deployment

GitHub Actions deploys to GitHub Pages on push to main (`.github/workflows/deploy.yml`). Static site, no server-side code.

## Architecture

The game loop lives in `js/main.js`, which orchestrates all systems via a callback-based update pattern:

```
engine.onUpdate((dt) => { player.update(dt); world.update(pos); ... })
```

### Core Systems

- **GameEngine** (`js/engine/GameEngine.js`) — Three.js scene, camera, renderer, game loop
- **InputManager** (`js/engine/InputManager.js`) — Centralized keyboard/mouse state; other systems query it, never listen directly
- **World** (`js/world/World.js`) — Chunk management (16x64x16 blocks), lazy loading/unloading by player distance
- **Chunk** (`js/world/Chunk.js`) — Block storage (Uint8Array), mesh generation with face culling
- **Player** (`js/player/Player.js`) — FPS character, WASD movement, physics (gravity/jump/collision), health, flying mode
- **BlockInteraction** (`js/player/BlockInteraction.js`) — DDA voxel raycasting, block break/place, hotbar selection
- **DimensionManager** (`js/world/DimensionManager.js`) — Switches between Overworld/End/Outer End (separate World instances each)
- **EntityManager** (`js/entities/EntityManager.js`) — Mob spawning/despawning within radius, collision, attacks
- **Weapon** (`js/player/Weapon.js`) — Combat mode (toggled with G key), raycast hit detection on entities
- **HUD** (`js/ui/HUD.js`) — Health bar, damage flash, boss bar, death screen, mode indicator

### Key Design Patterns

- **Chunk streaming**: Only nearby chunks loaded (RENDER_DISTANCE = 12). Far chunks unloaded.
- **Face culling**: Only block faces adjacent to non-solid blocks are rendered.
- **Texture atlas** (`js/utils/TextureAtlas.js`): Single canvas texture for all blocks, shared across dimensions via `shareAtlas()`.
- **Dirty flag**: Chunks only rebuilt when blocks change, not every frame (MAX_CHUNK_BUILDS_PER_FRAME = 2).
- **Dynamic world reference**: Player receives `getWorld()` function, not a static reference, enabling dimension switching.

### Block System

Block types defined in `js/world/BlockTypes.js` (IDs 0-29). Each has name, solid flag, and texture UVs. Textures live in `texturepacks/Default/assets/`.

### Terrain Generation

`js/world/TerrainGenerator.js` uses multi-octave simplex noise (`js/utils/noise.js`) with a biome system (`js/world/Biomes.js`). Separate generators exist for End and Outer End dimensions. Trees handled by `js/world/TreeGenerator.js`.

### Configuration

All tunable parameters (physics, render distance, terrain scales, etc.) are centralized in `js/utils/constants.js`.

## Extending the Game

**New block type**: Add entry to `BlockTypes.js` with ID/metadata, add texture to `texturepacks/`, optionally add to hotbar in `main.js`.

**New dimension**: Create a terrain generator, instantiate a new World, register via `dimManager.register()` in `main.js`, add portal detection in the game loop.

## Dependencies

- **Three.js v0.170.0** loaded via CDN import map in `index.html`
- **Simplex noise** bundled locally (`js/utils/noise.js`)
- No npm packages or build step
