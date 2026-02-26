export class MultiplayerUI {
    constructor() {
        this.overlay = document.getElementById('overlay');
        this.overlayContent = document.getElementById('overlay-content');

        this._onSinglePlayer = null;
        this._onHost = null;
        this._onJoin = null;

        this._buildMenu();
    }

    _buildMenu() {
        this.overlayContent.innerHTML = '';

        const title = document.createElement('h1');
        title.textContent = 'AdiCraft';
        this.overlayContent.appendChild(title);

        // Singleplayer button
        const spBtn = document.createElement('button');
        spBtn.id = 'btn-singleplayer';
        spBtn.className = 'mp-btn';
        spBtn.textContent = 'Single Player';
        spBtn.addEventListener('click', () => {
            if (this._onSinglePlayer) this._onSinglePlayer();
        });
        this.overlayContent.appendChild(spBtn);

        // Host button
        const hostBtn = document.createElement('button');
        hostBtn.id = 'btn-host';
        hostBtn.className = 'mp-btn';
        hostBtn.textContent = 'Host Game';
        hostBtn.addEventListener('click', () => this._showNameInput('host'));
        this.overlayContent.appendChild(hostBtn);

        // Join button
        const joinBtn = document.createElement('button');
        joinBtn.id = 'btn-join';
        joinBtn.className = 'mp-btn';
        joinBtn.textContent = 'Join Game';
        joinBtn.addEventListener('click', () => this._showJoinDialog());
        this.overlayContent.appendChild(joinBtn);
    }

    _showNameInput(mode) {
        this.overlayContent.innerHTML = '';

        const title = document.createElement('h2');
        title.textContent = mode === 'host' ? 'Host Game' : 'Join Game';
        this.overlayContent.appendChild(title);

        const nameInput = document.createElement('input');
        nameInput.id = 'name-input';
        nameInput.className = 'mp-input';
        nameInput.placeholder = 'Your name';
        nameInput.maxLength = 16;
        this.overlayContent.appendChild(nameInput);

        const btn = document.createElement('button');
        btn.className = 'mp-btn';
        btn.textContent = 'Start Hosting';
        btn.addEventListener('click', () => {
            const name = nameInput.value.trim() || 'Host';
            if (this._onHost) this._onHost(name);
        });
        this.overlayContent.appendChild(btn);

        const backBtn = document.createElement('button');
        backBtn.className = 'mp-btn mp-btn-secondary';
        backBtn.textContent = 'Back';
        backBtn.addEventListener('click', () => this._buildMenu());
        this.overlayContent.appendChild(backBtn);

        nameInput.focus();
    }

    _showJoinDialog() {
        this.overlayContent.innerHTML = '';

        const title = document.createElement('h2');
        title.textContent = 'Join Game';
        this.overlayContent.appendChild(title);

        const nameInput = document.createElement('input');
        nameInput.id = 'join-name-input';
        nameInput.className = 'mp-input';
        nameInput.placeholder = 'Your name';
        nameInput.maxLength = 16;
        this.overlayContent.appendChild(nameInput);

        const codeInput = document.createElement('input');
        codeInput.id = 'room-code-input';
        codeInput.className = 'mp-input';
        codeInput.placeholder = 'Room code';
        this.overlayContent.appendChild(codeInput);

        const btn = document.createElement('button');
        btn.className = 'mp-btn';
        btn.textContent = 'Connect';
        btn.addEventListener('click', () => {
            const name = nameInput.value.trim() || 'Player';
            const code = codeInput.value.trim();
            if (!code) return;
            if (this._onJoin) this._onJoin(code, name);
        });
        this.overlayContent.appendChild(btn);

        const backBtn = document.createElement('button');
        backBtn.className = 'mp-btn mp-btn-secondary';
        backBtn.textContent = 'Back';
        backBtn.addEventListener('click', () => this._buildMenu());
        this.overlayContent.appendChild(backBtn);

        nameInput.focus();
    }

    showHostInfo(roomCode) {
        // Create persistent host info display
        let info = document.getElementById('host-info');
        if (!info) {
            info = document.createElement('div');
            info.id = 'host-info';
            document.body.appendChild(info);
        }
        info.innerHTML = `<span class="host-info-label">Room:</span> <span class="host-info-code">${roomCode}</span> <span id="player-count">1 player</span>`;
        info.classList.add('visible-block');
    }

    showConnecting() {
        this.overlayContent.innerHTML = '<h2>Connecting...</h2>';
    }

    showError(message) {
        this.overlayContent.innerHTML = `<h2>Error</h2><p>${message}</p>`;
        const backBtn = document.createElement('button');
        backBtn.className = 'mp-btn';
        backBtn.textContent = 'Back';
        backBtn.addEventListener('click', () => this._buildMenu());
        this.overlayContent.appendChild(backBtn);
    }

    updatePlayerCount(count) {
        const el = document.getElementById('player-count');
        if (el) el.textContent = `${count} player${count !== 1 ? 's' : ''}`;
    }

    onSinglePlayer(callback) { this._onSinglePlayer = callback; }
    onHost(callback) { this._onHost = callback; }
    onJoin(callback) { this._onJoin = callback; }
}
