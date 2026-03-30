// BackgroundNoise — continuous ambient layers
// Layer 1: Deep engine drone (sub-harmonics, slow pulsing)
// Layer 2: Digital wind (brown noise with sweeping filter)
// Layer 3: Synth pad (detuned oscillator pairs, evolving filter)

import { audioEngine } from './AudioEngine';

export class BackgroundNoise {
  private nodes: { stop: () => void }[] = [];
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
    this.masterGain.gain.setTargetAtTime(0.18, ctx.currentTime, 3);
    this.masterGain.connect(master);

    this.buildEngineDrone(ctx);
    this.buildDigitalWind(ctx);
    this.buildSynthPad(ctx);
  }

  // -----------------------------------------------------------------------
  // Layer 1: Engine Drone — deep pulsing machinery
  // -----------------------------------------------------------------------
  private buildEngineDrone(ctx: AudioContext) {
    const bus = ctx.createGain();
    bus.gain.value = 0.25;
    bus.connect(this.masterGain!);

    const drones: { freq: number; vol: number; lfoRate: number; lfoDepth: number; filter: number }[] = [
      { freq: 18.3, vol: 0.3,  lfoRate: 0.012, lfoDepth: 0.2,  filter: 50 },   // sub-bass pressure
      { freq: 27.5, vol: 0.35, lfoRate: 0.018, lfoDepth: 0.22, filter: 70 },   // fundamental
      { freq: 36,   vol: 0.25, lfoRate: 0.028, lfoDepth: 0.18, filter: 90 },   // harmonic
      { freq: 55,   vol: 0.15, lfoRate: 0.035, lfoDepth: 0.12, filter: 120 },  // upper harmonic
    ];

    for (const d of drones) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = d.freq;
      osc.detune.value = (Math.random() - 0.5) * 10;

      // Volume LFO — slow pulsing
      const gain = ctx.createGain();
      gain.gain.value = d.vol;
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = d.lfoRate;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = d.lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      // Frequency drift — organic variation
      const drift = ctx.createOscillator();
      drift.type = 'sine';
      drift.frequency.value = 0.005 + Math.random() * 0.015;
      const driftGain = ctx.createGain();
      driftGain.gain.value = d.freq * 0.025;
      drift.connect(driftGain);
      driftGain.connect(osc.frequency);

      // Low-pass filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = d.filter;
      filter.Q.value = 1.2;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bus);

      osc.start();
      lfo.start();
      drift.start();

      this.nodes.push(
        { stop: () => { try { osc.stop(); } catch {} } },
        { stop: () => { try { lfo.stop(); } catch {} } },
        { stop: () => { try { drift.stop(); } catch {} } },
      );
    }
  }

  // -----------------------------------------------------------------------
  // Layer 2: Digital Wind — brown noise with sweeping filter
  // -----------------------------------------------------------------------
  private buildDigitalWind(ctx: AudioContext) {
    const bus = ctx.createGain();
    bus.gain.value = 0.12;
    bus.connect(this.masterGain!);

    // Two wind layers with different sweep rates for depth
    const windConfigs = [
      { lfoRate: 0.025, lfoDepth: 1500, baseFreq: 400, q: 0.6, vol: 0.7 },
      { lfoRate: 0.04,  lfoDepth: 1000, baseFreq: 800, q: 0.5, vol: 0.4 },
    ];

    for (const w of windConfigs) {
      // Brown noise generation
      const bufSize = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < bufSize; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + white * 0.02) * 0.98;
          data[i] = last * 3.5;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;

      // Sweeping low-pass filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = w.baseFreq;
      filter.Q.value = w.q;

      const sweepLfo = ctx.createOscillator();
      sweepLfo.type = 'sine';
      sweepLfo.frequency.value = w.lfoRate;
      const sweepGain = ctx.createGain();
      sweepGain.gain.value = w.lfoDepth;
      sweepLfo.connect(sweepGain);
      sweepGain.connect(filter.frequency);

      const windGain = ctx.createGain();
      windGain.gain.value = w.vol;

      noise.connect(filter);
      filter.connect(windGain);
      windGain.connect(bus);

      noise.start();
      sweepLfo.start();

      this.nodes.push(
        { stop: () => { try { noise.stop(); } catch {} } },
        { stop: () => { try { sweepLfo.stop(); } catch {} } },
      );
    }
  }

  // -----------------------------------------------------------------------
  // Layer 3: Synth Pad — detuned oscillator pairs, filter sweep
  // -----------------------------------------------------------------------
  private buildSynthPad(ctx: AudioContext) {
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(0.08, ctx.currentTime, 6); // very slow fade in
    bus.connect(this.masterGain!);

    // Minor-ish chord: A2, E3, A3 — dark, spacious
    const baseFreqs = [110, 164.8, 220];

    for (const freq of baseFreqs) {
      // Detuned pair (±5 cents = chorus/shimmer)
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        const gain = ctx.createGain();
        gain.gain.value = 0.06;

        osc.connect(gain);
        gain.connect(bus);
        osc.start();

        this.nodes.push({ stop: () => { try { osc.stop(); } catch {} } });
      }
    }

    // Slow evolving filter on the pad
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 600;
    padFilter.Q.value = 0.5;

    const filterLfo = ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.04; // 25-second cycle
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.value = 500;
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(padFilter.frequency);

    // Re-route bus through filter
    bus.disconnect();
    bus.connect(padFilter);
    padFilter.connect(this.masterGain!);

    filterLfo.start();
    this.nodes.push({ stop: () => { try { filterLfo.stop(); } catch {} } });
  }

  // -----------------------------------------------------------------------
  stop(): void {
    const ctx = audioEngine.getContext();
    if (!ctx || !this.running) return;

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, ctx.currentTime, 2);
    }

    setTimeout(() => {
      for (const node of this.nodes) node.stop();
      this.nodes = [];
      this.masterGain = null;
    }, 3000);

    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const backgroundNoise = new BackgroundNoise();
