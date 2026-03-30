// VoiceSynth — text-aware formant synthesizer with ring modulation
// Parses text into phoneme timeline, drives formant filters in sync with text.
// Each demon has unique timbre via baseFrequency, formants, breathiness, speed.

import { audioEngine } from './AudioEngine';

interface VoiceParams {
  baseFrequency: number;
  formants: number[];
  breathiness: number;
  speed: number;
}

// ---------------------------------------------------------------------------
// Phoneme model
// ---------------------------------------------------------------------------

type PhonemeType = 'vowel' | 'fricative' | 'plosive' | 'nasal' | 'liquid' | 'silence';

interface PhonemeEvent {
  type: PhonemeType;
  f1: number;
  f2: number;
  f3: number;
  duration: number;  // seconds (before speed scaling)
  gain: number;      // 0-1
  noise: number;     // 0-1
  startTime: number; // computed
}

interface PhonemeDef {
  type: PhonemeType;
  f1: number;
  f2: number;
  f3: number;
  duration: number;
  gain: number;
  noise: number;
}

const PHONEME_MAP: Record<string, PhonemeDef> = {
  // Vowels
  'a': { type: 'vowel', f1: 700, f2: 1220, f3: 2600, duration: 0.10, gain: 1.0, noise: 0 },
  'à': { type: 'vowel', f1: 700, f2: 1220, f3: 2600, duration: 0.12, gain: 1.0, noise: 0 },
  'e': { type: 'vowel', f1: 550, f2: 1770, f3: 2600, duration: 0.09, gain: 1.0, noise: 0 },
  'è': { type: 'vowel', f1: 550, f2: 1770, f3: 2600, duration: 0.10, gain: 1.0, noise: 0 },
  'é': { type: 'vowel', f1: 550, f2: 1770, f3: 2600, duration: 0.10, gain: 1.0, noise: 0 },
  'i': { type: 'vowel', f1: 280, f2: 2300, f3: 3500, duration: 0.07, gain: 0.9, noise: 0 },
  'ì': { type: 'vowel', f1: 280, f2: 2300, f3: 3500, duration: 0.09, gain: 0.9, noise: 0 },
  'í': { type: 'vowel', f1: 280, f2: 2300, f3: 3500, duration: 0.09, gain: 0.9, noise: 0 },
  'o': { type: 'vowel', f1: 600, f2: 1000, f3: 2600, duration: 0.10, gain: 1.0, noise: 0 },
  'ò': { type: 'vowel', f1: 600, f2: 1000, f3: 2600, duration: 0.12, gain: 1.0, noise: 0 },
  'ó': { type: 'vowel', f1: 600, f2: 1000, f3: 2600, duration: 0.12, gain: 1.0, noise: 0 },
  'u': { type: 'vowel', f1: 300, f2: 870, f3: 2250, duration: 0.09, gain: 0.9, noise: 0 },
  'ù': { type: 'vowel', f1: 300, f2: 870, f3: 2250, duration: 0.10, gain: 0.9, noise: 0 },
  'ú': { type: 'vowel', f1: 300, f2: 870, f3: 2250, duration: 0.10, gain: 0.9, noise: 0 },
  'y': { type: 'vowel', f1: 280, f2: 2300, f3: 3500, duration: 0.07, gain: 0.9, noise: 0 },

  // Fricatives
  's': { type: 'fricative', f1: 0, f2: 4000, f3: 5000, duration: 0.06, gain: 0.5, noise: 0.9 },
  'z': { type: 'fricative', f1: 0, f2: 3500, f3: 4500, duration: 0.06, gain: 0.5, noise: 0.8 },
  'f': { type: 'fricative', f1: 0, f2: 1500, f3: 2500, duration: 0.05, gain: 0.4, noise: 0.7 },
  'v': { type: 'fricative', f1: 200, f2: 1500, f3: 2500, duration: 0.05, gain: 0.5, noise: 0.5 },

  // Plosives (silent gap + micro-burst)
  'p': { type: 'plosive', f1: 0, f2: 0, f3: 0, duration: 0.04, gain: 0, noise: 0 },
  'b': { type: 'plosive', f1: 0, f2: 0, f3: 0, duration: 0.04, gain: 0, noise: 0 },
  't': { type: 'plosive', f1: 0, f2: 0, f3: 0, duration: 0.03, gain: 0, noise: 0 },
  'd': { type: 'plosive', f1: 0, f2: 0, f3: 0, duration: 0.04, gain: 0, noise: 0 },
  'k': { type: 'plosive', f1: 0, f2: 0, f3: 0, duration: 0.04, gain: 0, noise: 0 },
  'c': { type: 'plosive', f1: 0, f2: 0, f3: 0, duration: 0.04, gain: 0, noise: 0 },
  'g': { type: 'plosive', f1: 0, f2: 0, f3: 0, duration: 0.04, gain: 0, noise: 0 },
  'q': { type: 'plosive', f1: 0, f2: 0, f3: 0, duration: 0.04, gain: 0, noise: 0 },

  // Nasals
  'm': { type: 'nasal', f1: 300, f2: 1000, f3: 2500, duration: 0.06, gain: 0.7, noise: 0.1 },
  'n': { type: 'nasal', f1: 250, f2: 1500, f3: 2500, duration: 0.06, gain: 0.7, noise: 0.1 },

  // Liquids
  'l': { type: 'liquid', f1: 350, f2: 1200, f3: 2800, duration: 0.05, gain: 0.6, noise: 0.05 },
  'r': { type: 'liquid', f1: 300, f2: 1500, f3: 2500, duration: 0.05, gain: 0.6, noise: 0.05 },

  // Semi-silent
  'h': { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.03, gain: 0, noise: 0.3 },
  'w': { type: 'liquid', f1: 300, f2: 870, f3: 2250, duration: 0.04, gain: 0.5, noise: 0 },
  'x': { type: 'fricative', f1: 0, f2: 3000, f3: 4000, duration: 0.06, gain: 0.4, noise: 0.6 },
  'j': { type: 'liquid', f1: 280, f2: 2300, f3: 3500, duration: 0.04, gain: 0.5, noise: 0 },

  // Punctuation and whitespace
  ' ':  { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.06, gain: 0, noise: 0 },
  ',':  { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.18, gain: 0, noise: 0 },
  ';':  { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.18, gain: 0, noise: 0 },
  ':':  { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.15, gain: 0, noise: 0 },
  '.':  { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.30, gain: 0, noise: 0 },
  '!':  { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.30, gain: 0, noise: 0 },
  '?':  { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.30, gain: 0, noise: 0 },
  '—':  { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.25, gain: 0, noise: 0 },
  '-':  { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.10, gain: 0, noise: 0 },
  '\n': { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.20, gain: 0, noise: 0 },
  '\'': { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.02, gain: 0, noise: 0 },
  '\u2019': { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.02, gain: 0, noise: 0 },
  '\u2018': { type: 'silence', f1: 0, f2: 0, f3: 0, duration: 0.02, gain: 0, noise: 0 },
};

