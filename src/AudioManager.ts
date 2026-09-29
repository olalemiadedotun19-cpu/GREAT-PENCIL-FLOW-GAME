export class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private rollingNode: AudioBufferSourceNode | null = null;
  private rollingGain: GainNode | null = null;
  private rollingFilter: BiquadFilterNode | null = null;
  private drawNode: AudioBufferSourceNode | null = null;
  private drawGain: GainNode | null = null;
  private isDrawingPlaying = false;
  private isRollingPlaying = false;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  private initCtx(): boolean {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !!this.ctx;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopContinuousSounds();
    }
  }

  /**
   * Continuous rolling ball hum on paper
   */
  public startRollingSound(): void {
    if (!this.enabled || this.isRollingPlaying || !this.initCtx() || !this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.1;
      }

      this.rollingNode = this.ctx.createBufferSource();
      this.rollingNode.buffer = noiseBuffer;
      this.rollingNode.loop = true;

      this.rollingFilter = this.ctx.createBiquadFilter();
      this.rollingFilter.type = 'lowpass';
      this.rollingFilter.frequency.value = 280;

      this.rollingGain = this.ctx.createGain();
      this.rollingGain.gain.value = 0.04;

      this.rollingNode.connect(this.rollingFilter);
      this.rollingFilter.connect(this.rollingGain);
      this.rollingGain.connect(this.ctx.destination);

      this.rollingNode.start();
      this.isRollingPlaying = true;
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public updateRollingPitch(speed: number, inAir: boolean): void {
    if (!this.isRollingPlaying || !this.rollingGain || !this.rollingFilter || !this.ctx) return;

    const targetGain = inAir ? 0.005 : Math.min(0.08, 0.02 + (speed / 30) * 0.06);
    const targetFreq = Math.min(800, 220 + (speed / 30) * 450);

    const now = this.ctx.currentTime;
    this.rollingGain.gain.setTargetAtTime(targetGain, now, 0.1);
    this.rollingFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
  }

  /**
   * Continuous pencil scratching sound on paper
   */
  public startDrawingSound(): void {
    if (!this.enabled || this.isDrawingPlaying || !this.initCtx() || !this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 1.5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.08;
      }

      this.drawNode = this.ctx.createBufferSource();
      this.drawNode.buffer = noiseBuffer;
      this.drawNode.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 2400;
      bandpass.Q.value = 3.5;

      this.drawGain = this.ctx.createGain();
      this.drawGain.gain.value = 0.025;

      this.drawNode.connect(bandpass);
      bandpass.connect(this.drawGain);
      this.drawGain.connect(this.ctx.destination);

      this.drawNode.start();
      this.isDrawingPlaying = true;
    } catch {
      // Ignore
    }
  }

  public stopContinuousSounds(): void {
    try {
      if (this.rollingNode) {
        this.rollingNode.stop();
        this.rollingNode.disconnect();
        this.rollingNode = null;
      }
      if (this.drawNode) {
        this.drawNode.stop();
        this.drawNode.disconnect();
        this.drawNode = null;
      }
    } catch {
      // Ignore
    }
    this.isRollingPlaying = false;
    this.isDrawingPlaying = false;
  }

  public playJump(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playLand(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playCrash(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;

    const now = this.ctx.currentTime;
    // Graphite snapping noise
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
  }

  public playFall(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.8);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.85);
  }

  public playClick(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playPowerUp(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;

    const now = this.ctx.currentTime;
    // Chime arp (C6, E6, G6, C7)
    const notes = [1046.5, 1318.5, 1567.98, 2093.0];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';

      const startTime = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.07, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });

    // Speed whoosh
    const whooshOsc = this.ctx.createOscillator();
    const whooshGain = this.ctx.createGain();
    whooshOsc.type = 'triangle';
    whooshOsc.frequency.setValueAtTime(250, now);
    whooshOsc.frequency.exponentialRampToValueAtTime(850, now + 0.3);

    whooshGain.gain.setValueAtTime(0.08, now);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    whooshOsc.connect(whooshGain);
    whooshGain.connect(this.ctx.destination);

    whooshOsc.start(now);
    whooshOsc.stop(now + 0.35);
  }

  public playGraphitePickup(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    const freq = 1400 + Math.random() * 200;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 0.08);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCloseCall(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';

    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.15);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playPerfectLanding(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Cheerful brass-like double chime
    [880, 1174.66].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  public playObstacleSketched(): void {
    if (!this.enabled || !this.initCtx() || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Soft quick pencil scratch stroke
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.09);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1600;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }
}
