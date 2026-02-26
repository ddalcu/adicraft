const API_BASE = 'https://adiserver.deploy.dalcu.com';
const BUILD_ID = document.documentElement.dataset.build || 'dev';

function timeAgo(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

function sanitizeBranchName(name) {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export class MultiplayerUI {
    constructor() {
        this.overlay = document.getElementById('overlay');
        this.overlayContent = document.getElementById('overlay-content');
        this._onJoin = null;
        this._currentBranch = localStorage.getItem('adicraft-room') || 'adicraft-main';
    }

    // Screen 1: Main Menu
    show() {
        this.overlayContent.innerHTML = '';
        this.overlay.classList.remove('hidden');
        // Prevent pointer lock when interacting with the menu
        this.overlay.style.cursor = 'default';

        const title = document.createElement('h1');
        title.textContent = 'AdiCraft';
        this.overlayContent.appendChild(title);

        const buildInfo = document.createElement('p');
        buildInfo.className = 'mp-subtitle';
        buildInfo.textContent = `build: ${BUILD_ID}`;
        this.overlayContent.appendChild(buildInfo);

        const nameInput = document.createElement('input');
        nameInput.id = 'name-input';
        nameInput.className = 'mp-input';
        nameInput.placeholder = 'Your name';
        nameInput.maxLength = 16;
        nameInput.value = localStorage.getItem('adicraft-name') || '';
        this.overlayContent.appendChild(nameInput);

        // Prevent overlay click-through when clicking inputs/buttons
        const stopProp = (e) => e.stopPropagation();
        nameInput.addEventListener('click', stopProp);

        const joinMainBtn = document.createElement('button');
        joinMainBtn.className = 'mp-btn';
        joinMainBtn.textContent = 'Join Main World';
        joinMainBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._join(nameInput, 'adicraft-main');
        });
        this.overlayContent.appendChild(joinMainBtn);

        const browseBtn = document.createElement('button');
        browseBtn.className = 'mp-btn mp-btn-secondary';
        browseBtn.textContent = 'Browse Worlds';
        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._saveName(nameInput);
            this.showBrowser();
        });
        this.overlayContent.appendChild(browseBtn);

        const createBtn = document.createElement('button');
        createBtn.className = 'mp-btn mp-btn-secondary';
        createBtn.textContent = 'Create New World';
        createBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._saveName(nameInput);
            this.showCreate();
        });
        this.overlayContent.appendChild(createBtn);

        nameInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') this._join(nameInput, 'adicraft-main');
        });

        nameInput.focus();
    }

    // Screen 2: Branch Browser
    showBrowser() {
        this.overlayContent.innerHTML = '';
        this.overlay.classList.remove('hidden');
        this.overlay.style.cursor = 'default';

        const title = document.createElement('h2');
        title.textContent = 'Browse Worlds';
        this.overlayContent.appendChild(title);

        const list = document.createElement('div');
        list.className = 'branch-list';
        list.innerHTML = '<p class="mp-subtitle">Loading...</p>';
        this.overlayContent.appendChild(list);

        const backBtn = document.createElement('button');
        backBtn.className = 'mp-btn mp-btn-secondary';
        backBtn.textContent = 'Back';
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.show();
        });
        this.overlayContent.appendChild(backBtn);

        this._fetchBranches(list);
    }

    async _fetchBranches(container) {
        try {
            const res = await fetch(`${API_BASE}/api/branches`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const branches = await res.json();
            this._renderBranchList(container, branches);
        } catch (e) {
            container.innerHTML = `<p class="mp-subtitle">Failed to load: ${e.message}</p>`;
        }
    }

    _renderBranchList(container, branches) {
        container.innerHTML = '';

        if (!branches.length) {
            container.innerHTML = '<p class="mp-subtitle">No worlds found.</p>';
            return;
        }

        for (const branch of branches) {
            const item = document.createElement('div');
            item.className = 'branch-item';

            const info = document.createElement('div');
            info.className = 'branch-item-info';

            const nameEl = document.createElement('div');
            nameEl.className = 'branch-item-name';
            // Display without "adicraft-" prefix for readability
            nameEl.textContent = branch.name.replace(/^adicraft-/, '');
            info.appendChild(nameEl);

            const meta = document.createElement('div');
            meta.className = 'branch-item-meta';

            const count = document.createElement('span');
            count.className = 'branch-player-count';
            count.textContent = `${branch.playerCount} online`;
            meta.appendChild(count);

            const age = document.createElement('span');
            age.className = 'branch-age';
            age.textContent = timeAgo(branch.lastActivity);
            meta.appendChild(age);

            if (branch.parent) {
                const parent = document.createElement('span');
                parent.className = 'branch-parent';
                parent.textContent = `from ${branch.parent.replace(/^adicraft-/, '')}`;
                meta.appendChild(parent);
            }

            info.appendChild(meta);
            item.appendChild(info);

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this._joinBranch(branch.name);
            });

            container.appendChild(item);
        }
    }

    // Screen 3: Create Branch
    showCreate() {
        this.overlayContent.innerHTML = '';
        this.overlay.classList.remove('hidden');
        this.overlay.style.cursor = 'default';

        const title = document.createElement('h2');
        title.textContent = 'Create New World';
        this.overlayContent.appendChild(title);

        const label = document.createElement('p');
        label.className = 'branch-label';
        label.textContent = `Branching from: ${this._currentBranch.replace(/^adicraft-/, '')}`;
        this.overlayContent.appendChild(label);

        const nameInput = document.createElement('input');
        nameInput.className = 'mp-input';
        nameInput.placeholder = 'World name';
        nameInput.maxLength = 32;
        nameInput.addEventListener('click', (e) => e.stopPropagation());
        this.overlayContent.appendChild(nameInput);

        const statusEl = document.createElement('p');
        statusEl.className = 'mp-subtitle';
        this.overlayContent.appendChild(statusEl);

        const createBtn = document.createElement('button');
        createBtn.className = 'mp-btn';
        createBtn.textContent = 'Create & Join';
        createBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._createBranch(nameInput.value.trim(), statusEl, createBtn);
        });
        this.overlayContent.appendChild(createBtn);

        const backBtn = document.createElement('button');
        backBtn.className = 'mp-btn mp-btn-secondary';
        backBtn.textContent = 'Back';
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.show();
        });
        this.overlayContent.appendChild(backBtn);

        nameInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                this._createBranch(nameInput.value.trim(), statusEl, createBtn);
            }
        });

        nameInput.focus();
    }

    async _createBranch(rawName, statusEl, btn) {
        if (!rawName) {
            statusEl.textContent = 'Please enter a world name.';
            return;
        }

        const safeName = sanitizeBranchName(rawName);
        if (!safeName) {
            statusEl.textContent = 'Invalid name. Use letters, numbers, hyphens.';
            return;
        }

        btn.disabled = true;
        statusEl.textContent = 'Creating...';

        try {
            const res = await fetch(`${API_BASE}/api/branches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: safeName,
                    parent: this._currentBranch,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                statusEl.textContent = data.error || 'Failed to create branch.';
                btn.disabled = false;
                return;
            }

            this._joinBranch(data.name);
        } catch (e) {
            statusEl.textContent = `Error: ${e.message}`;
            btn.disabled = false;
        }
    }

    _saveName(nameInput) {
        const name = nameInput.value.trim();
        if (name) localStorage.setItem('adicraft-name', name);
    }

    _join(nameInput, room) {
        const name = nameInput.value.trim() || 'Player-' + Math.random().toString(36).substring(2, 6);
        localStorage.setItem('adicraft-name', name);
        localStorage.setItem('adicraft-room', room);
        if (this._onJoin) this._onJoin(room, name);
    }

    _joinBranch(branchName) {
        const name = localStorage.getItem('adicraft-name') || 'Player-' + Math.random().toString(36).substring(2, 6);
        localStorage.setItem('adicraft-name', name);
        localStorage.setItem('adicraft-room', branchName);
        if (this._onJoin) this._onJoin(branchName, name);
    }

    showError(message) {
        this.overlayContent.innerHTML = `<h2>Error</h2><p>${message}</p>`;
        const backBtn = document.createElement('button');
        backBtn.className = 'mp-btn';
        backBtn.textContent = 'Back';
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.show();
        });
        this.overlayContent.appendChild(backBtn);
    }

    hide() {
        this.overlay.classList.add('hidden');
    }

    onJoin(callback) { this._onJoin = callback; }
}
