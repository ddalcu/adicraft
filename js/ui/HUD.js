// HUD manager — updates DOM elements for health, damage flash, weapon indicator, boss bar

export class HUD {
    constructor() {
        this.healthBar = document.getElementById('health-bar');
        this.healthText = document.getElementById('health-text');
        this.damageOverlay = document.getElementById('damage-overlay');
        this.weaponIndicator = document.getElementById('weapon-indicator');
        this.bossBar = document.getElementById('boss-bar');
        this.bossBarFill = document.getElementById('boss-bar-fill');
        this.bossBarName = document.getElementById('boss-bar-name');
        this.crosshair = document.getElementById('crosshair');

        this.damageFlashTimer = 0;
    }

    update(dt) {
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= dt;
            const opacity = Math.max(0, this.damageFlashTimer / 0.3);
            this.damageOverlay.style.opacity = opacity;
            if (this.damageFlashTimer <= 0) {
                this.damageOverlay.classList.remove('visible-block');
            }
        }
    }

    updateHealth(health, maxHealth) {
        const pct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
        this.healthBar.style.width = pct + '%';

        // Color transitions: green > yellow > red
        if (pct > 50) {
            this.healthBar.classList.remove('health-low', 'health-critical');
        } else if (pct > 25) {
            this.healthBar.classList.add('health-low');
            this.healthBar.classList.remove('health-critical');
        } else {
            this.healthBar.classList.remove('health-low');
            this.healthBar.classList.add('health-critical');
        }

        this.healthText.textContent = Math.ceil(health) + '/' + maxHealth;
    }

    showDamageFlash() {
        this.damageFlashTimer = 0.3;
        this.damageOverlay.classList.add('visible-block');
        this.damageOverlay.style.opacity = 1;
    }

    setWeaponMode(isWeapon) {
        this.weaponIndicator.textContent = isWeapon ? 'GUN' : 'BUILD';
        this.weaponIndicator.classList.toggle('weapon-mode-gun', isWeapon);
        this.crosshair.textContent = isWeapon ? '.' : '+';
        this.crosshair.classList.toggle('crosshair-weapon', isWeapon);
    }

    showBossBar(name, health, maxHealth) {
        this.bossBar.classList.add('visible-block');
        this.bossBarName.textContent = name;
        const pct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
        this.bossBarFill.style.width = pct + '%';
    }

    hideBossBar() {
        this.bossBar.classList.remove('visible-block');
    }

    showDeathScreen() {
        const overlay = document.getElementById('death-overlay');
        overlay.classList.add('visible-flex');
    }

    hideDeathScreen() {
        const overlay = document.getElementById('death-overlay');
        overlay.classList.remove('visible-flex');
    }

    showVictoryMessage(text) {
        const msg = document.getElementById('victory-message');
        msg.textContent = text;
        msg.classList.add('visible-block');
        setTimeout(() => msg.classList.remove('visible-block'), 5000);
    }
}