// Default consonant for unrecognized chars
const DEFAULT_PHONEME: PhonemeDef = {
  type: 'plosive', f1: 0, f2: 0, f3: 0, duration: 0.03, gain: 0, noise: 0,
};

// Reference formants for scaling
const REF_FORMANTS = [600, 1200, 2600];

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseToPhonemes(text: string, speed: number): PhonemeEvent[] {
  const lower = text.toLowerCase();
  const events: PhonemeEvent[] = [];
  let cursor = 0;
  let i = 0;

  while (i < lower.length) {
    const char = lower[i];
    const nextChar = i + 1 < lower.length ? lower[i + 1] : '';

    // Handle Italian digraphs
    if ((char === 'c' || char === 'g') && nextChar === 'h') {
      events.push({ ...DEFAULT_PHONEME, duration: DEFAULT_PHONEME.duration / speed, startTime: cursor });
      cursor += DEFAULT_PHONEME.duration / speed;
      i += 2;
      continue;
    }

    const def = PHONEME_MAP[char] ?? DEFAULT_PHONEME;
    let duration = def.duration / speed;

    // Double consonants — extend duration (important for Italian)
    if (char === nextChar && def.type !== 'vowel' && def.type !== 'silence') {
      duration *= 1.5;
      i++; // skip the second
    }

    events.push({
      type: def.type,
      f1: def.f1,
      f2: def.f2,
      f3: def.f3,
      duration,
      gain: def.gain,
      noise: def.noise,
      startTime: cursor,
    });

    cursor += duration;
    i++;
  }

  return events;
}

