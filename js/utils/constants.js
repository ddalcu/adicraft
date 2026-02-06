// World
export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
export const RENDER_DISTANCE = 6;
export const MAX_CHUNK_BUILDS_PER_FRAME = 2;

// Terrain
export const SEA_LEVEL = 20;
export const TERRAIN_SCALE = 0.02;
export const TERRAIN_HEIGHT = 6;
export const WATER_LEVEL = 18;

// Player
export const PLAYER_HEIGHT = 1.62;
export const PLAYER_WIDTH = 0.6;
export const PLAYER_EYE_HEIGHT = 1.52;
export const MOVE_SPEED = 5.0;
export const JUMP_VELOCITY = 8.0;
export const GRAVITY = 20.0;
export const MOUSE_SENSITIVITY = 0.002;
export const MAX_PITCH = Math.PI / 2 - 0.01;

// Interaction
export const REACH_DISTANCE = 6;
export const RAYCAST_STEP = 0.01;

// Rendering
export const FOV = 75;
export const NEAR_PLANE = 0.1;
export const FAR_PLANE = 300;
export const SKY_COLOR = 0x87CEEB;
export const AMBIENT_LIGHT_INTENSITY = 0.6;
export const DIR_LIGHT_INTENSITY = 0.8;
export const FOG_NEAR = 50;
export const FOG_FAR = 250;
