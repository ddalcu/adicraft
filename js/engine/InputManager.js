const TOUCH_SENSITIVITY = 1.5;
const JOYSTICK_THRESHOLD = 0.25;
const TAP_MAX_TIME = 200;
const TAP_MAX_DIST = 10;
const LONG_PRESS_TIME = 400;

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
        this._justPressed = new Set();
        this.isMobile = 'ontouchstart' in window;

        this._setupKeyboard();
        this._setupMouse();
        if (this.isMobile) this._setupTouch();
    }

    _setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this._justPressed.add(e.code);
            }
            this.keys[e.code] = true;
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    wasJustPressed(code) {
        if (this._justPressed.has(code)) {
            this._justPressed.delete(code);
            return true;
        }
        return false;
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

    _setupTouch() {
        // Joystick state
        this._joystickTouchId = null;
        this._joystickOrigin = null;
        const joystickBase = document.getElementById('touch-joystick-base');
        const joystickKnob = document.getElementById('touch-joystick-knob');
        const joystickArea = document.getElementById('touch-joystick');

        // Look state
        this._lookTouchId = null;
        this._lookLastPos = null;
        this._lookStartPos = null;
        this._lookStartTime = 0;
        this._longPressTimer = null;

        // Keys driven by joystick
        this._joystickKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];

        const screenWidth = () => window.innerWidth;
        const joystickZone = 0.4; // left 40%

        const isInJoystickZone = (x) => x < screenWidth() * joystickZone;

        // Prevent default on canvas to avoid scrolling/zooming
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        document.addEventListener('touchstart', (e) => {
            if (!this.enabled) return;
            for (const touch of e.changedTouches) {
                if (isInJoystickZone(touch.clientX) && this._joystickTouchId === null) {
                    this._handleJoystickStart(touch, joystickBase, joystickKnob, joystickArea);
                } else if (!isInJoystickZone(touch.clientX) && this._lookTouchId === null) {
                    // Ignore touches on touch buttons
                    if (touch.target.closest('#touch-buttons')) continue;
                    this._handleLookStart(touch);
                }
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.enabled) return;
            for (const touch of e.changedTouches) {
                if (touch.identifier === this._joystickTouchId) {
                    this._handleJoystickMove(touch, joystickKnob, joystickArea);
                } else if (touch.identifier === this._lookTouchId) {
                    this._handleLookMove(touch);
                }
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this._joystickTouchId) {
                    this._handleJoystickEnd(joystickBase, joystickKnob, joystickArea);
                } else if (touch.identifier === this._lookTouchId) {
                    this._handleLookEnd(touch);
                }
            }
        }, { passive: true });

        document.addEventListener('touchcancel', (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this._joystickTouchId) {
                    this._handleJoystickEnd(joystickBase, joystickKnob, joystickArea);
                } else if (touch.identifier === this._lookTouchId) {
                    this._handleLookEnd(touch);
                }
            }
        }, { passive: true });
    }

    _handleJoystickStart(touch, base, knob, area) {
        this._joystickTouchId = touch.identifier;
        this._joystickOrigin = { x: touch.clientX, y: touch.clientY };

        // Position joystick visual at touch point
        const areaRect = area.getBoundingClientRect();
        const localX = touch.clientX - areaRect.left;
        const localY = touch.clientY - areaRect.top;

        base.classList.add('touch-joystick-active');
        knob.classList.add('touch-joystick-active');
        base.style.left = localX + 'px';
        base.style.top = localY + 'px';
        knob.style.left = localX + 'px';
        knob.style.top = localY + 'px';
    }

    _handleJoystickMove(touch, knob, area) {
        if (!this._joystickOrigin) return;

        const dx = touch.clientX - this._joystickOrigin.x;
        const dy = touch.clientY - this._joystickOrigin.y;
        const maxDist = 50;

        // Clamp to circle
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        const clampedX = Math.cos(angle) * clampedDist;
        const clampedY = Math.sin(angle) * clampedDist;

        // Move knob visual
        const areaRect = area.getBoundingClientRect();
        const originLocalX = this._joystickOrigin.x - areaRect.left;
        const originLocalY = this._joystickOrigin.y - areaRect.top;
        knob.style.left = (originLocalX + clampedX) + 'px';
        knob.style.top = (originLocalY + clampedY) + 'px';

        // Normalize to -1..1
        const nx = clampedX / maxDist;
        const ny = clampedY / maxDist;

        // Map to WASD keys
        this.keys['KeyW'] = ny < -JOYSTICK_THRESHOLD;
        this.keys['KeyS'] = ny > JOYSTICK_THRESHOLD;
        this.keys['KeyA'] = nx < -JOYSTICK_THRESHOLD;
        this.keys['KeyD'] = nx > JOYSTICK_THRESHOLD;
    }

    _handleJoystickEnd(base, knob) {
        this._joystickTouchId = null;
        this._joystickOrigin = null;

        // Release all joystick keys
        for (const key of this._joystickKeys) {
            this.keys[key] = false;
        }

        base.classList.remove('touch-joystick-active');
        knob.classList.remove('touch-joystick-active');
    }

    _handleLookStart(touch) {
        this._lookTouchId = touch.identifier;
        this._lookLastPos = { x: touch.clientX, y: touch.clientY };
        this._lookStartPos = { x: touch.clientX, y: touch.clientY };
        this._lookStartTime = performance.now();

        // Start long-press timer for right-click (place block)
        this._longPressTimer = setTimeout(() => {
            this.mouseRight = true;
            this.mouseRightDown = true;
            this._longPressTimer = null;
        }, LONG_PRESS_TIME);
    }

    _handleLookMove(touch) {
        if (!this._lookLastPos) return;

        const dx = touch.clientX - this._lookLastPos.x;
        const dy = touch.clientY - this._lookLastPos.y;

        this.mouseDX += dx * TOUCH_SENSITIVITY;
        this.mouseDY += dy * TOUCH_SENSITIVITY;

        this._lookLastPos = { x: touch.clientX, y: touch.clientY };

        // Cancel long-press if finger moved too far
        if (this._longPressTimer && this._lookStartPos) {
            const totalDx = touch.clientX - this._lookStartPos.x;
            const totalDy = touch.clientY - this._lookStartPos.y;
            if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > TAP_MAX_DIST) {
                clearTimeout(this._longPressTimer);
                this._longPressTimer = null;
            }
        }
    }

    _handleLookEnd(touch) {
        // Check for tap (quick touch = left click / break / fire)
        const elapsed = performance.now() - this._lookStartTime;
        if (this._lookStartPos && elapsed < TAP_MAX_TIME) {
            const dx = touch.clientX - this._lookStartPos.x;
            const dy = touch.clientY - this._lookStartPos.y;
            if (Math.sqrt(dx * dx + dy * dy) < TAP_MAX_DIST) {
                this.mouseLeftDown = true;
                this.mouseLeft = true;
                // Release after one frame
                requestAnimationFrame(() => { this.mouseLeft = false; });
            }
        }

        // Clear long-press timer
        if (this._longPressTimer) {
            clearTimeout(this._longPressTimer);
            this._longPressTimer = null;
        }
        this.mouseRight = false;

        this._lookTouchId = null;
        this._lookLastPos = null;
        this._lookStartPos = null;
    }

    simulateKeyPress(code) {
        if (!this.keys[code]) {
            this._justPressed.add(code);
        }
        this.keys[code] = true;
    }

    simulateKeyRelease(code) {
        this.keys[code] = false;
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