// ---------------------------------------------------------------------------
// Synthesizer
// ---------------------------------------------------------------------------

export class VoiceSynth {
  private speaking = false;
  private nodes: { stop: () => void }[] = [];
  private cleanupTimeout: ReturnType<typeof setTimeout> | null = null;

  async speak(text: string, params: VoiceParams): Promise<void> {
    const ctx = audioEngine.getContext();
    const master = audioEngine.getMasterGain();
    if (!ctx || !master) return;

    // Stop any current speech first
    if (this.speaking) this.stop();
    this.speaking = true;

    const phonemes = parseToPhonemes(text, params.speed);
    if (phonemes.length === 0) { this.speaking = false; return; }

    const totalDuration = phonemes[phonemes.length - 1].startTime + phonemes[phonemes.length - 1].duration + 0.5;
    const now = ctx.currentTime;

    // Formant scale factors (per-demon timbre)
    const fScale = [
      params.formants[0] / REF_FORMANTS[0],
      params.formants[1] / REF_FORMANTS[1],
      params.formants[2] / REF_FORMANTS[2],
    ];

    // === Main oscillator (sawtooth — bright, synthetic) ===
    const mainOsc = ctx.createOscillator();
    mainOsc.type = 'sawtooth';
    mainOsc.frequency.value = params.baseFrequency;

    // === Ring modulator (metallic quality) ===
    const ringOsc = ctx.createOscillator();
    ringOsc.type = 'sine';
    ringOsc.frequency.value = params.formants[0] * 0.3 + params.baseFrequency * 0.5;
    const ringGain = ctx.createGain();
    ringGain.gain.value = 0;
    mainOsc.connect(ringGain);
    ringOsc.connect(ringGain.gain);

    // === Vibrato ===
    const vibratoOsc = ctx.createOscillator();
    vibratoOsc.type = 'sine';
    vibratoOsc.frequency.value = 4 + Math.random() * 2;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.value = params.baseFrequency * 0.018;
    vibratoOsc.connect(vibratoDepth);
    vibratoDepth.connect(mainOsc.frequency);

    // === Three formant bandpass filters ===
    const filters = params.formants.map((f, _i) => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = f;
      filter.Q.value = 6;
      return filter;
    });

    // === Formant mix ===
    const formantMix = ctx.createGain();
    formantMix.gain.value = 0.35;
    for (const filter of filters) {
      ringGain.connect(filter);
      filter.connect(formantMix);
    }

    // === Direct signal (body, bypassing formants) ===
    const directGain = ctx.createGain();
    directGain.gain.value = 0.08;
    ringGain.connect(directGain);

