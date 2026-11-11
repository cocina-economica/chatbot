/**
 * Universal Sales Chat Engine - Sound Service
 * Synthesizes discrete, pleasant notification sounds via Web Audio API.
 * 100% offline, zero external audio file dependencies.
 */

export class SoundService {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('usc_sound_enabled') === 'true';
  }

  _initContext() {
    if (!this.ctx && (typeof window !== 'undefined')) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('usc_sound_enabled', this.enabled ? 'true' : 'false');
    if (this.enabled) {
      this.playMessageSound();
    }
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Synthesizes a subtle, pleasant message chime ("pop-ding")
   */
  playMessageSound() {
    if (!this.enabled) return;

    try {
      this._initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Note 1 (sweet acoustic chime)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.25);

      // Note 2 (bright gentle resolution)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now + 0.06); // D6

      gain2.gain.setValueAtTime(0.0001, now + 0.06);
      gain2.gain.linearRampToValueAtTime(0.08, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(now + 0.06);
      osc2.stop(now + 0.35);
    } catch (e) {
      // Audio autoplay policy or browser restriction
    }
  }
}
