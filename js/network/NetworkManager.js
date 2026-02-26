export class NetworkManager {
    constructor() {
        this.peer = null;
        this.connections = new Map(); // peerId -> DataConnection (host only)
        this.hostConnection = null;   // DataConnection to host (client only)
        this.isHost = false;
        this.playerId = null;
        this.playerName = '';

        // Callbacks
        this.onMessage = null;    // (data, fromId) => void
        this.onPeerJoin = null;   // (peerId) => void
        this.onPeerLeave = null;  // (peerId) => void
    }

    // Try to claim the fixed room ID as host; if taken, join as client
    async autoJoin(roomId, name) {
        this.playerName = name;

        // Try hosting first
        try {
            await this._tryHost(roomId);
            return 'host';
        } catch (err) {
            // ID taken — someone is already hosting. Clean up and join them.
            if (this.peer) { this.peer.destroy(); this.peer = null; }
        }

        await this._joinExisting(roomId);
        return 'client';
    }

    async hostGame(name) {
        this.isHost = true;
        this.playerName = name;
        const roomId = 'adicraft-' + Math.random().toString(36).substring(2, 8);
        await this._tryHost(roomId);
        return this.playerId;
    }

    async joinGame(roomCode, name) {
        this.isHost = false;
        this.playerName = name;
        await this._joinExisting(roomCode);
        return this.playerId;
    }

    _tryHost(roomId) {
        this.isHost = true;
        return new Promise((resolve, reject) => {
            this.peer = new Peer(roomId);

            this.peer.on('open', (id) => {
                this.playerId = id;
                this._listenForConnections();
                resolve(id);
            });

            this.peer.on('error', (err) => {
                reject(err);
            });
        });
    }

    _joinExisting(roomCode) {
        this.isHost = false;
        return new Promise((resolve, reject) => {
            this.peer = new Peer();

            this.peer.on('open', (id) => {
                this.playerId = id;
                this.hostConnection = this.peer.connect(roomCode, { reliable: true });

                this.hostConnection.on('open', () => {
                    this._setupConnection(this.hostConnection, roomCode);
                    this.hostConnection.send({ type: '_hello', name: this.playerName });
                    resolve(id);
                });

                this.hostConnection.on('error', (err) => {
                    reject(err);
                });
            });

            this.peer.on('error', (err) => {
                reject(err);
            });
        });
    }

    isConnected() {
        if (this.isHost) return this.peer !== null;
        return this.hostConnection !== null && this.hostConnection.open;
    }

    // Send to host (client) or broadcast to all (host)
    send(data) {
        if (this.isHost) {
            for (const conn of this.connections.values()) {
                if (conn.open) conn.send(data);
            }
        } else {
            if (this.hostConnection && this.hostConnection.open) {
                this.hostConnection.send(data);
            }
        }
    }

    // Send to specific peer (host only)
    sendTo(peerId, data) {
        const conn = this.connections.get(peerId);
        if (conn && conn.open) conn.send(data);
    }

    // Send to all except one peer (host only)
    sendToAllExcept(excludeId, data) {
        for (const [id, conn] of this.connections) {
            if (id !== excludeId && conn.open) conn.send(data);
        }
    }

    getConnectedCount() {
        let count = 0;
        for (const conn of this.connections.values()) {
            if (conn.open) count++;
        }
        return count;
    }

    destroy() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.connections.clear();
        this.hostConnection = null;
    }

    _listenForConnections() {
        this.peer.on('connection', (conn) => {
            conn.on('open', () => {
                this._setupConnection(conn, conn.peer);
            });
        });
    }

    _setupConnection(conn, peerId) {
        if (this.isHost) {
            this.connections.set(peerId, conn);
        }

        conn.on('data', (data) => {
            if (this.onMessage) this.onMessage(data, peerId);
        });

        conn.on('close', () => {
            if (this.isHost) {
                this.connections.delete(peerId);
                if (this.onPeerLeave) this.onPeerLeave(peerId);
            }
        });

        conn.on('error', (err) => {
            console.error(`Connection error with ${peerId}:`, err);
        });

        // Notify join only for host (after _hello message is received via onMessage)
        if (this.isHost && this.onPeerJoin) {
            this.onPeerJoin(peerId);
        }
    }
}
