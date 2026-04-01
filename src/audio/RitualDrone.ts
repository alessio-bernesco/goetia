// RitualDrone — WebAudio synthesis for evocation and banishment sequences
// Generates rank-scaled drone textures: filtered sawtooth, beat LFO,
// optional sub-bass and dissonant harmonics (prince rank).

import { audioEngine } from './AudioEngine';
import {
  type DroneParams,
  getEvocationParams,
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
    const params = getEvocationParams(rank);
    const drone = params.drone;
    const duration = params.duration;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(master);

    const now = ctx.currentTime;

    // Envelope: fade-in 0.3s, crescendo to gainMax, long echo fadeout (2s exponential)
    const fadeoutStart = duration * 0.75; // start fading at 75% of duration
    const fadeoutDuration = duration - fadeoutStart;
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(drone.gainMax * 0.3, now + 0.3);
    this.masterGain.gain.linearRampToValueAtTime(drone.gainMax, now + fadeoutStart);
    // Exponential decay for echo-like fadeout (frequency also drops in buildDroneCore)
    this.masterGain.gain.setTargetAtTime(0, now + fadeoutStart, fadeoutDuration * 0.3);

    this.buildDroneCore(ctx, drone, duration, false);

    if (drone.hasSubBass) {
      this.buildSubBass(ctx, drone, duration, false);
    }
    if (drone.hasDissonance) {
      this.buildDissonance(ctx, drone, duration, false);
    }

    // Auto-stop after duration (extra buffer for exponential tail)
    this.stopTimeout = setTimeout(() => {
      this.stopImmediate();
    }, duration * 1000 + 500);
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

    // Envelope: fade-in 0.3s, crescendo, then fade-out or abrupt cut
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(drone.gainMax * 0.3, now + 0.3);
    this.masterGain.gain.linearRampToValueAtTime(drone.gainMax, now + duration * 0.7);

    if (abruptSilence) {
      // Hold until near the end, then hard cut in 10ms
      const cutTime = now + duration - 0.02;
      this.masterGain.gain.linearRampToValueAtTime(drone.gainMax, cutTime);
      this.masterGain.gain.setValueAtTime(drone.gainMax, cutTime);
      this.masterGain.gain.linearRampToValueAtTime(0, cutTime + 0.01);
    } else {
      // Gradual fade-out
      this.masterGain.gain.linearRampToValueAtTime(0, now + duration);
    }

    // Banishment: inverted — frequency descends, beat decelerates
    this.buildDroneCore(ctx, drone, duration, true);

    if (drone.hasSubBass) {
      this.buildSubBass(ctx, drone, duration, true);
    }
    if (drone.hasDissonance) {
      this.buildDissonance(ctx, drone, duration, true);
    }

    // Auto-stop after duration
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

    // Graceful fade-out over 0.5s
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
  // Core drone — sawtooth through lowpass with beat LFO
  // -----------------------------------------------------------------------
  private buildDroneCore(ctx: AudioContext, drone: DroneParams, duration: number, inverted: boolean) {
    const now = ctx.currentTime;
    const fadeoutStart = duration * 0.75;

    // Sawtooth oscillator
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    if (inverted) {
      // Banishment: straight descent
      osc.frequency.setValueAtTime(drone.freqStart, now);
      osc.frequency.linearRampToValueAtTime(drone.freqEnd, now + duration);
    } else {
      // Evocation: rise to peak, then drop during echo fadeout
      osc.frequency.setValueAtTime(drone.freqStart, now);
      osc.frequency.linearRampToValueAtTime(drone.freqEnd, now + fadeoutStart);
      // Echo die-out: frequency drops to 60% of start (deep rumble fading)
      osc.frequency.setTargetAtTime(drone.freqStart * 0.6, now + fadeoutStart, (duration - fadeoutStart) * 0.4);
    }

    // Low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2;
    if (inverted) {
      filter.frequency.setValueAtTime(drone.freqEnd * 4, now);
      filter.frequency.linearRampToValueAtTime(drone.freqStart * 3, now + duration);
    } else {
      // Evocation: opens up, then closes during echo fadeout (muffled decay)
      filter.frequency.setValueAtTime(drone.freqStart * 4, now);
      filter.frequency.linearRampToValueAtTime(drone.freqEnd * 4, now + fadeoutStart);
      filter.frequency.setTargetAtTime(80, now + fadeoutStart, (duration - fadeoutStart) * 0.3);
    }

    // Beat LFO — modulates gain to create pulsing
    const beatGain = ctx.createGain();
    beatGain.gain.value = 0.7;

    const beatLfo = ctx.createOscillator();
    beatLfo.type = 'sine';
    if (inverted) {
      beatLfo.frequency.setValueAtTime(drone.beatStart, now);
      beatLfo.frequency.linearRampToValueAtTime(drone.beatEnd, now + duration);
    } else {
      // Evocation: accelerate to peak, then decelerate during echo
      beatLfo.frequency.setValueAtTime(drone.beatStart, now);
      beatLfo.frequency.linearRampToValueAtTime(drone.beatEnd, now + fadeoutStart);
      beatLfo.frequency.setTargetAtTime(0.5, now + fadeoutStart, (duration - fadeoutStart) * 0.3);
    }

    const beatDepth = ctx.createGain();
    beatDepth.gain.value = 0.3;
    beatLfo.connect(beatDepth);
    beatDepth.connect(beatGain.gain);

    // Signal chain: osc → filter → beatGain → masterGain
    osc.connect(filter);
    filter.connect(beatGain);
    beatGain.connect(this.masterGain!);

    osc.start(now);
    beatLfo.start(now);

    this.nodes.push(
      { stop: () => { try { osc.stop(); osc.disconnect(); } catch {} } },
      { stop: () => { try { beatLfo.stop(); beatLfo.disconnect(); } catch {} } },
    );
  }

  // -----------------------------------------------------------------------
  // Sub-bass — sine at 30-50Hz, gain crescendo (prince only)
  // -----------------------------------------------------------------------
  private buildSubBass(ctx: AudioContext, _drone: DroneParams, duration: number, inverted: boolean) {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(inverted ? 50 : 30, now);
    osc.frequency.linearRampToValueAtTime(inverted ? 30 : 50, now + duration);

    const gain = ctx.createGain();
    if (inverted) {
      // Banishment: start present, fade out
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + duration * 0.8);
    } else {
      // Evocation: crescendo in
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + duration * 0.8);
    }

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);

    this.nodes.push(
      { stop: () => { try { osc.stop(); osc.disconnect(); } catch {} } },
    );
  }

  // -----------------------------------------------------------------------
  // Dissonant harmonics — irrational ratios of base freq (prince only)
  // -----------------------------------------------------------------------
  private buildDissonance(ctx: AudioContext, drone: DroneParams, duration: number, inverted: boolean) {
    const now = ctx.currentTime;
    const baseFreq = inverted ? drone.freqEnd : drone.freqStart;
    const ratios = [1.414, 2.718]; // sqrt(2) and e — maximally irrational

    for (const ratio of ratios) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);
      osc.frequency.linearRampToValueAtTime(
        (inverted ? drone.freqStart : drone.freqEnd) * ratio,
        now + duration,
      );

      // Low-pass to tame the harshness
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      if (inverted) {
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + duration * 0.7);
      } else {
        // Enter gradually
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0, now + duration * 0.3);
        gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.8);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
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
