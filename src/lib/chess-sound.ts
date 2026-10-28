// Mechanical typewriter & boxwood acoustic synthesizer for Noir Newspaper Chess

class ChessSoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Typewriter key strike + boxwood piece tap
  playMove() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // High metal clack
    const oscMetal = ctx.createOscillator();
    const gainMetal = ctx.createGain();
    oscMetal.type = 'triangle';
    oscMetal.frequency.setValueAtTime(1400, t);
    oscMetal.frequency.exponentialRampToValueAtTime(300, t + 0.03);
    gainMetal.gain.setValueAtTime(0.3, t);
    gainMetal.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    oscMetal.connect(gainMetal);
    gainMetal.connect(ctx.destination);
    oscMetal.start(t);
    oscMetal.stop(t + 0.03);

    // Warm wooden thud
    const oscWood = ctx.createOscillator();
    const gainWood = ctx.createGain();
    oscWood.type = 'sine';
    oscWood.frequency.setValueAtTime(260, t + 0.005);
    oscWood.frequency.exponentialRampToValueAtTime(90, t + 0.07);
    gainWood.gain.setValueAtTime(0.4, t + 0.005);
    gainWood.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
    oscWood.connect(gainWood);
    gainWood.connect(ctx.destination);
    oscWood.start(t + 0.005);
    oscWood.stop(t + 0.07);
  }

  // Heavy weighted boxwood piece slammed on hardwood table
  playCapture() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Sub thump
    const oscSub = ctx.createOscillator();
    const gainSub = ctx.createGain();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(420, t);
    oscSub.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    gainSub.gain.setValueAtTime(0.7, t);
    gainSub.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    oscSub.connect(gainSub);
    gainSub.connect(ctx.destination);
    oscSub.start(t);
    oscSub.stop(t + 0.12);

    // Hard surface impact snap
    const oscSnap = ctx.createOscillator();
    const gainSnap = ctx.createGain();
    oscSnap.type = 'square';
    oscSnap.frequency.setValueAtTime(800, t);
    oscSnap.frequency.exponentialRampToValueAtTime(120, t + 0.04);
    gainSnap.gain.setValueAtTime(0.35, t);
    gainSnap.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    oscSnap.connect(gainSnap);
    gainSnap.connect(ctx.destination);
    oscSnap.start(t);
    oscSnap.stop(t + 0.04);
  }

  // Typewriter carriage return warning bell
  playCheck() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const freqs = [880, 1760];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.01);
      gain.gain.setValueAtTime(0.25 / (idx + 1), t + idx * 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.01);
      osc.stop(t + 0.35);
    });
  }

  // Double mechanical latch click
  playCastle() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    [0, 0.08].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t + delay);
      osc.frequency.exponentialRampToValueAtTime(110, t + delay + 0.06);
      gain.gain.setValueAtTime(0.4, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.06);
    });
  }

  // Linotype print press slam & resonance
  playGameEnd() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Heavy stamp impact
    const oscHeavy = ctx.createOscillator();
    const gainHeavy = ctx.createGain();
    oscHeavy.type = 'triangle';
    oscHeavy.frequency.setValueAtTime(180, t);
    oscHeavy.frequency.exponentialRampToValueAtTime(45, t + 0.3);
    gainHeavy.gain.setValueAtTime(0.8, t);
    gainHeavy.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    oscHeavy.connect(gainHeavy);
    gainHeavy.connect(ctx.destination);
    oscHeavy.start(t);
    oscHeavy.stop(t + 0.3);

    // Chime resonance
    [220, 277.18, 329.63].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + 0.08 + i * 0.04);
      gain.gain.setValueAtTime(0.2, t + 0.08 + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + 0.08 + i * 0.04);
      osc.stop(t + 0.8);
    });
  }

  // Triumphant mechanical puzzle solved chime
  playSuccess() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      gain.gain.setValueAtTime(0.25, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.35);
    });
  }

  // Dull mistake thud / strike buzzer
  playFailure() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

export const soundManager = new ChessSoundManager();
