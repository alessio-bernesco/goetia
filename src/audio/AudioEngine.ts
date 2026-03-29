// AudioEngine — WebAudio API initialization and node management
// All sound is generated, never from files.

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;

    // Resume context (required after user gesture)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  isReady(): boolean {
    return this.initialized && this.ctx !== null && this.ctx.state === 'running';
  }

  setMasterVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, value)),
        this.ctx!.currentTime,
        0.1,
      );
    }
  }

  destroy(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.initialized = false;
    }
  }
}

// Singleton
export const audioEngine = new AudioEngine();
