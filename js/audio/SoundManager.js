// Procedural sound effects using Web Audio API.
// All sounds are synthesized at runtime — no audio files needed.

export class SoundManager {
    constructor() {
        this.ctx = null; // lazy-init on first user gesture
        this.masterGain = null;
        this._walkPhase = 0;
        this._walkCooldown = 0;
        this._musicElement = null;
        this._musicSource = null;
        this._musicGain = null;
    }

    _ensure() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return true;
        }
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.4;
            this.masterGain.connect(this.ctx.destination);
            return true;
        } catch {
            return false;
        }
    }

    // --- Background music ---

    startMusic(src) {
        if (!this._ensure()) return;
        if (this._musicElement) return; // already playing

        // Resume suspended AudioContext (required after user gesture)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this._musicElement = new Audio(src);
        this._musicElement.loop = true;
        this._musicElement.crossOrigin = 'anonymous';

        this._musicSource = this.ctx.createMediaElementSource(this._musicElement);
        this._musicGain = this.ctx.createGain();
        this._musicGain.gain.value = 0.3;

        this._musicSource.connect(this._musicGain).connect(this.ctx.destination);

        this._musicElement.play().catch(err => {
            console.warn('Music play failed:', err);
        });
    }

    setMusicVolume(vol) {
        if (this._musicGain) this._musicGain.gain.value = vol;
    }

    // --- Noise helper ---

    _noiseBuffer(duration, sampleRate) {
        const length = Math.floor(duration * sampleRate);
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // --- Shooting: short punchy burst ---

    playShoot() {
        if (!this._ensure()) return;
        const t = this.ctx.currentTime;

        // Noise burst through bandpass
        const noise = this.ctx.createBufferSource();
        noise.buffer = this._noiseBuffer(0.06, this.ctx.sampleRate);

        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(3000, t);
        bp.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        bp.Q.value = 2;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        noise.connect(bp).connect(gain).connect(this.masterGain);
        noise.start(t);
        noise.stop(t + 0.06);

        // Low thump
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(oscGain).connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.06);
    }

    // --- Damage: low-mid impact thud ---

    playHurt() {
        if (!this._ensure()) return;
        const t = this.ctx.currentTime;

        // Low impact tone
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 400;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(lp).connect(gain).connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);

        // Noise crunch
        const noise = this.ctx.createBufferSource();
        noise.buffer = this._noiseBuffer(0.1, this.ctx.sampleRate);

        const noiseBp = this.ctx.createBiquadFilter();
        noiseBp.type = 'bandpass';
        noiseBp.frequency.value = 600;
        noiseBp.Q.value = 1;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        noise.connect(noiseBp).connect(noiseGain).connect(this.masterGain);
        noise.start(t);
        noise.stop(t + 0.1);
    }

    // --- Jump: short upward pitch sweep ---

    playJump() {
        if (!this._ensure()) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain).connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.12);

        // Soft air puff
        const noise = this.ctx.createBufferSource();
        noise.buffer = this._noiseBuffer(0.08, this.ctx.sampleRate);

        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2000;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.1, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        noise.connect(hp).connect(noiseGain).connect(this.masterGain);
        noise.start(t);
        noise.stop(t + 0.08);
    }

    // --- Footstep: filtered noise crunch, alternating pitch ---

    playFootstep() {
        if (!this._ensure()) return;
        const t = this.ctx.currentTime;

        this._walkPhase = (this._walkPhase + 1) % 2;
        const pitchShift = this._walkPhase === 0 ? 1.0 : 1.15;

        // Gravel crunch noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this._noiseBuffer(0.07, this.ctx.sampleRate);
        noise.playbackRate.value = pitchShift;

        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 800 * pitchShift;
        bp.Q.value = 0.8;

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2500;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        noise.connect(bp).connect(lp).connect(gain).connect(this.masterGain);
        noise.start(t);
        noise.stop(t + 0.08);

        // Subtle low thud
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 60 * pitchShift;

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.08, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(oscGain).connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.06);
    }

    // Called every frame with dt and whether the player is walking on ground
    updateWalking(dt, isWalking) {
        if (!isWalking) {
            this._walkCooldown = 0;
            return;
        }
        this._walkCooldown -= dt;
        if (this._walkCooldown <= 0) {
            this.playFootstep();
            this._walkCooldown = 0.35; // footstep interval
        }
    }

    // --- Block break: short crumble ---

    playBlockBreak() {
        if (!this._ensure()) return;
        const t = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this._noiseBuffer(0.12, this.ctx.sampleRate);

        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1200, t);
        bp.frequency.exponentialRampToValueAtTime(400, t + 0.1);
        bp.Q.value = 1;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        noise.connect(bp).connect(gain).connect(this.masterGain);
        noise.start(t);
        noise.stop(t + 0.12);
    }

    // --- Block place: quick thud ---

    playBlockPlace() {
        if (!this._ensure()) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain).connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.08);

        // Short click noise
        const noise = this.ctx.createBufferSource();
        noise.buffer = this._noiseBuffer(0.03, this.ctx.sampleRate);

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1500;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        noise.connect(lp).connect(noiseGain).connect(this.masterGain);
        noise.start(t);
        noise.stop(t + 0.04);
    }
}
