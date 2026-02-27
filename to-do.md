# AdiCraft Roadmap

## Tier 1 — Core Gameplay Loop

### Fix Mob Models & Animation
- [ ] Add skeletal animation system (arm/leg swing while walking)
- [ ] Add idle animations (breathing, subtle movement)
- [ ] Fix dragon wings (proper geometry instead of solid-color boxes)
- [ ] Add death animation / particles
- [ ] Texture Ryan Smith NPC properly (currently solid-color boxes)
- [ ] Add mob sounds (groans, animal noises via procedural audio)

### Inventory System
- [ ] Full inventory screen (E key to open, 27-slot grid + 9-slot hotbar)
- [ ] Item stacking (max 64)
- [ ] Drag & drop between slots
- [ ] Item entities (dropped items in world, bobbing + pickup)
- [ ] Block drops (breaking a block spawns an item entity)
- [ ] Mob drops (zombie → rotten flesh, skeleton → bones/arrows, cow → leather, pig → porkchop)

### Crafting
- [ ] Crafting table block (2x2 in inventory, 3x3 on table)
- [ ] Recipe system (data-driven JSON or JS definitions)
- [ ] Core recipes: planks, sticks, tools, torches, furnace, crafting table
- [ ] Crafting UI with recipe hints / recipe book

### Tools & Tiers
- [ ] Tool types: pickaxe, axe, shovel, sword, hoe
- [ ] Material tiers: wood → stone → iron → diamond (speed & durability)
- [ ] Mining speed based on tool type (pickaxe for stone, axe for wood, etc.)
- [ ] Tool durability system
- [ ] Block hardness (some blocks require correct tool tier)

## Tier 2 — Survival Depth

### Survival Mode
- [ ] Hunger bar (20 points, depletes over time and with actions)
- [ ] Food items (porkchop, bread, apple, cooked variants)
- [ ] Eating mechanic (hold right-click on food)
- [ ] Health regeneration when hunger is full
- [ ] Starvation damage when hunger is empty
- [ ] Game mode toggle: Survival / Creative (creative = infinite blocks, no hunger, flying)

### Furnace & Smelting
- [ ] Furnace block with UI (input, fuel, output slots)
- [ ] Smelting recipes: raw ore → ingots, raw food → cooked food
- [ ] Fuel system (wood, coal, planks)
- [ ] Progress bar animation

### Day/Night Cycle
- [ ] Sun and moon movement across sky
- [ ] Gradual sky color transitions (dawn → day → dusk → night)
- [ ] Stars at night
- [ ] Hostile mobs only spawn at night (or in dark areas)
- [ ] Bed block to skip night
- [ ] Ambient light level changes

### Weather
- [ ] Rain (particle system, darkened sky)
- [ ] Snow in cold biomes
- [ ] Thunder & lightning (random fire strikes)

## Tier 3 — The Nether

### Nether Dimension
- [ ] Nether terrain generator (netherrack caves, lava oceans at y=31, soul sand valleys)
- [ ] New blocks: netherrack, nether_bricks, soul_sand, glowstone, nether_quartz_ore, magma_block, crimson/warped wood
- [ ] Lava fluid (like water but orange, deals damage)
- [ ] Nether fortress structures (bridges, corridors, blaze spawner rooms)
- [ ] Ceiling at y=128 (enclosed dimension)
- [ ] Red fog / dim ambient lighting

### Nether Portal
- [ ] Obsidian frame construction (4x5 minimum)
- [ ] Portal activation (flint & steel item, or fire mechanic)
- [ ] Purple swirl portal block with particle effects
- [ ] Coordinate scaling (1 block in Nether = 8 in Overworld)
- [ ] Multiplayer sync of portal locations

### Nether Mobs
- [ ] Ghast (flying, shoots fireballs, 10 HP)
- [ ] Blaze (flying, shoots fire charges, found in fortresses)
- [ ] Zombie Piglin (neutral, attacks in groups when provoked)
- [ ] Magma Cube (bouncing slime variant, splits on death)
- [ ] Wither Skeleton (tall skeleton, melee, fortress-only)

## Tier 4 — Combat & Equipment

### Melee Weapons
- [ ] Sword crafting (wood through diamond)
- [ ] Attack damage scaling by tier
- [ ] Attack cooldown / sweep animation
- [ ] Knockback on hit

### Bow & Arrows
- [ ] Bow item with draw mechanic (hold right-click to charge)
- [ ] Arrow projectile with arc physics
- [ ] Arrow crafting (sticks + flint + feathers)
- [ ] Arrows stick into blocks

### Armor System
- [ ] 4 armor slots: helmet, chestplate, leggings, boots
- [ ] Material tiers: leather → iron → diamond
- [ ] Damage reduction calculation
- [ ] Visible armor on player model (and remote players)

### Shield
- [ ] Shield block (right-click to raise)
- [ ] Damage reduction while blocking
- [ ] Shield crafting recipe

## Tier 5 — World & Atmosphere

### Torches & Lighting
- [ ] Torch block (placeable on walls and floors)
- [ ] Block light system (light propagation from sources)
- [ ] Glowstone as light source
- [ ] Darker underground areas without light

### Cave Generation
- [ ] Proper cave/tunnel systems using 3D noise carving
- [ ] Cave biomes (lush caves, dripstone)
- [ ] Underground lakes and lava pools
- [ ] Mineshaft structures

### Structures
- [ ] Villages (houses, farms, paths)
- [ ] Villager NPCs (trading)
- [ ] Desert temples
- [ ] Dungeons (spawner rooms underground)
- [ ] Stronghold (End portal room)

### More Mobs
- [ ] Creeper (explodes near player)
- [ ] Spider (climbs walls, hostile at night)
- [ ] Enderman (teleports, neutral until looked at)
- [ ] Wolf (tameable with bones)
- [ ] Chicken, Sheep (passive, drops)
- [ ] Slime (bouncing, splits on death)

## Tier 6 — Polish & QoL

### Settings Menu
- [ ] Pause menu (Esc key)
- [ ] FOV slider
- [ ] Render distance slider
- [ ] Mouse sensitivity slider
- [ ] Volume controls
- [ ] Keybind customization

### Music & Ambient Audio
- [ ] Procedural background music (calm piano/synth loops)
- [ ] Dimension-specific ambient sounds
- [ ] Cave ambience
- [ ] Underwater sounds

### Visual Polish
- [ ] Block break animation (cracking stages)
- [ ] Particles (block break, footsteps, torch flames, portal swirls)
- [ ] Water animation / flowing water
- [ ] Clouds
- [ ] Better skybox

### XP & Enchanting
- [ ] Experience orbs from mob kills and mining
- [ ] XP bar on HUD
- [ ] Enchanting table block
- [ ] Enchantments (sharpness, protection, efficiency, etc.)

### Redstone (Stretch)
- [ ] Redstone dust (signal transmission)
- [ ] Redstone torch (power source)
- [ ] Levers, buttons, pressure plates
- [ ] Doors (wooden, iron)
- [ ] Pistons
