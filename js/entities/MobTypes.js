// Data-driven mob definitions
// Each mob type defines stats, behavior, and box geometry for rendering.

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
        // Box parts: {offset [x,y,z], size [w,h,d], color}
        boxes: [
            { offset: [0, 0.9, 0], size: [0.5, 0.7, 0.3], color: 0x4A7A2E },   // body
            { offset: [0, 1.55, 0], size: [0.4, 0.4, 0.4], color: 0x4A7A2E },   // head
            { offset: [-0.35, 0.9, 0], size: [0.2, 0.6, 0.2], color: 0x4A7A2E }, // left arm
            { offset: [0.35, 0.9, 0], size: [0.2, 0.6, 0.2], color: 0x4A7A2E },  // right arm
            { offset: [-0.15, 0.15, 0], size: [0.2, 0.7, 0.2], color: 0x2B4A8C }, // left leg
            { offset: [0.15, 0.15, 0], size: [0.2, 0.7, 0.2], color: 0x2B4A8C },  // right leg
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
        boxes: [
            { offset: [0, 0.9, 0], size: [0.4, 0.7, 0.25], color: 0xC8C8B0 },   // body
            { offset: [0, 1.55, 0], size: [0.4, 0.4, 0.4], color: 0xC8C8B0 },    // head
            { offset: [-0.3, 0.9, 0], size: [0.15, 0.6, 0.15], color: 0xC8C8B0 }, // left arm
            { offset: [0.3, 0.9, 0], size: [0.15, 0.6, 0.15], color: 0xC8C8B0 },  // right arm
            { offset: [-0.12, 0.15, 0], size: [0.15, 0.7, 0.15], color: 0xC8C8B0 },// left leg
            { offset: [0.12, 0.15, 0], size: [0.15, 0.7, 0.15], color: 0xC8C8B0 }, // right leg
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
        boxes: [
            { offset: [0, 0.45, 0], size: [0.6, 0.5, 0.8], color: 0xF0A0A0 },    // body
            { offset: [0, 0.55, 0.5], size: [0.45, 0.4, 0.4], color: 0xF0A0A0 },  // head
            { offset: [0, 0.6, 0.7], size: [0.2, 0.15, 0.1], color: 0xE08080 },   // snout
            { offset: [-0.2, 0.1, -0.2], size: [0.15, 0.3, 0.15], color: 0xF0A0A0 }, // leg FL
            { offset: [0.2, 0.1, -0.2], size: [0.15, 0.3, 0.15], color: 0xF0A0A0 },  // leg FR
            { offset: [-0.2, 0.1, 0.2], size: [0.15, 0.3, 0.15], color: 0xF0A0A0 },  // leg BL
            { offset: [0.2, 0.1, 0.2], size: [0.15, 0.3, 0.15], color: 0xF0A0A0 },   // leg BR
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
        boxes: [
            { offset: [0, 0.65, 0], size: [0.7, 0.6, 1.0], color: 0x6B3A1F },    // body
            { offset: [0, 0.9, 0.6], size: [0.5, 0.45, 0.45], color: 0x6B3A1F },  // head
            { offset: [-0.25, 0.15, -0.3], size: [0.2, 0.5, 0.2], color: 0x6B3A1F }, // leg FL
            { offset: [0.25, 0.15, -0.3], size: [0.2, 0.5, 0.2], color: 0x6B3A1F },  // leg FR
            { offset: [-0.25, 0.15, 0.3], size: [0.2, 0.5, 0.2], color: 0x6B3A1F },  // leg BL
            { offset: [0.25, 0.15, 0.3], size: [0.2, 0.5, 0.2], color: 0x6B3A1F },   // leg BR
        ]
    }
};
