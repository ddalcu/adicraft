# 🎮 AdiCraft - A Minecraft-Like Game!

Welcome to **AdiCraft**! This is a fun game where you can build things with blocks, just like Minecraft!

## What is AdiCraft? 🏗️

AdiCraft is a game where you can:
- Walk around in a big world made of blocks
- Pick up blocks (grass, dirt, stone, wood, and leaves)
- Place blocks wherever you want
- Explore and create amazing things!

It's like playing with digital LEGO blocks! 🧱

---

## How to Play 🎯

1. **Click on the page** to start playing
2. **Use your mouse** to look around
3. **Use WASD keys** to walk (W=forward, A=left, S=backward, D=right)
4. **Space** to jump
5. **Press 1-5** to pick different blocks from the hotbar at the bottom
6. **Click** to place blocks (or remove them)
7. **Press Escape** to exit the game

---

## What's Inside the Game? 📦

Think of the code like a recipe for making the game. Here's what each part does:

### 📁 **Main Files & Folders**

#### **`index.html`** - The Starting Page
This is like the cover of a book. It tells the computer:
- "Make a game screen"
- "Add a crosshair (the + in the middle)"
- "Add a hotbar at the bottom"
- When you click to play, it starts the game!

#### **`js/` Folder** - The Game's Brain 🧠
This is where all the game's instructions live. It's split into smaller pieces:

---

### **`js/main.js`** - The Manager
Think of this like a **teacher who runs the whole class**. It:
- Wakes up all the different parts of the game
- Tells them to start working together
- Handles what happens when you press number keys (1, 2, 3, 4, 5)
- Keeps track of which block you have selected

---

### **`js/engine/` Folder** - The Game Engine

**`GameEngine.js`** - The Game's Heart ❤️
This is like the **power plant** of the game. It:
- Creates the 3D world (using something called Three.js)
- Makes everything draw on your screen
- Keeps the game running smoothly (60 times per second!)
- Is in charge of the camera (your eyes in the game)

**`InputManager.js`** - The Game's Ears 👂
This listens to what YOU do:
- When you move your mouse
- When you press keys (WASD, space)
- When you click to place/remove blocks

---

### **`js/world/` Folder** - The Game World 🌍

**`World.js`** - The World Manager
This is like the **city planner**. It:
- Takes care of all the chunks (see below)
- Makes new chunks appear as you walk around
- Gets rid of chunks that are far away
- Makes sure the world looks good

**`Chunk.js`** - A Piece of the World
The world is big, so we split it into small pieces called **chunks**. One chunk is like a:
- Building block for the whole world
- Box of 16×256×16 blocks
- When chunks are near you, they get built and shown
- When they're far away, they disappear to save computer power

**`TerrainGenerator.js`** - The World Creator 🎨
This uses special math (Perlin noise) to create:
- Mountains and valleys
- Random-looking but beautiful landscapes
- Different height levels
- Places for grass, dirt, stone, wood, and leaves

**`BlockTypes.js`** - Block Information 📋
This file tells the game about each type of block:
- What it's called (grass, dirt, stone, etc.)
- What color it is
- What texture it has
- Which blocks are solid (you can stand on them)

---

### **`js/player/` Folder** - You in the Game! 👤

**`Player.js`** - Your Character
This controls YOU:
- Where you are in the world
- How you move (forward, back, left, right)
- Jumping and falling
- Your camera (what your eyes see)

**`BlockInteraction.js`** - Building & Breaking
This handles:
- Looking at blocks
- Breaking blocks (removing them)
- Placing new blocks
- Keeping track of which block is selected in your hotbar

---

### **`js/utils/` Folder** - Helper Tools 🔧

**`constants.js`** - Settings & Numbers
All the important numbers live here:
- How fast you move
- How high you jump
- How far you can see
- Size of chunks
- And more!

If you want the game to feel different (faster/slower), you change numbers here!

**`TextureAtlas.js`** - Picture Manager
This handles all the pictures that go on blocks:
- Loads them from a file
- Gives them to the blocks so they look pretty
- Makes sure they line up correctly

**`noise.js`** - The Random Number Maker
Creates random-looking but sensible numbers for:
- Making terrain look natural (not random-random, but natural-random)
- Creating mountains and valleys that look cool

---

### **`css/` Folder** - How It Looks 🎨

**`styles.css`** - The Styling
This file decides how things look on screen:
- The hotbar position and colors
- The crosshair in the middle
- The start screen
- Button styles and more

---

### **`texturepacks/` Folder** - The Pictures 🖼️
Contains images of all the block textures:
- What grass looks like
- What dirt looks like
- What stone looks like
- Etc.

---

## How Does It All Work Together? 🔄

Here's the magic flow:

1. **You start the game** by clicking on `index.html` in your browser
2. **`main.js` wakes up** and says "Let's start!"
3. **GameEngine creates** the 3D world on your screen
4. **InputManager listens** to your mouse and keyboard
5. **World creates chunks** and terrain around you
6. **Player moves** based on your keyboard input
7. **BlockInteraction** lets you place/break blocks
8. **Every frame (60 times per second)**:
   - Your input is read
   - The world updates
   - Everything is drawn
   - You see the updated screen!

---

## Want to Learn More? 📚

### Beginner Steps:
1. **Run the game** - Open `index.html` in your browser
2. **Read `main.js`** - Start with the file that runs everything
3. **Look at `GameEngine.js`** - Understand how the 3D world works
4. **Play with `constants.js`** - Try changing numbers and see what happens!

### Medium Steps:
1. Read `Player.js` - Understand how movement works
2. Read `World.js` - Understand how the world is built
3. Read `BlockInteraction.js` - Understand how you place blocks

### Advanced Steps:
1. Modify `TerrainGenerator.js` - Make different looking worlds
2. Add new block types in `BlockTypes.js`
3. Change how the player moves in `Player.js`

---

## What You Need to Run It 🖥️

- A modern web browser (Chrome, Firefox, Safari, Edge)
- That's it! No installation needed!

Just open `index.html` in your browser and start playing!

---

## Cool Things to Try! 💡

- **Change MOVE_SPEED** in `constants.js` to run faster/slower
- **Change JUMP_VELOCITY** to jump higher/lower
- **Change RENDER_DISTANCE** to see further or use less computer power
- **Add new blocks** in `BlockTypes.js`
- **Make mountains taller** in `TerrainGenerator.js`

---

## The Big Picture 🎬

```
index.html (Click here!)
    ↓
main.js (The manager)
    ↓
Creates: GameEngine, InputManager, World, Player, BlockInteraction
    ↓
These all work together:
├─ GameEngine draws the 3D world
├─ InputManager listens to you
├─ World creates chunks and terrain
├─ Player moves and handles gravity
└─ BlockInteraction lets you build
    ↓
GAME! 🎮
```

---

## Questions? 🤔

If you get stuck:
1. Look at the comments in the code (they explain things)
2. Try changing one number and see what happens
3. Read the file descriptions above
4. Ask an adult programmer for help!

---

**Happy Building! 🧱✨**
