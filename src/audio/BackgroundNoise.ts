// BackgroundNoise — continuous ambient drone
// Multiple low-frequency oscillators that drift and modulate each other.
// Not white noise — pulsing, evolving low tones.

import { audioEngine } from './AudioEngine';

export class BackgroundNoise {
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private lfos: OscillatorNode[] = [];
  private masterGain: GainNode | null = null;
  private running = false;

  async start(): Promise<void> {
    if (this.running) return;
    await audioEngine.init();
    const ctx = audioEngine.getContext();
    const master = audioEngine.getMasterGain();
    if (!ctx || !master) return;

    this.running = true;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(master);

    // Fade in
    this.masterGain.gain.setTargetAtTime(0.35, ctx.currentTime, 2);

    // Layer 1: deep sub drone
    this.addDrone(ctx, 36, 'sine', 0.3, { lfoFreq: 0.03, lfoDepth: 0.15, filterFreq: 120 });
    // Layer 2: low rumble
    this.addDrone(ctx, 55, 'triangle', 0.2, { lfoFreq: 0.05, lfoDepth: 0.1, filterFreq: 180 });
    // Layer 3: mid-low pulse
    this.addDrone(ctx, 73, 'sine', 0.15, { lfoFreq: 0.07, lfoDepth: 0.12, filterFreq: 250 });
    // Layer 4: harmonic shimmer
    this.addDrone(ctx, 110, 'triangle', 0.08, { lfoFreq: 0.11, lfoDepth: 0.06, filterFreq: 300 });
    // Layer 5: very deep pulse
    this.addDrone(ctx, 27.5, 'sine', 0.25, { lfoFreq: 0.02, lfoDepth: 0.2, filterFreq: 80 });
  }

  private addDrone(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    volume: number,
    mod: { lfoFreq: number; lfoDepth: number; filterFreq: number },
  ) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 15;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    // LFO on volume — each layer pulses at its own rate
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = mod.lfoFreq;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = mod.lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    // Slow frequency drift
    const driftLfo = ctx.createOscillator();
    driftLfo.type = 'sine';
    driftLfo.frequency.value = 0.01 + Math.random() * 0.02;
    const driftGain = ctx.createGain();
    driftGain.gain.value = freq * 0.03; // ±3% drift
    driftLfo.connect(driftGain);
    driftGain.connect(osc.frequency);
    driftLfo.start();

    // Low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = mod.filterFreq;
    filter.Q.value = 1.5;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();

    this.oscillators.push(osc);
    this.gains.push(gain);
    this.lfos.push(lfo, driftLfo);
  }

  stop(): void {
    const ctx = audioEngine.getContext();
    if (!ctx || !this.running) return;

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, ctx.currentTime, 1);
    }

    setTimeout(() => {
      for (const osc of this.oscillators) { try { osc.stop(); } catch { /* ok */ } }
      for (const lfo of this.lfos) { try { lfo.stop(); } catch { /* ok */ } }
      this.oscillators = [];
      this.gains = [];
      this.lfos = [];
      this.masterGain = null;
    }, 2000);

    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const backgroundNoise = new BackgroundNoise();
