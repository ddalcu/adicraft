# AdiCraft

A browser-based Minecraft-like voxel game with real-time multiplayer. Built with Three.js, Yjs CRDTs, and zero build tools.

**[Play Now](https://ddalcu.github.io/adicraft/)** | Pure ES6 modules | No bundler | Mobile support

---

## Multiplayer Architecture

```
                        ┌─────────────────────────────┐
                        │   y-websocket Relay Server   │
                        │  adiserver.deploy.dalcu.com  │
                        │                              │
                        │  - Relays Yjs doc updates    │
                        │  - Routes awareness state    │
                        │  - Branch metadata + API     │
                        │  - Auto-cleanup (30d stale)  │
                        └──────────┬──────────────────┘
                                   │
                    WebSocket (wss://)
                                   │
              ┌────────────────────┼─────────────────────┐
              │                    │                     │
   ┌──────────▼──────────┐ ┌──────▼───────────┐ ┌──────▼───────────┐
   │     Browser A       │ │    Browser B     │ │    Browser C     │
   │  (Authority Client) │ │                  │ │                  │
   │                     │ │                  │ │                  │
   │  ┌───────────────┐  │ │  ┌─────────────┐ │ │  ┌─────────────┐ │
   │  │   Yjs Doc     │  │ │  │   Yjs Doc   │ │ │  │   Yjs Doc   │ │
   │  │               │  │ │  │             │ │ │  │             │ │
   │  │ - Block YMaps │◄─┼─┼──► (same)      │◄┼─┼──► (same)      │ │
   │  │ - Chat YArray │  │ │  │             │ │ │  │             │ │
   │  │ - Ops YMap    │  │ │  │             │ │ │  │             │ │
   │  │ - Mob Events  │  │ │  │             │ │ │  │             │ │
   │  └───────┬───────┘  │ │  └──────┬──────┘ │ │  └──────┬──────┘ │
   │          │          │ │         │        │ │        │         │
   │  ┌───────▼───────┐  │ │  ┌─────▼───────┐ │ │  ┌─────▼───────┐ │
   │  │  IndexedDB    │  │ │  │  IndexedDB  │ │ │  │  IndexedDB  │ │
   │  │  (offline     │  │ │  │  (offline   │ │ │  │  (offline   │ │
   │  │   persist)    │  │ │  │   persist)  │ │ │  │   persist)  │ │
   │  └───────────────┘  │ │  └─────────────┘ │ │  └─────────────┘ │
   │                     │ │                  │ │                  │
   │  ┌───────────────┐  │ │  ┌─────────────┐ │ │  ┌─────────────┐ │
   │  │  Awareness    │  │ │  │  Awareness  │ │ │  │  Awareness  │ │
   │  │  (ephemeral)  │  │ │  │  (ephemeral)│ │ │  │  (ephemeral)│ │
   │  │               │  │ │  │             │ │ │  │             │ │
   │  │ - Position    │◄─┼─┼──► Position    │◄┼─┼──► Position    │ │
   │  │ - Name        │  │ │  │ - Name      │ │ │  │ - Name      │ │
   │  │ - Weapon mode │  │ │  │ - Weapon    │ │ │  │ - Weapon    │ │
   │  │ - Mob states  │  │ │  │             │ │ │  │             │ │
   │  └───────────────┘  │ │  └─────────────┘ │ │  └─────────────┘ │
   └─────────────────────┘ └──────────────────┘ └───────────────────┘

   Authority = lowest Yjs clientID
   - Manages mob spawning, AI, despawning
   - Broadcasts mob positions via Awareness
   - Other clients render mobs from authority state
```

### What syncs and how

| Data | Yjs Type | Persistence | Update Rate |
|------|----------|-------------|-------------|
| Block changes | YMap per dimension | IndexedDB + Server | On change |
| Player positions | Awareness (ephemeral) | None (real-time only) | 20 Hz |
| Chat messages | YArray (max 100) | IndexedDB + Server | On send |
| Mob damage events | YArray | Server relay | On hit |
| Player state (save) | YMap | IndexedDB + Server | Every 5s |
| Admin/Ops | YMap | IndexedDB + Server | On change |

---

## Features

### World
- 3 dimensions: Overworld (7 biomes), The End (dragon boss), Outer End (floating islands)
- 33 block types with texture atlas
- Procedural terrain with simplex noise
- 5 tree types (oak, birch, spruce, jungle, cactus)
- Chunk streaming with face-culled mesh generation

### Combat
- Quake-style nailgun with 3D model, recoil, muzzle flash
- Visible nail projectiles that travel to target
- Floating damage numbers above hit enemies
- Ender Dragon boss fight with crystal healing mechanics
- 5 mob types: Zombie, Skeleton, Pig, Cow, Ryan Smith

### Multiplayer
- Real-time P2P sync via Yjs CRDTs (no central game server)
- **World branching**: fork worlds (git-style), browse by player count, auto-cleanup of stale branches
- Shared block changes persist across sessions
- Remote player avatars with nametags and weapon visibility
- In-game chat with admin/ops system (`/worlds` to switch worlds)
- Authority-based mob coordination

### Other
- Procedural audio (all sounds synthesized, no audio files)
- Mobile touch controls (virtual joystick + buttons)
- PWA manifest for fullscreen mobile
- Flying mode (double-tap space)
- Waystone teleportation

---

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look around |
| Space | Jump (double-tap: toggle fly) |
| Shift | Descend (flying) |
| Left Click | Break block / Fire weapon |
| Right Click | Place block / Waystone teleport |
| 1-9 | Select hotbar slot |
| G | Toggle weapon mode |
| T | Open chat |
| /worlds | Browse & switch worlds (in chat) |
| Escape | Release pointer |

---

## Running Locally

A local HTTP server is required for ES6 module CORS.

```bash
# Install Bun (if needed)
curl -fsSL https://bun.sh/install | bash

# Start server
cd adicraft
bun --bun x serve -l 3000
```

Open `http://localhost:3000` and click to play.

---

## Project Structure

```
adicraft/
├── index.html                  # Entry point, DOM elements, import map
├── css/styles.css              # All UI styling
├── manifest.json               # PWA manifest
├── js/
│   ├── main.js                 # Game loop, system orchestration
│   ├── engine/
│   │   ├── GameEngine.js       # Three.js scene, camera, renderer, loop
│   │   └── InputManager.js     # Keyboard/mouse state
│   ├── player/
│   │   ├── Player.js           # FPS controller, physics, health
│   │   ├── BlockInteraction.js # Block break/place, hotbar
│   │   └── Weapon.js           # Nailgun model, projectiles, damage numbers
│   ├── world/
│   │   ├── World.js            # Chunk management, streaming
│   │   ├── Chunk.js            # Block storage, mesh generation
│   │   ├── BlockTypes.js       # 33 block definitions
│   │   ├── TerrainGenerator.js # Overworld generation
│   │   ├── EndTerrainGenerator.js
│   │   ├── OuterEndTerrainGenerator.js
│   │   ├── Biomes.js           # 7 biome definitions
│   │   ├── TreeGenerator.js    # 5 tree templates
│   │   ├── DimensionManager.js # Dimension switching
│   │   └── Structures.js       # Portal frame placement
│   ├── entities/
│   │   ├── Entity.js           # Base mob class, AI, combat
│   │   ├── EntityManager.js    # Spawning, despawning, attacks
│   │   ├── MobTypes.js         # Mob stat definitions
│   │   ├── EntityTextureManager.js # Texture loading, UV mapping
│   │   ├── Dragon.js           # Ender Dragon boss
│   │   └── EndCrystal.js       # Healing crystals
│   ├── ui/
│   │   └── HUD.js              # Health, boss bar, death screen
│   ├── audio/
│   │   └── SoundManager.js     # Procedural Web Audio synthesis
│   ├── network/
│   │   ├── SyncManager.js      # Yjs CRDT sync, authority, admin
│   │   ├── RemotePlayer.js     # Remote player 3D avatar
│   │   └── MultiplayerUI.js    # Branch-oriented world menu (join/browse/create)
│   └── utils/
│       ├── constants.js        # All tunable parameters
│       ├── TextureAtlas.js     # Block texture atlas builder
│       └── noise.js            # Simplex noise
├── server/
│   ├── server.cjs             # y-websocket relay + branch API + status page
│   ├── Dockerfile             # Node 24 Alpine container
│   └── package.json
└── texturepacks/
    └── Default/assets/minecraft/textures/
        ├── block/              # 40+ block textures (PNG)
        └── entity/             # Mob textures (zombie, skeleton, etc.)
```

---

## Dependencies

- **Three.js v0.170.0** — 3D rendering (CDN import map)
- **Yjs** — CRDT document sync
- **y-websocket** — WebSocket provider for Yjs
- **y-indexeddb** — IndexedDB persistence for Yjs
- **Simplex noise** — Bundled locally

No npm install. No build step. Everything loads via browser import maps.

---

## Extending the Game

**Add a block**: Add entry to `BlockTypes.js` with ID, add PNG to `texturepacks/`, register UV in `TextureAtlas.js`, optionally add to hotbar in `main.js`.

**Add a mob**: Add entry to `MobTypes.js` with stats, box geometry, and texture path. The entity system handles spawning and AI.

**Add a dimension**: Create a terrain generator, instantiate a new World, register via `dimManager.register()` in `main.js`, add portal detection in the game loop.
