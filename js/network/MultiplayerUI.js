export class MultiplayerUI {
    constructor() {
        this.overlay = document.getElementById('overlay');
        this.overlayContent = document.getElementById('overlay-content');
        this._onJoin = null;
    }

    show() {
        this.overlayContent.innerHTML = '';

        const title = document.createElement('h1');
        title.textContent = 'AdiCraft';
        this.overlayContent.appendChild(title);

        const nameInput = document.createElement('input');
        nameInput.id = 'name-input';
        nameInput.className = 'mp-input';
        nameInput.placeholder = 'Your name';
        nameInput.maxLength = 16;
        nameInput.value = localStorage.getItem('adicraft-name') || '';
        this.overlayContent.appendChild(nameInput);

        const roomInput = document.createElement('input');
        roomInput.id = 'room-input';
        roomInput.className = 'mp-input';
        roomInput.placeholder = 'World name (default: adicraft-main)';
        roomInput.maxLength = 32;
        roomInput.value = localStorage.getItem('adicraft-room') || '';
        this.overlayContent.appendChild(roomInput);

        const btn = document.createElement('button');
        btn.className = 'mp-btn';
        btn.textContent = 'Join World';
        btn.addEventListener('click', () => {
            const name = nameInput.value.trim() || 'Player-' + Math.random().toString(36).substring(2, 6);
            const room = roomInput.value.trim() || 'adicraft-main';
            localStorage.setItem('adicraft-name', name);
            localStorage.setItem('adicraft-room', room);
            if (this._onJoin) this._onJoin(room, name);
        });
        this.overlayContent.appendChild(btn);

        nameInput.focus();
    }

    showError(message) {
        this.overlayContent.innerHTML = `<h2>Error</h2><p>${message}</p>`;
        const backBtn = document.createElement('button');
        backBtn.className = 'mp-btn';
        backBtn.textContent = 'Back';
        backBtn.addEventListener('click', () => this.show());
        this.overlayContent.appendChild(backBtn);
    }

    onJoin(callback) { this._onJoin = callback; }
}
