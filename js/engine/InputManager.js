export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.mouseDX = 0;
        this.mouseDY = 0;
        this.mouseLeft = false;
        this.mouseRight = false;
        this.mouseLeftDown = false;
        this.mouseRightDown = false;
        this.enabled = false;

        this._setupKeyboard();
        this._setupMouse();
    }

    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    _setupMouse() {
        document.addEventListener('mousemove', (e) => {
            if (!this.enabled) return;
            this.mouseDX += e.movementX;
            this.mouseDY += e.movementY;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.enabled) return;
            if (e.button === 0) {
                this.mouseLeft = true;
                this.mouseLeftDown = true;
            }
            if (e.button === 2) {
                this.mouseRight = true;
                this.mouseRightDown = true;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouseLeft = false;
            if (e.button === 2) this.mouseRight = false;
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    consumeMouse() {
        const dx = this.mouseDX;
        const dy = this.mouseDY;
        this.mouseDX = 0;
        this.mouseDY = 0;
        return { dx, dy };
    }

    consumeClicks() {
        const left = this.mouseLeftDown;
        const right = this.mouseRightDown;
        this.mouseLeftDown = false;
        this.mouseRightDown = false;
        return { left, right };
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }
}
