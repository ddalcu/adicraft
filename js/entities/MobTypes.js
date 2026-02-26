// Data-driven mob definitions
// Each mob type defines stats, behavior, box geometry, and texture UV mapping for rendering.

const TEX_BASE = 'texturepacks/Default/assets/minecraft/textures/entity';

export const MOB_TYPES = {
    zombie: {
        name: 'Zombie',
        hostile: true,
        health: 20,
        speed: 3.0,
        damage: 3,
        attackRange: 1.5,
        detectRange: 16,
        width: 0.6,
        height: 1.8,
        texture: `${TEX_BASE}/zombie/zombie.png`,
        textureSize: [64, 64],
        // Box parts: {offset [x,y,z], size [w,h,d], color, uv {u,v,w,h,d}}
        boxes: [
            { offset: [0, 0.9, 0], size: [0.5, 0.7, 0.3], color: 0x4A7A2E,
              uv: { u: 16, v: 16, w: 8, h: 12, d: 4 } },       // body
            { offset: [0, 1.55, 0], size: [0.4, 0.4, 0.4], color: 0x4A7A2E,
              uv: { u: 0, v: 0, w: 8, h: 8, d: 8 } },          // head
            { offset: [-0.35, 0.9, 0], size: [0.2, 0.6, 0.2], color: 0x4A7A2E,
              uv: { u: 40, v: 16, w: 4, h: 12, d: 4 } },       // right arm
            { offset: [0.35, 0.9, 0], size: [0.2, 0.6, 0.2], color: 0x4A7A2E,
              uv: { u: 32, v: 48, w: 4, h: 12, d: 4 } },       // left arm
            { offset: [-0.15, 0.15, 0], size: [0.2, 0.7, 0.2], color: 0x2B4A8C,
              uv: { u: 0, v: 16, w: 4, h: 12, d: 4 } },        // right leg
            { offset: [0.15, 0.15, 0], size: [0.2, 0.7, 0.2], color: 0x2B4A8C,
              uv: { u: 16, v: 48, w: 4, h: 12, d: 4 } },       // left leg
        ]
    },
    skeleton: {
        name: 'Skeleton',
        hostile: true,
        health: 20,
        speed: 3.5,
        damage: 2,
        attackRange: 1.5,
        detectRange: 16,
        width: 0.6,
        height: 1.8,
        texture: `${TEX_BASE}/skeleton/skeleton.png`,
        textureSize: [64, 32],
        boxes: [
            { offset: [0, 0.9, 0], size: [0.4, 0.7, 0.25], color: 0xC8C8B0,
              uv: { u: 16, v: 16, w: 8, h: 12, d: 4 } },      // body
            { offset: [0, 1.55, 0], size: [0.4, 0.4, 0.4], color: 0xC8C8B0,
              uv: { u: 0, v: 0, w: 8, h: 8, d: 8 } },          // head
            { offset: [-0.3, 0.9, 0], size: [0.15, 0.6, 0.15], color: 0xC8C8B0,
              uv: { u: 40, v: 16, w: 4, h: 12, d: 4 } },       // right arm
            { offset: [0.3, 0.9, 0], size: [0.15, 0.6, 0.15], color: 0xC8C8B0,
              uv: { u: 40, v: 16, w: 4, h: 12, d: 4 } },       // left arm (mirrored)
            { offset: [-0.12, 0.15, 0], size: [0.15, 0.7, 0.15], color: 0xC8C8B0,
              uv: { u: 0, v: 16, w: 4, h: 12, d: 4 } },        // right leg
            { offset: [0.12, 0.15, 0], size: [0.15, 0.7, 0.15], color: 0xC8C8B0,
              uv: { u: 0, v: 16, w: 4, h: 12, d: 4 } },        // left leg (mirrored)
        ]
    },
    pig: {
        name: 'Pig',
        hostile: false,
        health: 10,
        speed: 2.0,
        damage: 0,
        attackRange: 0,
        detectRange: 0,
        width: 0.8,
        height: 0.9,
        texture: `${TEX_BASE}/pig/pig.png`,
        textureSize: [64, 32],
        boxes: [
            { offset: [0, 0.45, 0], size: [0.6, 0.5, 0.8], color: 0xF0A0A0,
              uv: { u: 28, v: 8, w: 10, h: 8, d: 8 } },        // body
            { offset: [0, 0.55, 0.5], size: [0.45, 0.4, 0.4], color: 0xF0A0A0,
              uv: { u: 0, v: 0, w: 8, h: 8, d: 8 } },          // head
            { offset: [0, 0.6, 0.7], size: [0.2, 0.15, 0.1], color: 0xE08080,
              uv: { u: 16, v: 17, w: 4, h: 3, d: 1 } },        // snout
            { offset: [-0.2, 0.1, -0.2], size: [0.15, 0.3, 0.15], color: 0xF0A0A0,
              uv: { u: 0, v: 16, w: 4, h: 6, d: 4 } },         // leg FL
            { offset: [0.2, 0.1, -0.2], size: [0.15, 0.3, 0.15], color: 0xF0A0A0,
              uv: { u: 0, v: 16, w: 4, h: 6, d: 4 } },         // leg FR
            { offset: [-0.2, 0.1, 0.2], size: [0.15, 0.3, 0.15], color: 0xF0A0A0,
              uv: { u: 0, v: 16, w: 4, h: 6, d: 4 } },         // leg BL
            { offset: [0.2, 0.1, 0.2], size: [0.15, 0.3, 0.15], color: 0xF0A0A0,
              uv: { u: 0, v: 16, w: 4, h: 6, d: 4 } },         // leg BR
        ]
    },
    cow: {
        name: 'Cow',
        hostile: false,
        health: 10,
        speed: 1.8,
        damage: 0,
        attackRange: 0,
        detectRange: 0,
        width: 0.9,
        height: 1.3,
        texture: `${TEX_BASE}/cow/cow.png`,
        textureSize: [64, 32],
        boxes: [
            { offset: [0, 0.65, 0], size: [0.7, 0.6, 1.0], color: 0x6B3A1F,
              uv: { u: 18, v: 4, w: 12, h: 10, d: 10 } },      // body
            { offset: [0, 0.9, 0.6], size: [0.5, 0.45, 0.45], color: 0x6B3A1F,
              uv: { u: 0, v: 0, w: 8, h: 8, d: 6 } },          // head
            { offset: [-0.25, 0.15, -0.3], size: [0.2, 0.5, 0.2], color: 0x6B3A1F,
              uv: { u: 0, v: 16, w: 4, h: 12, d: 4 } },        // leg FL
            { offset: [0.25, 0.15, -0.3], size: [0.2, 0.5, 0.2], color: 0x6B3A1F,
              uv: { u: 0, v: 16, w: 4, h: 12, d: 4 } },        // leg FR
            { offset: [-0.25, 0.15, 0.3], size: [0.2, 0.5, 0.2], color: 0x6B3A1F,
              uv: { u: 0, v: 16, w: 4, h: 12, d: 4 } },        // leg BL
            { offset: [0.25, 0.15, 0.3], size: [0.2, 0.5, 0.2], color: 0x6B3A1F,
              uv: { u: 0, v: 16, w: 4, h: 12, d: 4 } },        // leg BR
        ]
    },
    ryan_smith: {
        name: 'Ryan Smith',
        hostile: false,
        health: 20,
        speed: 1.5,
        damage: 0,
        attackRange: 0,
        detectRange: 0,
        width: 0.6,
        height: 1.8,
        texture: 'https://static.tvtropes.org/pmwiki/pub/images/AverageMan1.jpg',
        fullTexture: true,
        dimension: 'outer_end',
        spawnWeight: 1,
        drops: [32],
        boxes: [
            { offset: [0, 0.9, 0], size: [0.5, 0.7, 0.3], color: 0xD2B48C },    // body
            { offset: [0, 1.55, 0], size: [0.4, 0.4, 0.4], color: 0xFFDBAC },    // head
            { offset: [-0.35, 0.9, 0], size: [0.2, 0.6, 0.2], color: 0xD2B48C }, // left arm
            { offset: [0.35, 0.9, 0], size: [0.2, 0.6, 0.2], color: 0xD2B48C },  // right arm
            { offset: [-0.15, 0.15, 0], size: [0.2, 0.7, 0.2], color: 0x3B5998 }, // left leg
            { offset: [0.15, 0.15, 0], size: [0.2, 0.7, 0.2], color: 0x3B5998 },  // right leg
        ]
    }
};
