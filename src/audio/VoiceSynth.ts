// VoiceSynth — generative voice synthesis
// Short, rhythmic, with pauses, interruptions, pitch shifts.

import { audioEngine } from './AudioEngine';

interface VoiceParams {
  baseFrequency: number;
  formants: number[];
  breathiness: number;
  speed: number;
}

export class VoiceSynth {
  private speaking = false;
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  async speak(text: string, params: VoiceParams): Promise<void> {
    const ctx = audioEngine.getContext();
    const master = audioEngine.getMasterGain();
    if (!ctx || !master || this.speaking) return;

    this.speaking = true;

    // Duration: 4-5s for short texts, 10-12s for long ones
    const wordCount = text.split(/\s+/).length;
    const duration = Math.min(3 + wordCount * 0.3, 12) / params.speed;

    // Build irregular rhythm that fills the entire duration
    const burstCount = Math.min(Math.max(5, Math.floor(wordCount / 2)), 20);

    // Generate raw timing, then scale to fit duration
    const rawEvents: { offset: number; len: number }[] = [];
    let rawTotal = 0;
    for (let i = 0; i < burstCount; i++) {
      const isLong = Math.random() > 0.6;
      const burstLen = isLong ? 0.3 + Math.random() * 0.5 : 0.08 + Math.random() * 0.15;

      const pauseRoll = Math.random();
      const gap = pauseRoll < 0.3
        ? 0.05 + Math.random() * 0.1
        : pauseRoll < 0.7
          ? 0.2 + Math.random() * 0.4
          : 0.5 + Math.random() * 1.0;

      rawEvents.push({ offset: rawTotal, len: burstLen });
      rawTotal += burstLen + gap;
    }

    // Scale to fit actual duration
    const scale = rawTotal > 0 ? duration / rawTotal : 1;

    for (let i = 0; i < rawEvents.length; i++) {
      const startTime = rawEvents[i].offset * scale;
      const burstLen = rawEvents[i].len * scale;
      const burst = i;
      const t = setTimeout(() => {
        this.playBurst(ctx, master, params, burstLen, burst, burstCount);
      }, startTime * 1000);
      this.timeouts.push(t);
    }

    // Cleanup
    const t = setTimeout(() => {
      this.speaking = false;
      this.timeouts = [];
    }, (duration + 0.5) * 1000);
    this.timeouts.push(t);
  }

  private playBurst(
    ctx: AudioContext,
    master: GainNode,
    params: VoiceParams,
    duration: number,
    burstIndex: number,
    _totalBursts: number,
  ) {
    const now = ctx.currentTime;

    // Pitch varies per burst — rising or falling contour
    const pitchVariation = 1 + (Math.random() - 0.5) * 0.3;
    const baseFreq = params.baseFrequency * pitchVariation;

    // Occasional pitch jump (like emphasis or question)
    const emphasis = Math.random() > 0.7 ? 1.3 : 1.0;

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    voiceGain.connect(master);

    // Voice oscillators — 2-3 harmonics
    const oscillators: OscillatorNode[] = [];
    const harmonicCount = 2 + (burstIndex % 2);
    for (let h = 1; h <= harmonicCount; h++) {
      const osc = ctx.createOscillator();
      osc.type = h === 1 ? 'sawtooth' : 'triangle';
      osc.frequency.value = baseFreq * h * emphasis;
      osc.detune.value = (Math.random() - 0.5) * 20;

      const hGain = ctx.createGain();
      hGain.gain.value = 0.2 / h;
      osc.connect(hGain);
      hGain.connect(voiceGain);

      osc.start(now);
      osc.stop(now + duration);
      oscillators.push(osc);
    }

    // Formant filter — one dominant formant per burst
    const formantIdx = burstIndex % params.formants.length;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = params.formants[formantIdx] * (0.9 + Math.random() * 0.2);
    filter.Q.value = 6;
    voiceGain.connect(filter);

    const filterGain = ctx.createGain();
    filterGain.gain.value = 0.5;
    filter.connect(filterGain);
    filterGain.connect(master);

    // Breath noise per burst
    if (params.breathiness > 0.1) {
      const bufferSize = ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * params.breathiness;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.08;
      noise.connect(noiseGain);
      noiseGain.connect(voiceGain);
      noise.start(now);
      noise.stop(now + duration);
    }

    // Envelope: sharp attack, sustain, sharp decay
    const attack = 0.02;
    const decay = duration * 0.3;
    const peakGain = 0.2 + Math.random() * 0.1;

    voiceGain.gain.setTargetAtTime(peakGain, now, attack);
    voiceGain.gain.setTargetAtTime(peakGain * 0.6, now + duration * 0.3, 0.05);
    voiceGain.gain.setTargetAtTime(0, now + duration - decay, decay * 0.3);
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  stop(): void {
    for (const t of this.timeouts) clearTimeout(t);
    this.timeouts = [];
    this.speaking = false;
  }
}

export const voiceSynth = new VoiceSynth();
