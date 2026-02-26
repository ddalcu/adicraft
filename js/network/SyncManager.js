import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { CHUNK_SIZE } from '../utils/constants.js';

const WS_SERVER_URL = 'wss://adiserver.deploy.dalcu.com';

const DIMENSION_KEYS = {
    overworld: 'blocks_overworld',
    end: 'blocks_end',
    outer_end: 'blocks_outer_end',
};

export class SyncManager {
    constructor(roomId) {
        this.roomId = roomId;
        this.doc = new Y.Doc();

        // Block YMaps — one per dimension
        this.blockMaps = {};
        for (const [dim, key] of Object.entries(DIMENSION_KEYS)) {
            this.blockMaps[dim] = this.doc.getMap(key);
        }

        // Player state YMap
        this.playersMap = this.doc.getMap('players');

        // Chat, ops, admin shared types
        this.chatArray = this.doc.getArray('chat');
        this.opsMap = this.doc.getMap('ops');
        this.adminHashMap = this.doc.getMap('admin_hash');

        // Mob events for cross-client damage
        this.mobEventsArray = this.doc.getArray('mob_events');
        this.onMobEvent = null; // (event) => void
        this._pendingMobEvents = [];

        // Local chunk index: dimension -> "cx,cz" -> Map<"x,y,z", blockId>
        this.chunkIndex = {};
        for (const dim of Object.keys(DIMENSION_KEYS)) {
            this.chunkIndex[dim] = new Map();
        }

        // Persistent player ID
        this.playerId = this._getOrCreatePlayerId();

        // Providers (initialized on connect)
        this.websocketProvider = null;
        this.indexeddbProvider = null;

        // Callbacks
        this.onRemoteBlockChange = null; // (dim, x, y, z, blockId) => void
        this.onPeerChange = null;        // (states) => void
        this.onChatMessage = null;       // (msg) => void

        // Build chunk index from existing YMap data and observe future changes
        for (const [dim, ymap] of Object.entries(this.blockMaps)) {
            this._observeBlockMap(dim, ymap);
        }
    }

    connect() {
        this.indexeddbProvider = new IndexeddbPersistence(this.roomId, this.doc);

        // Rebuild chunk index once IndexedDB has synced
        this.indexeddbProvider.once('synced', () => {
            this._rebuildAllIndexes();
        });

        // Observe chat for incoming messages
        this._observeChat();

        // Observe mob events
        this._observeMobEvents();

        // WebSocket provider for sync + persistence + awareness
        this.websocketProvider = new WebsocketProvider(WS_SERVER_URL, this.roomId, this.doc);

        // Awareness for real-time ephemeral state (player positions)
        this.websocketProvider.awareness.on('change', () => {
            if (this.onPeerChange) {
                this.onPeerChange(this._getPeerStates());
            }
        });
    }

    // --- Block API ---

    setBlock(dimension, x, y, z, blockId) {
        const ymap = this.blockMaps[dimension];
        if (!ymap) return;

        const coordKey = `${x},${y},${z}`;

        ymap.set(coordKey, blockId);
        // Local index is updated via the observer
    }

    getChunkMods(dimension, cx, cz) {
        const dimIndex = this.chunkIndex[dimension];
        if (!dimIndex) return null;

        const chunkKey = `${cx},${cz}`;
        return dimIndex.get(chunkKey) || null;
    }

    // --- Player state API ---

    savePlayerState(data) {
        this.playersMap.set(this.playerId, data);
    }

    loadPlayerState() {
        return this.playersMap.get(this.playerId) || null;
    }

    // --- Awareness (ephemeral real-time positions) ---

    updatePosition(name, x, y, z, yaw, pitch, extra) {
        if (!this.websocketProvider) return;
        const state = { name, x, y, z, yaw, pitch, id: this.playerId };
        if (extra) {
            if (extra.weaponMode !== undefined) state.weaponMode = extra.weaponMode;
            if (extra.shooting !== undefined) state.shooting = extra.shooting;
            if (extra.mobs !== undefined) state.mobs = extra.mobs;
        }
        this.websocketProvider.awareness.setLocalState(state);
    }

    _getPeerStates() {
        if (!this.websocketProvider) return [];
        const states = [];
        this.websocketProvider.awareness.getStates().forEach((state, clientId) => {
            // Skip our own state
            if (clientId === this.doc.clientID) return;
            if (state && state.id) {
                states.push(state);
            }
        });
        return states;
    }

    // --- Chat API ---

    sendChat(sender, senderId, text, system = false) {
        const msg = {
            id: crypto.randomUUID(),
            sender,
            senderId,
            text,
            timestamp: Date.now(),
            system,
        };
        this.chatArray.push([msg]);
        this._trimChat();
    }

    getChatHistory(count = 20) {
        const len = this.chatArray.length;
        const start = Math.max(0, len - count);
        const msgs = [];
        for (let i = start; i < len; i++) {
            msgs.push(this.chatArray.get(i));
        }
        return msgs;
    }

    _trimChat() {
        const max = 100;
        if (this.chatArray.length > max) {
            this.doc.transact(() => {
                this.chatArray.delete(0, this.chatArray.length - max);
            });
        }
    }

    _observeChat() {
        this.chatArray.observe((event) => {
            if (!this.onChatMessage) return;
            // Only fire for inserts (new messages)
            for (const item of event.changes.added) {
                let content = item.content.getContent();
                for (const msg of content) {
                    this.onChatMessage(msg);
                }
            }
        });
    }