    // === Noise source (for fricatives) ===
    const noiseBufSize = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, noiseBufSize, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let j = 0; j < noiseBufSize; j++) {
      noiseData[j] = (Math.random() * 2 - 1);
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 3000;
    noiseFilter.Q.value = 2;
    noiseSrc.connect(noiseFilter);
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noiseFilter.connect(noiseGain);

    // === Voice master gain (overall envelope) ===
    const voiceMaster = ctx.createGain();
    voiceMaster.gain.value = 0;
    formantMix.connect(voiceMaster);
    directGain.connect(voiceMaster);
    noiseGain.connect(voiceMaster);
    voiceMaster.connect(master);

    // === Schedule all phoneme events ===
    const glide = 0.025;    // formant transition time constant
    const attack = 0.015;   // gain attack
    const release = 0.025;  // gain release

    for (const ev of phonemes) {
      const t = now + ev.startTime;

      if (ev.type === 'vowel' || ev.type === 'nasal' || ev.type === 'liquid') {
        // Animate formants
        if (ev.f1 > 0) filters[0].frequency.setTargetAtTime(ev.f1 * fScale[0], t, glide);
        if (ev.f2 > 0) filters[1].frequency.setTargetAtTime(ev.f2 * fScale[1], t, glide);
        if (ev.f3 > 0) filters[2].frequency.setTargetAtTime(ev.f3 * fScale[2], t, glide);

        // Gain envelope: soft attack → sustain → soft release
        voiceMaster.gain.setTargetAtTime(ev.gain * 0.25, t, attack);
        voiceMaster.gain.setTargetAtTime(0, t + ev.duration - release * 2, release);

        // Noise off for voiced sounds
        noiseGain.gain.setTargetAtTime(ev.noise * params.breathiness * 0.15, t, 0.01);

      } else if (ev.type === 'fricative') {
        // Quiet voice, loud noise
        voiceMaster.gain.setTargetAtTime(ev.gain * 0.12, t, attack);
        noiseGain.gain.setTargetAtTime(ev.noise * 0.2, t, 0.008);
        // Sweep noise filter to fricative character
        if (ev.f2 > 0) noiseFilter.frequency.setTargetAtTime(ev.f2, t, 0.01);
        voiceMaster.gain.setTargetAtTime(0, t + ev.duration - release, release);
        noiseGain.gain.setTargetAtTime(0, t + ev.duration, 0.01);

      } else if (ev.type === 'plosive') {
        // Silent gap, then micro-burst
        voiceMaster.gain.setTargetAtTime(0, t, 0.005);
        noiseGain.gain.setTargetAtTime(0, t, 0.005);
        // Tiny burst at end of plosive
        voiceMaster.gain.setTargetAtTime(0.15, t + ev.duration * 0.7, 0.005);
        voiceMaster.gain.setTargetAtTime(0, t + ev.duration, 0.008);

      } else {
        // Silence (spaces, punctuation)
        voiceMaster.gain.setTargetAtTime(0, t, 0.02);
        noiseGain.gain.setTargetAtTime(0, t, 0.01);
      }
    }

    // === Start everything ===
    const endTime = now + totalDuration;
    mainOsc.start(now);
    mainOsc.stop(endTime);
    ringOsc.start(now);
    ringOsc.stop(endTime);
    vibratoOsc.start(now);
    vibratoOsc.stop(endTime);
    noiseSrc.start(now);
    noiseSrc.stop(endTime);

    this.nodes = [
      { stop: () => { try { mainOsc.stop(); } catch {} } },
      { stop: () => { try { ringOsc.stop(); } catch {} } },
      { stop: () => { try { vibratoOsc.stop(); } catch {} } },
      { stop: () => { try { noiseSrc.stop(); } catch {} } },
    ];

    this.cleanupTimeout = setTimeout(() => {
      this.speaking = false;
      this.nodes = [];
      this.cleanupTimeout = null;
    }, totalDuration * 1000 + 500);
  }

  /** Get estimated duration for a text at given speed. */
  getDuration(text: string, speed: number): number {
    const phonemes = parseToPhonemes(text, speed);
    if (phonemes.length === 0) return 0;
    const last = phonemes[phonemes.length - 1];
    return last.startTime + last.duration;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  stop(): void {
    for (const node of this.nodes) node.stop();
    if (this.cleanupTimeout) clearTimeout(this.cleanupTimeout);
    this.nodes = [];
    this.speaking = false;
    this.cleanupTimeout = null;
  }
}

export const voiceSynth = new VoiceSynth();
