// Ambient — generative sparse events over the continuous background
// Satellite passes (rising/falling pitch sweeps)
// Theremin pad (vibrato sine with portamento)
// Sci-fi bleeps (Moog-style square/sawtooth bursts)
// All events fire at random intervals — never loops, always evolving.

import { audioEngine } from './AudioEngine';

export class AmbientEvents {
  private running = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private nodes: { stop: () => void }[] = [];
  private masterGain: GainNode | null = null;
  private thereminOsc: OscillatorNode | null = null;
  private thereminGain: GainNode | null = null;

  async start(): Promise<void> {
    if (this.running) return;
    await audioEngine.init();
    const ctx = audioEngine.getContext();
    const master = audioEngine.getMasterGain();
    if (!ctx || !master) return;

    this.running = true;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.gain.setTargetAtTime(0.10, ctx.currentTime, 2);
    this.masterGain.connect(master);

    this.startTheremin(ctx);
    this.scheduleSatellite(ctx);
    this.scheduleBleep(ctx);
    this.scheduleThereminSlide(ctx);
  }

  // -----------------------------------------------------------------------
  // Theremin pad — continuous sine with vibrato, glides to new notes
  // -----------------------------------------------------------------------
  private startTheremin(ctx: AudioContext) {
    const bus = ctx.createGain();
    bus.gain.value = 0.06;
    bus.connect(this.masterGain!);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 220;
    this.thereminOsc = osc;

    // Vibrato
    const vibLfo = ctx.createOscillator();
    vibLfo.type = 'sine';
    vibLfo.frequency.value = 4.5;
    const vibDepth = ctx.createGain();
    vibDepth.gain.value = 12; // ±12 Hz
    vibLfo.connect(vibDepth);
    vibDepth.connect(osc.frequency);

    // Volume envelope — slow swell
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.5, ctx.currentTime, 4);
    this.thereminGain = gain;

    osc.connect(gain);
    gain.connect(bus);

    osc.start();
    vibLfo.start();

    this.nodes.push(
      { stop: () => { try { osc.stop(); } catch {} } },
      { stop: () => { try { vibLfo.stop(); } catch {} } },
    );
  }

  // Schedule random pitch slides on the theremin
  private scheduleThereminSlide(ctx: AudioContext) {
    const schedule = () => {
      if (!this.running || !this.thereminOsc) return;
      const delay = 8000 + Math.random() * 20000; // 8-28 seconds

      const timer = setTimeout(() => {
        if (!this.running || !this.thereminOsc) return;

        // Pentatonic note set (dark, minor feel)
        const notes = [146.8, 174.6, 196, 220, 261.6, 293.7, 349.2, 392, 440];
        const target = notes[Math.floor(Math.random() * notes.length)];
        const glideTime = 1 + Math.random() * 3; // 1-4 second glide

        this.thereminOsc.frequency.exponentialRampToValueAtTime(
          target,
          ctx.currentTime + glideTime,
        );

        // Occasionally fade out and back in (breathing)
        if (this.thereminGain && Math.random() > 0.6) {
          this.thereminGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.5);
          this.thereminGain.gain.setTargetAtTime(0.5, ctx.currentTime + 2 + Math.random() * 3, 1);
        }

        schedule();
      }, delay);

      this.timers.push(timer);
    };
    schedule();
  }

  // -----------------------------------------------------------------------
  // Satellite passes — rising/falling pitch sweeps
  // -----------------------------------------------------------------------
  private scheduleSatellite(ctx: AudioContext) {
    const schedule = () => {
      if (!this.running) return;
      const delay = 12000 + Math.random() * 25000; // 12-37 seconds

      const timer = setTimeout(() => {
        if (!this.running) return;
        this.playSatellite(ctx);
        schedule();
      }, delay);

      this.timers.push(timer);
    };
    schedule();
  }

  private playSatellite(ctx: AudioContext) {
    const now = ctx.currentTime;
    const duration = 3 + Math.random() * 7; // 3-10 seconds

    const startFreq = 150 + Math.random() * 400;
    const rising = Math.random() > 0.55;
    const endFreq = rising ? startFreq * (1.5 + Math.random()) : startFreq * (0.3 + Math.random() * 0.3);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    // Envelope: slow fade in, hold, slow fade out
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.setTargetAtTime(0.04, now, duration * 0.15);
    gain.gain.setTargetAtTime(0, now + duration * 0.6, duration * 0.2);

    // Slight chorus via detuned pair
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(startFreq * 1.003, now);
    osc2.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq * 1.003), now + duration);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setTargetAtTime(0.02, now, duration * 0.15);
    gain2.gain.setTargetAtTime(0, now + duration * 0.6, duration * 0.2);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(this.masterGain!);
    gain2.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration + 1);
    osc2.start(now);
    osc2.stop(now + duration + 1);
  }

  // -----------------------------------------------------------------------
  // Sci-fi bleeps — Moog-style bursts and whooshes
  // -----------------------------------------------------------------------
  private scheduleBleep(ctx: AudioContext) {
    const schedule = () => {
      if (!this.running) return;
      const delay = 15000 + Math.random() * 35000; // 15-50 seconds

      const timer = setTimeout(() => {
        if (!this.running) return;

        if (Math.random() > 0.4) {
          this.playBleep(ctx);
        } else {
          this.playWhoosh(ctx);
        }
        schedule();
      }, delay);

      this.timers.push(timer);
    };
    schedule();
  }

  private playBleep(ctx: AudioContext) {
    const now = ctx.currentTime;
    const freq = 400 + Math.random() * 800;
    const duration = 0.3 + Math.random() * 0.4;

    const osc = ctx.createOscillator();
    osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
    osc.frequency.value = freq;

    // Filter to soften harsh square/saw
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 2;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.setTargetAtTime(0.03, now, 0.02);        // fast but soft attack
    gain.gain.setTargetAtTime(0.015, now + 0.08, 0.05); // decay
    gain.gain.setTargetAtTime(0, now + duration, 0.08); // release

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration + 0.3);
  }

  private playWhoosh(ctx: AudioContext) {
    const now = ctx.currentTime;
    const rising = Math.random() > 0.5;
    const startFreq = rising ? 200 + Math.random() * 200 : 600 + Math.random() * 400;
    const endFreq = rising ? startFreq * 2.5 : startFreq * 0.3;
    const duration = 0.6 + Math.random() * 0.8;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;
    // Sweep filter with pitch
    filter.frequency.setValueAtTime(startFreq * 3, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq * 2), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.setTargetAtTime(0.025, now, 0.03);
    gain.gain.setTargetAtTime(0, now + duration * 0.7, duration * 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration + 0.5);
  }

  // -----------------------------------------------------------------------
  stop(): void {
    this.running = false;

    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];

    const ctx = audioEngine.getContext();
    if (ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, ctx.currentTime, 1.5);
    }

    setTimeout(() => {
      for (const node of this.nodes) node.stop();
      this.nodes = [];
      this.thereminOsc = null;
      this.thereminGain = null;
      this.masterGain = null;
    }, 2500);
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const ambientEvents = new AmbientEvents();

// Keep backward-compatible export name
export const ambientSound = {
  async start(_mode?: string) { await ambientEvents.start(); },
  stop() { ambientEvents.stop(); },
  setMode(_mode: string) { /* single mode now */ },
  isRunning() { return ambientEvents.isRunning(); },
};