    // --- Mob Event API ---

    sendMobEvent(mobId, type, data) {
        this.mobEventsArray.push([{
            mobId, type, data,
            sender: this.doc.clientID,
            timestamp: Date.now(),
        }]);
        // Keep array from growing unbounded
        if (this.mobEventsArray.length > 50) {
            this.doc.transact(() => {
                this.mobEventsArray.delete(0, this.mobEventsArray.length - 20);
            });
        }
    }

    consumeMobEvents() {
        const events = this._pendingMobEvents.slice();
        this._pendingMobEvents = [];
        return events;
    }

    _observeMobEvents() {
        this.mobEventsArray.observe((event) => {
            for (const item of event.changes.added) {
                for (const evt of item.content.getContent()) {
                    // Don't process our own events
                    if (evt.sender === this.doc.clientID) continue;
                    this._pendingMobEvents.push(evt);
                }
            }
        });
    }

    // --- Authority ---

    isAuthority() {
        if (!this.websocketProvider) return true;
        const states = this.websocketProvider.awareness.getStates();
        let lowestClientId = this.doc.clientID;
        states.forEach((state, clientId) => {
            if (state && state.id && clientId < lowestClientId) {
                lowestClientId = clientId;
            }
        });
        return lowestClientId === this.doc.clientID;
    }

    getAuthorityMobs() {
        if (!this.websocketProvider) return null;
        const states = this.websocketProvider.awareness.getStates();
        let lowestClientId = Infinity;
        let authorityState = null;
        states.forEach((state, clientId) => {
            if (state && state.id && clientId < lowestClientId) {
                lowestClientId = clientId;
                authorityState = state;
            }
        });
        // If we're the authority, return null (we manage mobs locally)
        if (lowestClientId === this.doc.clientID) return null;
        return authorityState?.mobs || null;
    }

    // --- Admin API ---

    async _sha256(text) {
        const data = new TextEncoder().encode(text);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async setAdminHash(secret) {
        const hash = await this._sha256(secret);
        this.adminHashMap.set('hash', hash);
        return hash;
    }

    getAdminHash() {
        return this.adminHashMap.get('hash') || null;
    }

    async verifyAdmin(secret) {
        const stored = this.getAdminHash();
        if (!stored) return false;
        const hash = await this._sha256(secret);
        return hash === stored;
    }

    // --- Ops API ---

    setOp(playerId, playerName) {
        this.opsMap.set(playerId, playerName);
    }

    removeOp(playerId) {
        this.opsMap.delete(playerId);
    }

    isOp(playerId) {
        return this.opsMap.has(playerId);
    }

    getOpsList() {
        const ops = [];
        this.opsMap.forEach((name, id) => {
            ops.push({ id, name });
        });
        return ops;
    }

    // --- Chunk index management ---

    _observeBlockMap(dimension, ymap) {
        ymap.observe((event) => {
            event.changes.keys.forEach((change, coordKey) => {
                const [x, y, z] = coordKey.split(',').map(Number);
                const cx = Math.floor(x / CHUNK_SIZE);
                const cz = Math.floor(z / CHUNK_SIZE);
                const chunkKey = `${cx},${cz}`;
                const dimIndex = this.chunkIndex[dimension];

                if (change.action === 'delete') {
                    const chunkMods = dimIndex.get(chunkKey);
                    if (chunkMods) {
                        chunkMods.delete(coordKey);
                        if (chunkMods.size === 0) dimIndex.delete(chunkKey);
                    }
                    if (this.onRemoteBlockChange && event.transaction.origin !== null) {
                        this.onRemoteBlockChange(dimension, x, y, z, 0);
                    }
                } else {
                    // 'add' or 'update'
                    if (!dimIndex.has(chunkKey)) {
                        dimIndex.set(chunkKey, new Map());
                    }
                    dimIndex.get(chunkKey).set(coordKey, ymap.get(coordKey));

                    if (this.onRemoteBlockChange && event.transaction.origin !== null) {
                        this.onRemoteBlockChange(dimension, x, y, z, ymap.get(coordKey));
                    }
                }
            });
        });
    }

    _rebuildAllIndexes() {
        for (const [dim, ymap] of Object.entries(this.blockMaps)) {
            const dimIndex = this.chunkIndex[dim];
            dimIndex.clear();

            ymap.forEach((blockId, coordKey) => {
                const [x, , z] = coordKey.split(',').map(Number);
                const cx = Math.floor(x / CHUNK_SIZE);
                const cz = Math.floor(z / CHUNK_SIZE);
                const chunkKey = `${cx},${cz}`;

                if (!dimIndex.has(chunkKey)) {
                    dimIndex.set(chunkKey, new Map());
                }
                dimIndex.get(chunkKey).set(coordKey, blockId);
            });
        }
    }

    // --- Player ID ---

    _getOrCreatePlayerId() {
        let id = localStorage.getItem('adicraft-player-id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('adicraft-player-id', id);
        }
        return id;
    }

    // --- Cleanup ---

    destroy() {
        if (this.websocketProvider) {
            this.websocketProvider.destroy();
            this.websocketProvider = null;
        }
        if (this.indexeddbProvider) {
            this.indexeddbProvider.destroy();
            this.indexeddbProvider = null;
        }
        this.doc.destroy();
    }
}
