// Message type constants
export const MSG = {
    POS: 'pos',
    BLOCK: 'block',
    BLOCK_REQ: 'blockReq',
    JOIN: 'join',
    LEAVE: 'leave',
    STATE: 'state',
};

export function encodePos(id, x, y, z, yaw, pitch) {
    return { type: MSG.POS, id, x, y, z, yaw, pitch };
}

export function encodeBlockReq(x, y, z, blockId) {
    return { type: MSG.BLOCK_REQ, x, y, z, blockId };
}

export function encodeBlock(x, y, z, blockId) {
    return { type: MSG.BLOCK, x, y, z, blockId };
}

export function encodeJoin(id, name, x, y, z) {
    return { type: MSG.JOIN, id, name, x, y, z };
}

export function encodeLeave(id) {
    return { type: MSG.LEAVE, id };
}

export function encodeState(seed, players, blockChanges) {
    return { type: MSG.STATE, seed, players, blockChanges };
}
