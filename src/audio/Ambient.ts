// Ambient — generative soundscape that responds to app state
// Subtle, dark, non-melodic. Changes based on: idle, genesis, evocation.

import { audioEngine } from './AudioEngine';

type AmbientMode = 'idle' | 'genesis' | 'evocation';

export class AmbientSound {
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private lfo: OscillatorNode | null = null;
  private currentMode: AmbientMode = 'idle';
  private running = false;

  async start(mode: AmbientMode = 'idle'): Promise<void> {
    await audioEngine.init();
    const ctx = audioEngine.getContext();
    const master = audioEngine.getMasterGain();
    if (!ctx || !master) return;

    this.stop();
    this.currentMode = mode;
    this.running = true;

    const config = modeConfig[mode];

    // LFO for modulation
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = config.lfoRate;
    this.lfo.start();

    // Create drone oscillators
    for (const freq of config.frequencies) {
      const osc = ctx.createOscillator();
      osc.type = config.waveform as OscillatorType;
      osc.frequency.value = freq;

      // Detune slightly for richness
      osc.detune.value = (Math.random() - 0.5) * 10;

      const gain = ctx.createGain();
      gain.gain.value = 0;

      // LFO modulates gain
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = config.lfoDepth;
      this.lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);

      // Low-pass filter for darkness
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = config.filterCutoff;
      filter.Q.value = 0.5;
      gain.connect(filter);
      filter.connect(master);

      // Fade in
      gain.gain.setTargetAtTime(config.volume, ctx.currentTime, 2);

      osc.start();
      this.oscillators.push(osc);
      this.gains.push(gain);
    }
  }

  setMode(mode: AmbientMode): void {
    if (mode !== this.currentMode) {
      this.start(mode);
    }
  }

  stop(): void {
    const ctx = audioEngine.getContext();
    if (!ctx) return;

    for (const gain of this.gains) {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    }

    // Stop oscillators after fade out
    setTimeout(() => {
      for (const osc of this.oscillators) {
        try { osc.stop(); } catch { /* already stopped */ }
      }
      if (this.lfo) {
        try { this.lfo.stop(); } catch { /* already stopped */ }
      }
      this.oscillators = [];
      this.gains = [];
      this.lfo = null;
    }, 1000);

    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }
}

interface ModeConfig {
  frequencies: number[];
  waveform: string;
  volume: number;
  lfoRate: number;
  lfoDepth: number;
  filterCutoff: number;
}

const modeConfig: Record<AmbientMode, ModeConfig> = {
  idle: {
    frequencies: [55, 82.5, 110],
    waveform: 'sine',
    volume: 0.5,
    lfoRate: 0.05,
    lfoDepth: 0.15,
    filterCutoff: 300,
  },
  genesis: {
    frequencies: [41.2, 61.7, 82.4, 123.5],
    waveform: 'triangle',
    volume: 0.6,
    lfoRate: 0.08,
    lfoDepth: 0.2,
    filterCutoff: 400,
  },
  evocation: {
    frequencies: [55, 73.4, 98, 146.8],
    waveform: 'sawtooth',
    volume: 0.4,
    lfoRate: 0.12,
    lfoDepth: 0.12,
    filterCutoff: 350,
  },
};

export const ambientSound = new AmbientSound();
