// Crafting recipe definitions and matching logic.
// Shaped recipes: { pattern, key, result }
// Shapeless recipes: { shapeless: true, ingredients, result }

export const RECIPES = [
    // --- Planks from logs (shapeless, all wood types) ---
    { shapeless: true, ingredients: [4], result: { id: 33, count: 4 } },   // oak log
    { shapeless: true, ingredients: [15], result: { id: 33, count: 4 } },  // spruce log
    { shapeless: true, ingredients: [17], result: { id: 33, count: 4 } },  // birch log
    { shapeless: true, ingredients: [19], result: { id: 33, count: 4 } },  // jungle log

    // --- Sticks from planks ---
    { pattern: ['P', 'P'], key: { P: 33 }, result: { id: 300, count: 4 } },

    // --- Crafting table ---
    { pattern: ['PP', 'PP'], key: { P: 33 }, result: { id: 34, count: 1 } },

    // --- Pickaxes ---
    { pattern: ['PPP', ' S ', ' S '], key: { P: 33, S: 300 }, result: { id: 256, count: 1 } },
    { pattern: ['PPP', ' S ', ' S '], key: { P: 3, S: 300 }, result: { id: 257, count: 1 } },
    { pattern: ['PPP', ' S ', ' S '], key: { P: 302, S: 300 }, result: { id: 258, count: 1 } },
    { pattern: ['PPP', ' S ', ' S '], key: { P: 304, S: 300 }, result: { id: 259, count: 1 } },

    // --- Axes ---
    { pattern: ['PP', 'PS', ' S'], key: { P: 33, S: 300 }, result: { id: 260, count: 1 } },
    { pattern: ['PP', 'PS', ' S'], key: { P: 3, S: 300 }, result: { id: 261, count: 1 } },
    { pattern: ['PP', 'PS', ' S'], key: { P: 302, S: 300 }, result: { id: 262, count: 1 } },
    { pattern: ['PP', 'PS', ' S'], key: { P: 304, S: 300 }, result: { id: 263, count: 1 } },

    // --- Shovels ---
    { pattern: ['P', 'S', 'S'], key: { P: 33, S: 300 }, result: { id: 264, count: 1 } },
    { pattern: ['P', 'S', 'S'], key: { P: 3, S: 300 }, result: { id: 265, count: 1 } },
    { pattern: ['P', 'S', 'S'], key: { P: 302, S: 300 }, result: { id: 266, count: 1 } },
    { pattern: ['P', 'S', 'S'], key: { P: 304, S: 300 }, result: { id: 267, count: 1 } },

    // --- Swords ---
    { pattern: ['P', 'P', 'S'], key: { P: 33, S: 300 }, result: { id: 268, count: 1 } },
    { pattern: ['P', 'P', 'S'], key: { P: 3, S: 300 }, result: { id: 269, count: 1 } },
    { pattern: ['P', 'P', 'S'], key: { P: 302, S: 300 }, result: { id: 270, count: 1 } },
    { pattern: ['P', 'P', 'S'], key: { P: 304, S: 300 }, result: { id: 271, count: 1 } },

    // --- Hoes ---
    { pattern: ['PP', ' S', ' S'], key: { P: 33, S: 300 }, result: { id: 272, count: 1 } },
    { pattern: ['PP', ' S', ' S'], key: { P: 3, S: 300 }, result: { id: 273, count: 1 } },
    { pattern: ['PP', ' S', ' S'], key: { P: 302, S: 300 }, result: { id: 274, count: 1 } },
    { pattern: ['PP', ' S', ' S'], key: { P: 304, S: 300 }, result: { id: 275, count: 1 } },
];

// Match a crafting grid against all recipes.
// grid: 2D array of itemIds (0 = empty), gridWidth x gridHeight
// Returns { id, count } or null.
export function findRecipe(grid, gridWidth, gridHeight) {
    for (const recipe of RECIPES) {
        if (recipe.shapeless) {
            if (_matchShapeless(grid, gridWidth, gridHeight, recipe)) {
                return { ...recipe.result };
            }
        } else {
            if (_matchShaped(grid, gridWidth, gridHeight, recipe)) {
                return { ...recipe.result };
            }
        }
    }
    return null;
}

function _matchShapeless(grid, gw, gh, recipe) {
    // Collect all non-empty items in grid
    const items = [];
    for (let r = 0; r < gh; r++) {
        for (let c = 0; c < gw; c++) {
            const id = grid[r * gw + c];
            if (id !== 0) items.push(id);
        }
    }

    if (items.length !== recipe.ingredients.length) return false;

    // Check each ingredient is present
    const remaining = [...items];
    for (const needed of recipe.ingredients) {
        const idx = remaining.indexOf(needed);
        if (idx === -1) return false;
        remaining.splice(idx, 1);
    }
    return remaining.length === 0;
}

function _matchShaped(grid, gw, gh, recipe) {
    const pattern = recipe.pattern;
    const pw = Math.max(...pattern.map(r => r.length));
    const ph = pattern.length;

    // Try all offsets within the grid
    for (let offR = 0; offR <= gh - ph; offR++) {
        for (let offC = 0; offC <= gw - pw; offC++) {
            if (_tryOffset(grid, gw, gh, recipe, offR, offC, pw, ph)) {
                return true;
            }
        }
    }
    return false;
}

function _tryOffset(grid, gw, gh, recipe, offR, offC, pw, ph) {
    const { pattern, key } = recipe;

    // Check pattern cells match
    for (let r = 0; r < ph; r++) {
        for (let c = 0; c < pw; c++) {
            const patternChar = c < pattern[r].length ? pattern[r][c] : ' ';
            const gridId = grid[(offR + r) * gw + (offC + c)];

            if (patternChar === ' ') {
                if (gridId !== 0) return false;
            } else {
                const expectedId = key[patternChar];
                if (gridId !== expectedId) return false;
            }
        }
    }

    // Check all cells outside the pattern are empty
    for (let r = 0; r < gh; r++) {
        for (let c = 0; c < gw; c++) {
            const inPattern = r >= offR && r < offR + ph && c >= offC && c < offC + pw;
            if (!inPattern && grid[r * gw + c] !== 0) return false;
        }
    }

    return true;
}
