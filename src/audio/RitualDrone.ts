// RitualDrone — WebAudio synthesis for evocation and banishment sequences
//
// Evocation (all ranks): crescendo drone → peak → exponential fade to silence.
// Full arc — audio never cuts mid-cycle.

import { audioEngine } from './AudioEngine';
import {
  type DroneParams,
  type EvocationConfig,
  getEvocationConfig,
  getBanishmentParams,
} from '../ritual/RitualConfig';

class RitualDrone {
  private nodes: { stop: () => void }[] = [];
  private masterGain: GainNode | null = null;
  private playing = false;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  async startEvocation(rank: string, _glowColor: string): Promise<void> {
    if (this.playing) this.stopImmediate();
    await audioEngine.init();
    const ctx = audioEngine.getContext();
    const master = audioEngine.getMasterGain();
    if (!ctx || !master) return;

    this.playing = true;
    const cfg = getEvocationConfig(rank);
    this.buildEvocationDrone(ctx, master, cfg);

    this.stopTimeout = setTimeout(() => {
      this.stopImmediate();
    }, cfg.duration * 1000 + 1000);
  }

  async startBanishment(rank: string, _glowColor: string): Promise<void> {
    if (this.playing) this.stopImmediate();
    await audioEngine.init();
    const ctx = audioEngine.getContext();
    const master = audioEngine.getMasterGain();
    if (!ctx || !master) return;

    this.playing = true;
    const params = getBanishmentParams(rank);
    const drone = params.drone;
    const duration = params.duration;
    const abruptSilence = params.abruptSilence;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(master);

    const now = ctx.currentTime;

    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(drone.gainMax * 0.3, now + 0.3);
    this.masterGain.gain.linearRampToValueAtTime(drone.gainMax, now + duration * 0.7);

    if (abruptSilence) {
      const cutTime = now + duration - 0.02;
      this.masterGain.gain.linearRampToValueAtTime(drone.gainMax, cutTime);
      this.masterGain.gain.setValueAtTime(drone.gainMax, cutTime);
      this.masterGain.gain.linearRampToValueAtTime(0, cutTime + 0.01);
    } else {
      this.masterGain.gain.linearRampToValueAtTime(0, now + duration);
    }

    this.buildDroneOsc(ctx, this.masterGain, drone, duration, true);

    if (drone.hasSubBass) {
      this.buildSubBass(ctx, this.masterGain, drone, duration, true);
    }
    if (drone.hasDissonance) {
      this.buildDissonance(ctx, this.masterGain, drone, duration, true);
    }

    this.stopTimeout = setTimeout(() => {
      this.stopImmediate();
    }, duration * 1000 + 100);
  }

  stop(): void {
    if (!this.playing) return;
    const ctx = audioEngine.getContext();
    if (!ctx || !this.masterGain) {
      this.stopImmediate();
      return;
    }

    const now = ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 0.5);

    setTimeout(() => {
      this.stopImmediate();
    }, 600);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  // -----------------------------------------------------------------------
  // Evocation drone — full crescendo arc for all ranks
  //
  // Shape: silence → cubic rise → peak → exponential decay → silence
  // The drone covers the entire evocation duration. It peaks at the
  // explosion point (crescendoEnd) and fades through reveal.
  // -----------------------------------------------------------------------
  private buildEvocationDrone(ctx: AudioContext, master: GainNode, cfg: EvocationConfig) {
    const now = ctx.currentTime;
    const dur = cfg.duration;
    const drone = cfg.drone;
    const crescendoDur = dur * cfg.crescendoEnd;
    const peakTime = now + crescendoDur;
    const fadeTime = dur * (1 - cfg.crescendoEnd);

    // Master gain: starts at audible floor, rises to peak, then decays
    // floor = 15% of max — you hear the drone from the very first second
    this.masterGain = ctx.createGain();
    this.masterGain.connect(master);
    const floor = drone.gainMax * 0.15;

    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const curve = t * t; // quadratic
      const v = floor + (drone.gainMax - floor) * curve;
      this.masterGain.gain.linearRampToValueAtTime(v, now + crescendoDur * t);
    }
    // Exponential decay to silence — long tail
    this.masterGain.gain.setTargetAtTime(0, peakTime, fadeTime * 0.3);

    // ── Main oscillator ──
    this.buildDroneOsc(ctx, this.masterGain, drone, dur, false, cfg.crescendoEnd);

    // ── Sub-bass ──
    if (drone.hasSubBass) {
      this.buildSubBass(ctx, this.masterGain, drone, dur, false);
    }

    // ── Dissonant harmonics ──
    if (drone.hasDissonance) {
      this.buildDissonance(ctx, this.masterGain, drone, dur, false);
    }

