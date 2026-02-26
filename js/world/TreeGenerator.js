// Tree templates for each type.
// Each returns an array of {dx, dy, dz, blockId} offsets from base position.

const TREE_TEMPLATES = {
    oak(rng) {
        const blocks = [];
        const height = 4 + Math.floor(rng() * 2); // 4-5
        // Trunk
        for (let y = 0; y < height; y++) {
            blocks.push({ dx: 0, dy: y, dz: 0, blockId: 4 }); // oak log
        }
        // Leaves canopy (top 3 layers)
        for (let dy = height - 3; dy <= height; dy++) {
            const radius = dy === height ? 1 : 2;
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    if (dx === 0 && dz === 0 && dy < height) continue; // trunk
                    if (Math.abs(dx) === radius && Math.abs(dz) === radius && dy === height) continue;
                    blocks.push({ dx, dy, dz, blockId: 5 }); // oak leaves
                }
            }
        }
        return blocks;
    },

    birch(rng) {
        const blocks = [];
        const height = 5 + Math.floor(rng() * 2); // 5-6
        for (let y = 0; y < height; y++) {
            blocks.push({ dx: 0, dy: y, dz: 0, blockId: 17 }); // birch log
        }
        for (let dy = height - 3; dy <= height; dy++) {
            const radius = dy === height ? 1 : 2;
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    if (dx === 0 && dz === 0 && dy < height) continue;
                    if (Math.abs(dx) === radius && Math.abs(dz) === radius && dy === height) continue;
                    blocks.push({ dx, dy, dz, blockId: 18 }); // birch leaves
                }
            }
        }
        return blocks;
    },

    spruce(rng) {
        const blocks = [];
        const height = 6 + Math.floor(rng() * 3); // 6-8
        for (let y = 0; y < height; y++) {
            blocks.push({ dx: 0, dy: y, dz: 0, blockId: 15 }); // spruce log
        }
        // Cone-shaped leaves
        for (let dy = 2; dy <= height; dy++) {
            const radius = Math.max(0, Math.floor((height - dy) / 2) + 1);
            if (radius === 0) {
                blocks.push({ dx: 0, dy, dz: 0, blockId: 16 });
                continue;
            }
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    if (dx === 0 && dz === 0) continue; // trunk
                    if (Math.abs(dx) + Math.abs(dz) > radius + 1) continue;
                    blocks.push({ dx, dy, dz, blockId: 16 }); // spruce leaves
                }
            }
        }
        // Top leaf
        blocks.push({ dx: 0, dy: height, dz: 0, blockId: 16 });
        return blocks;
    },

    jungle(rng) {
        const blocks = [];
        const height = 8 + Math.floor(rng() * 4); // 8-11
        for (let y = 0; y < height; y++) {
            blocks.push({ dx: 0, dy: y, dz: 0, blockId: 19 }); // jungle log
        }
        // Big canopy
        for (let dy = height - 3; dy <= height + 1; dy++) {
            const radius = dy > height ? 1 : 3;
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    if (dx === 0 && dz === 0 && dy < height) continue;
                    if (dx * dx + dz * dz > radius * radius + 1) continue;
                    blocks.push({ dx, dy, dz, blockId: 20 }); // jungle leaves
                }
            }
        }
        return blocks;
    },

    cactus(rng) {
        const blocks = [];
        const height = 2 + Math.floor(rng() * 2); // 2-3
        for (let y = 0; y < height; y++) {
            blocks.push({ dx: 0, dy: y, dz: 0, blockId: 21 }); // cactus
        }
        return blocks;
    }
};

export function getTreeBlocks(treeType, rng) {
    const template = TREE_TEMPLATES[treeType];
    if (!template) return [];
    return template(rng);
}
