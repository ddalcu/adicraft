// Portal frame placement helper
// Places a 5x5 frame of end_portal_frame(28) with 3x3 interior of end_portal(29)

export function placeEndPortal(world, cx, y, cz) {
    // 5x5 frame
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const isEdge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
            const isCorner = Math.abs(dx) === 2 && Math.abs(dz) === 2;

            if (isCorner) continue; // skip corners

            if (isEdge) {
                world.setBlock(cx + dx, y, cz + dz, 28); // end_portal_frame
            } else {
                world.setBlock(cx + dx, y, cz + dz, 29); // end_portal
            }
        }
    }
}