    // ── Thunder(s) at explosion — 1/2/3 in rapid succession ──
    for (let i = 0; i < cfg.thunderCount; i++) {
      const t = peakTime + i * cfg.thunderSpacing;
      // Each successive thunder slightly louder and deeper
      const scale = 1 + i * 0.15;
      const scaledBoom = {
        ...cfg.boom,
        subGain: cfg.boom.subGain * scale,
        crackGain: cfg.boom.crackGain * scale,
        subFreq: cfg.boom.subFreq * (1 - i * 0.1), // slightly deeper each time
      };
      this.buildThunder(ctx, master, t, scaledBoom);
    }
  }

  // -----------------------------------------------------------------------
  // Thunder — deep multi-resonance impact
  //
  // Real thunder = many overlapping low-frequency resonances with beating.
  // We stack ~8 sine oscillators at slightly detuned low frequencies,
  // all sweeping down. The interference creates a rich, living rumble
  // that no single oscillator or noise burst can produce.
  // -----------------------------------------------------------------------
  private buildThunder(
    ctx: AudioContext,
    master: GainNode,
    time: number,
    boom: EvocationConfig['boom'],
  ) {
    // Resonance cluster: base freq ± random detuning, all sweep down
    const voiceCount = 8;
    const baseFreq = boom.subFreq;
    const decay = boom.subDecay;

    for (let i = 0; i < voiceCount; i++) {
      const detune = (Math.random() - 0.5) * 20; // ±10Hz spread
      const startFreq = baseFreq + detune + i * 3;
      const endFreq = 12 + Math.random() * 8; // all end very low

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, time);
      osc.frequency.exponentialRampToValueAtTime(endFreq, time + decay);

      const gain = ctx.createGain();
      // Stagger attack slightly for each voice — thickens the onset
      const attackDelay = i * 0.008;
      const voiceGain = boom.subGain / Math.sqrt(voiceCount); // normalize
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(voiceGain, time + attackDelay + 0.005);
      gain.gain.setTargetAtTime(0, time + attackDelay + 0.005, decay * 0.4);

      osc.connect(gain);
      gain.connect(master);
      osc.start(time);
      osc.stop(time + decay + 1.5);

      this.nodes.push(
        { stop: () => { try { osc.stop(); osc.disconnect(); } catch {} } },
      );
    }

    // Second layer: square wave sub for "punch" body
    const punch = ctx.createOscillator();
    punch.type = 'square';
    punch.frequency.setValueAtTime(baseFreq * 0.5, time);
    punch.frequency.exponentialRampToValueAtTime(10, time + decay * 0.6);

    const punchFilter = ctx.createBiquadFilter();
    punchFilter.type = 'lowpass';
    punchFilter.frequency.value = baseFreq * 3;
    punchFilter.Q.value = 0.5;

    const punchGain = ctx.createGain();
    punchGain.gain.setValueAtTime(boom.subGain * 0.3, time);
    punchGain.gain.setTargetAtTime(0, time, decay * 0.3);

    punch.connect(punchFilter);
    punchFilter.connect(punchGain);
    punchGain.connect(master);
    punch.start(time);
    punch.stop(time + decay + 1);

    // Third layer: very low distorted rumble tail
    const rumble = ctx.createOscillator();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(baseFreq * 0.7, time);
    rumble.frequency.exponentialRampToValueAtTime(8, time + decay * 1.5);

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 80;
    rumbleFilter.Q.value = 2;

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0, time);
    rumbleGain.gain.linearRampToValueAtTime(boom.crackGain * 0.4, time + 0.05);
    rumbleGain.gain.setTargetAtTime(0, time + 0.05, decay * 0.5);

    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(master);
    rumble.start(time);
    rumble.stop(time + decay * 1.5 + 1);

    this.nodes.push(
      { stop: () => { try { punch.stop(); punch.disconnect(); } catch {} } },
      { stop: () => { try { rumble.stop(); rumble.disconnect(); } catch {} } },
    );
  }

  // -----------------------------------------------------------------------
  // Core drone oscillator — sawtooth through lowpass with beat LFO
  // -----------------------------------------------------------------------
  private buildDroneOsc(
    ctx: AudioContext,
    output: GainNode,
    drone: DroneParams,
    duration: number,
    inverted: boolean,
    crescendoEnd?: number,
  ) {
    const now = ctx.currentTime;
    const end = now + duration;
    // Peak moment: where frequency and filter reach maximum
    const peak = crescendoEnd ? now + duration * crescendoEnd : now + duration * 0.75;
    const fadeLen = (end - peak);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    if (inverted) {
      osc.frequency.setValueAtTime(drone.freqStart, now);
      osc.frequency.linearRampToValueAtTime(drone.freqEnd, end);
    } else {
      // Rise from freqStart to freqEnd at peak, then descend
      osc.frequency.setValueAtTime(drone.freqStart, now);
      osc.frequency.linearRampToValueAtTime(drone.freqEnd, peak);
      osc.frequency.setTargetAtTime(drone.freqStart * 0.5, peak, fadeLen * 0.25);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    if (inverted) {
      filter.Q.value = 2;
      filter.frequency.setValueAtTime(drone.freqEnd * 4, now);
      filter.frequency.linearRampToValueAtTime(drone.freqStart * 3, end);
    } else {
      // Q rises — more resonant/aggressive toward peak
      filter.Q.setValueAtTime(1, now);
      filter.Q.linearRampToValueAtTime(6, peak);
      filter.Q.setTargetAtTime(1, peak, fadeLen * 0.2);
      // Filter opens wide at peak
      filter.frequency.setValueAtTime(drone.freqStart * 3, now);
      filter.frequency.linearRampToValueAtTime(drone.freqEnd * 5, peak);
      filter.frequency.setTargetAtTime(80, peak, fadeLen * 0.2);
    }

    // Beat LFO — pulsing
    const beatGain = ctx.createGain();
    beatGain.gain.value = 0.7;

    const beatLfo = ctx.createOscillator();
    beatLfo.type = 'sine';
    if (inverted) {
      beatLfo.frequency.setValueAtTime(drone.beatStart, now);
      beatLfo.frequency.linearRampToValueAtTime(drone.beatEnd, end);
    } else {
      beatLfo.frequency.setValueAtTime(drone.beatStart, now);
      beatLfo.frequency.linearRampToValueAtTime(drone.beatEnd, peak);
      beatLfo.frequency.setTargetAtTime(0.5, peak, fadeLen * 0.2);
    }

    const beatDepth = ctx.createGain();
    beatDepth.gain.value = 0.3;
    beatLfo.connect(beatDepth);
    beatDepth.connect(beatGain.gain);

    osc.connect(filter);
    filter.connect(beatGain);
    beatGain.connect(output);

    osc.start(now);
    beatLfo.start(now);

    this.nodes.push(
      { stop: () => { try { osc.stop(); osc.disconnect(); } catch {} } },
      { stop: () => { try { beatLfo.stop(); beatLfo.disconnect(); } catch {} } },
    );
  }

  // -----------------------------------------------------------------------
  // Sub-bass — sine at 30-50Hz (prince only)
  // -----------------------------------------------------------------------
  private buildSubBass(
    ctx: AudioContext,
    output: GainNode,
    _drone: DroneParams,
    duration: number,
    inverted: boolean,
  ) {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(inverted ? 50 : 30, now);
    osc.frequency.linearRampToValueAtTime(inverted ? 30 : 50, now + duration);

    const gain = ctx.createGain();
    if (inverted) {
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + duration * 0.8);
    } else {
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + duration * 0.7);
      gain.gain.setTargetAtTime(0, now + duration * 0.7, duration * 0.1);
    }

    osc.connect(gain);
    gain.connect(output);
    osc.start(now);

    this.nodes.push(
      { stop: () => { try { osc.stop(); osc.disconnect(); } catch {} } },
    );
  }

  // -----------------------------------------------------------------------
  // Dissonant harmonics — irrational ratios (prince only)
  // -----------------------------------------------------------------------
  private buildDissonance(
    ctx: AudioContext,
    output: GainNode,
    drone: DroneParams,
    duration: number,
    inverted: boolean,
  ) {
    const now = ctx.currentTime;
    const baseFreq = inverted ? drone.freqEnd : drone.freqStart;
    const ratios = [1.414, 2.718];

    for (const ratio of ratios) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);
      osc.frequency.linearRampToValueAtTime(
        (inverted ? drone.freqStart : drone.freqEnd) * ratio,
        now + duration,
      );

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      if (inverted) {
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + duration * 0.7);
      } else {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0, now + duration * 0.3);
        gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.7);
        gain.gain.setTargetAtTime(0, now + duration * 0.7, duration * 0.1);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      osc.start(now);

      this.nodes.push(
        { stop: () => { try { osc.stop(); osc.disconnect(); } catch {} } },
      );
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  private stopImmediate(): void {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    for (const node of this.nodes) node.stop();
    this.nodes = [];

    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch {}
      this.masterGain = null;
    }

    this.playing = false;
  }
}

export const ritualDrone = new RitualDrone();
