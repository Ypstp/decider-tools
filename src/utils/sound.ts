import { SoundTheme } from '../types';

export type SoundType =
  | 'click'
  | 'tick'
  | 'spin'
  | 'dice'
  | 'coin'
  | 'win'
  | 'copy'
  | 'cupSlide'
  | 'cardFlip'
  | 'wrong';

interface SoundEngine {
  ctx: AudioContext;
  master: GainNode;
  dryBus: GainNode;
  wetBus: GainNode;
  noiseBuffer: AudioBuffer;
}

let engine: SoundEngine | null = null;
let lastTickMs = 0;
let currentVolume = 0.8;
let currentTheme: SoundTheme = 'classic';

export function setSoundTheme(theme: SoundTheme): void {
  currentTheme = theme;
}

export function setMasterVolume(volumePercent: number): void {
  const clamped = Math.max(0, Math.min(100, volumePercent)) / 100;
  currentVolume = clamped;
  if (engine) {
    engine.master.gain.setTargetAtTime(clamped * 0.9, engine.ctx.currentTime, 0.02);
  }
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 1.0);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createRoomImpulse(ctx: AudioContext, duration = 0.95, decay = 3.2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const channelData = impulse.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      const white = (Math.random() * 2 - 1) * env;
      lp = lp * 0.72 + white * 0.28;
      channelData[i] = lp;
    }
  }
  return impulse;
}

function getEngine(): SoundEngine | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!engine) {
    const ctx = new Ctx();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-16, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    compressor.release.setValueAtTime(0.18, ctx.currentTime);

    const master = ctx.createGain();
    master.gain.setValueAtTime(currentVolume * 0.9, ctx.currentTime);

    const dryBus = ctx.createGain();
    dryBus.gain.setValueAtTime(1.0, ctx.currentTime);

    const wetBus = ctx.createGain();
    wetBus.gain.setValueAtTime(0.24, ctx.currentTime);

    const convolver = ctx.createConvolver();
    convolver.buffer = createRoomImpulse(ctx, 0.95, 3.4);

    dryBus.connect(master);
    wetBus.connect(convolver);
    convolver.connect(master);

    master.connect(compressor);
    compressor.connect(ctx.destination);

    engine = {
      ctx,
      master,
      dryBus,
      wetBus,
      noiseBuffer: createNoiseBuffer(ctx),
    };
  }

  if (engine.ctx.state === 'suspended') {
    engine.ctx.resume().catch(() => {});
  }

  return engine;
}

function triggerNoiseBurst(
  eng: SoundEngine,
  opts: {
    delay?: number;
    duration: number;
    filterType: BiquadFilterType;
    freq: number;
    endFreq?: number;
    q?: number;
    gain: number;
    attack?: number;
    pan?: number;
    wet?: number;
  }
) {
  const { ctx, dryBus, wetBus, noiseBuffer } = eng;
  const start = ctx.currentTime + (opts.delay ?? 0);
  const end = start + opts.duration;
  const attack = opts.attack ?? 0.002;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.playbackRate.setValueAtTime(0.9 + Math.random() * 0.2, start);

  const filter = ctx.createBiquadFilter();
  filter.type = opts.filterType;
  filter.frequency.setValueAtTime(opts.freq, start);
  if (opts.endFreq) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.endFreq), end);
  }
  filter.Q.setValueAtTime(opts.q ?? 1.5, start);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.linearRampToValueAtTime(opts.gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  src.connect(filter);
  filter.connect(env);

  let target: AudioNode = env;
  if (opts.pan !== undefined && typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), start);
    env.connect(panner);
    target = panner;
  }

  target.connect(dryBus);
  if ((opts.wet ?? 0) > 0) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(opts.wet!, start);
    target.connect(send);
    send.connect(wetBus);
  }

  src.start(start);
  src.stop(end + 0.02);
}

function triggerMarimbaNote(
  eng: SoundEngine,
  opts: {
    freq: number;
    delay?: number;
    duration: number;
    gain: number;
    brightness?: number;
    pan?: number;
    wet?: number;
  }
) {
  const { ctx, dryBus, wetBus } = eng;
  const start = ctx.currentTime + (opts.delay ?? 0);
  const end = start + opts.duration;

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(opts.freq, start);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(opts.freq * 2, start);

  const env1 = ctx.createGain();
  env1.gain.setValueAtTime(0.0001, start);
  env1.gain.linearRampToValueAtTime(opts.gain, start + 0.006);
  env1.gain.exponentialRampToValueAtTime(0.0001, end);

  const env2 = ctx.createGain();
  env2.gain.setValueAtTime(0.0001, start);
  env2.gain.linearRampToValueAtTime(opts.gain * (opts.brightness ?? 0.22), start + 0.004);
  env2.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration * 0.45);

  const mix = ctx.createGain();
  mix.gain.setValueAtTime(1, start);

  osc1.connect(env1);
  osc2.connect(env2);
  env1.connect(mix);
  env2.connect(mix);

  let outNode: AudioNode = mix;
  if (opts.pan !== undefined && typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), start);
    mix.connect(panner);
    outNode = panner;
  }

  outNode.connect(dryBus);
  if ((opts.wet ?? 0.5) > 0) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(opts.wet ?? 0.5, start);
    outNode.connect(send);
    send.connect(wetBus);
  }

  osc1.start(start);
  osc2.start(start);
  osc1.stop(end + 0.02);
  osc2.stop(end + 0.02);

  triggerNoiseBurst(eng, {
    delay: opts.delay ?? 0,
    duration: 0.012,
    filterType: 'bandpass',
    freq: Math.min(2600, opts.freq * 2.2),
    q: 2.2,
    gain: opts.gain * 0.25,
    attack: 0.001,
    pan: opts.pan,
  });
}

function triggerWoodBody(
  eng: SoundEngine,
  opts: {
    freq: number;
    endFreq: number;
    delay?: number;
    duration: number;
    gain: number;
    pan?: number;
    wet?: number;
  }
) {
  const { ctx, dryBus, wetBus } = eng;
  const start = ctx.currentTime + (opts.delay ?? 0);
  const end = start + opts.duration;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(opts.freq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(45, opts.endFreq), end);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.linearRampToValueAtTime(opts.gain, start + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(env);

  let outNode: AudioNode = env;
  if (opts.pan !== undefined && typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), start);
    env.connect(panner);
    outNode = panner;
  }

  outNode.connect(dryBus);
  if ((opts.wet ?? 0) > 0) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(opts.wet!, start);
    outNode.connect(send);
    send.connect(wetBus);
  }

  osc.start(start);
  osc.stop(end + 0.015);
}

function triggerTone(
  eng: SoundEngine,
  opts: {
    wave?: OscillatorType;
    freq: number;
    endFreq?: number;
    delay?: number;
    duration: number;
    gain: number;
    attack?: number;
    pan?: number;
    wet?: number;
  }
) {
  const { ctx, dryBus, wetBus } = eng;
  const start = ctx.currentTime + (opts.delay ?? 0);
  const end = start + opts.duration;
  const attack = opts.attack ?? 0.004;

  const osc = ctx.createOscillator();
  osc.type = opts.wave ?? 'sine';
  osc.frequency.setValueAtTime(Math.max(40, opts.freq), start);
  if (opts.endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.endFreq), end);
  }

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.linearRampToValueAtTime(opts.gain, start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(env);

  let outNode: AudioNode = env;
  if (opts.pan !== undefined && typeof ctx.createStereoPanner === 'function') {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), start);
    env.connect(panner);
    outNode = panner;
  }

  outNode.connect(dryBus);
  if ((opts.wet ?? 0) > 0) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(opts.wet!, start);
    outNode.connect(send);
    send.connect(wetBus);
  }

  osc.start(start);
  osc.stop(end + 0.02);
}

function triggerKalimbaNote(
  eng: SoundEngine,
  opts: {
    freq: number;
    delay?: number;
    duration: number;
    gain: number;
    pan?: number;
    wet?: number;
  }
) {
  // Warm wooden tine fundamental + subtle 3rd harmonic pluck
  triggerTone(eng, {
    wave: 'sine',
    freq: opts.freq,
    delay: opts.delay,
    duration: opts.duration,
    gain: opts.gain,
    attack: 0.005,
    pan: opts.pan,
    wet: opts.wet ?? 0.65,
  });
  triggerTone(eng, {
    wave: 'triangle',
    freq: opts.freq * 2.98,
    delay: opts.delay,
    duration: opts.duration * 0.28,
    gain: opts.gain * 0.22,
    attack: 0.002,
    pan: opts.pan,
    wet: (opts.wet ?? 0.65) * 0.6,
  });
}

function playMinimalSound(eng: SoundEngine, type: SoundType, pitchOffset: number) {
  if (type === 'click') {
    triggerTone(eng, {
      wave: 'sine',
      freq: 520,
      endFreq: 280,
      duration: 0.024,
      gain: 0.032,
      attack: 0.002,
      wet: 0.08,
    });
  } else if (type === 'tick') {
    const p = Math.min(1, Math.max(0, pitchOffset));
    triggerTone(eng, {
      wave: 'sine',
      freq: 980 + p * 340,
      endFreq: 640,
      duration: 0.014,
      gain: 0.028,
      attack: 0.001,
      wet: 0.05,
    });
  } else if (type === 'spin') {
    triggerNoiseBurst(eng, {
      duration: 0.14,
      filterType: 'bandpass',
      freq: 420,
      endFreq: 960,
      q: 1.2,
      gain: 0.036,
      attack: 0.03,
      wet: 0.2,
    });
  } else if (type === 'cupSlide') {
    triggerNoiseBurst(eng, {
      duration: 0.085,
      filterType: 'bandpass',
      freq: 700,
      endFreq: 1050,
      q: 1.4,
      gain: 0.026,
      attack: 0.012,
      wet: 0.12,
    });
  } else if (type === 'dice') {
    [
      { delay: 0.0, pan: -0.2, gain: 0.045, freq: 440 },
      { delay: 0.095, pan: 0.18, gain: 0.038, freq: 390 },
      { delay: 0.18, pan: -0.08, gain: 0.03, freq: 480 },
      { delay: 0.26, pan: 0.08, gain: 0.022, freq: 410 },
    ].forEach((b) => {
      triggerTone(eng, {
        wave: 'sine',
        freq: b.freq,
        endFreq: 170,
        delay: b.delay,
        duration: 0.032,
        gain: b.gain,
        attack: 0.002,
        pan: b.pan,
        wet: 0.12,
      });
    });
  } else if (type === 'coin') {
    triggerTone(eng, {
      wave: 'sine',
      freq: 987.77,
      duration: 0.28,
      gain: 0.03,
      attack: 0.003,
      wet: 0.3,
    });
    triggerTone(eng, {
      wave: 'sine',
      freq: 1975.53,
      duration: 0.16,
      gain: 0.012,
      attack: 0.002,
      wet: 0.3,
    });
  } else if (type === 'cardFlip') {
    triggerNoiseBurst(eng, {
      duration: 0.04,
      filterType: 'bandpass',
      freq: 1200,
      endFreq: 1800,
      q: 1.2,
      gain: 0.026,
      attack: 0.004,
      wet: 0.12,
    });
    triggerTone(eng, {
      wave: 'sine',
      freq: 659.25,
      delay: 0.025,
      duration: 0.13,
      gain: 0.032,
      wet: 0.2,
    });
  } else if (type === 'copy') {
    triggerTone(eng, { freq: 659.25, duration: 0.11, gain: 0.034, wet: 0.22 });
    triggerTone(eng, { freq: 880.0, delay: 0.055, duration: 0.16, gain: 0.038, wet: 0.25 });
  } else if (type === 'wrong') {
    triggerTone(eng, { freq: 329.63, duration: 0.13, gain: 0.035, wet: 0.18 });
    triggerTone(eng, { freq: 261.63, delay: 0.09, duration: 0.2, gain: 0.035, wet: 0.2 });
  } else if (type === 'win') {
    [
      { freq: 523.25, delay: 0.0, gain: 0.038 },
      { freq: 659.25, delay: 0.065, gain: 0.04 },
      { freq: 783.99, delay: 0.13, gain: 0.044 },
    ].forEach((n) => {
      triggerTone(eng, {
        wave: 'sine',
        freq: n.freq,
        delay: n.delay,
        duration: 0.34,
        gain: n.gain,
        attack: 0.006,
        wet: 0.35,
      });
    });
  }
}

function playArcadeSound(eng: SoundEngine, type: SoundType, pitchOffset: number) {
  if (type === 'click') {
    triggerTone(eng, {
      wave: 'square',
      freq: 660,
      endFreq: 990,
      duration: 0.036,
      gain: 0.028,
      attack: 0.002,
      wet: 0.06,
    });
  } else if (type === 'tick') {
    const p = Math.min(1, Math.max(0, pitchOffset));
    triggerTone(eng, {
      wave: 'square',
      freq: 480 + p * 520,
      duration: 0.024,
      gain: 0.026,
      attack: 0.001,
      wet: 0.04,
    });
  } else if (type === 'spin') {
    triggerTone(eng, {
      wave: 'square',
      freq: 220,
      endFreq: 880,
      duration: 0.16,
      gain: 0.03,
      attack: 0.004,
      wet: 0.12,
    });
  } else if (type === 'cupSlide') {
    triggerTone(eng, {
      wave: 'triangle',
      freq: 330 + Math.random() * 80,
      endFreq: 620,
      duration: 0.07,
      gain: 0.04,
      attack: 0.003,
      wet: 0.08,
    });
  } else if (type === 'dice') {
    [
      { delay: 0.0, freq: 392, pan: -0.2 },
      { delay: 0.07, freq: 523.25, pan: 0.2 },
      { delay: 0.14, freq: 440, pan: -0.1 },
      { delay: 0.21, freq: 587.33, pan: 0.1 },
      { delay: 0.28, freq: 659.25, pan: 0.0 },
    ].forEach((b) => {
      triggerTone(eng, {
        wave: 'square',
        freq: b.freq,
        endFreq: b.freq * 0.72,
        delay: b.delay,
        duration: 0.045,
        gain: 0.028,
        attack: 0.002,
        pan: b.pan,
        wet: 0.08,
      });
    });
  } else if (type === 'coin') {
    // Classic retro two-note coin pickup (B5 -> E6)
    triggerTone(eng, {
      wave: 'square',
      freq: 987.77,
      duration: 0.075,
      gain: 0.032,
      attack: 0.002,
      wet: 0.1,
    });
    triggerTone(eng, {
      wave: 'square',
      freq: 1318.51,
      delay: 0.07,
      duration: 0.28,
      gain: 0.034,
      attack: 0.002,
      wet: 0.15,
    });
  } else if (type === 'cardFlip') {
    triggerTone(eng, {
      wave: 'triangle',
      freq: 440,
      endFreq: 880,
      duration: 0.08,
      gain: 0.045,
      attack: 0.002,
      wet: 0.12,
    });
  } else if (type === 'copy') {
    triggerTone(eng, { wave: 'square', freq: 1046.5, duration: 0.07, gain: 0.028, wet: 0.1 });
    triggerTone(eng, {
      wave: 'square',
      freq: 1567.98,
      delay: 0.065,
      duration: 0.14,
      gain: 0.03,
      wet: 0.15,
    });
  } else if (type === 'wrong') {
    triggerTone(eng, {
      wave: 'sawtooth',
      freq: 311.13,
      endFreq: 261.63,
      duration: 0.14,
      gain: 0.028,
      wet: 0.1,
    });
    triggerTone(eng, {
      wave: 'sawtooth',
      freq: 233.08,
      endFreq: 155.56,
      delay: 0.13,
      duration: 0.24,
      gain: 0.03,
      wet: 0.12,
    });
  } else if (type === 'win') {
    const arp = [
      { freq: 523.25, delay: 0.0, dur: 0.09, pan: -0.2 },
      { freq: 659.25, delay: 0.07, dur: 0.09, pan: -0.08 },
      { freq: 783.99, delay: 0.14, dur: 0.09, pan: 0.08 },
      { freq: 1046.5, delay: 0.21, dur: 0.34, pan: 0.0 },
    ];
    arp.forEach((n) => {
      triggerTone(eng, {
        wave: 'square',
        freq: n.freq,
        delay: n.delay,
        duration: n.dur,
        gain: 0.03,
        attack: 0.002,
        pan: n.pan,
        wet: 0.18,
      });
      triggerTone(eng, {
        wave: 'triangle',
        freq: n.freq * 0.5,
        delay: n.delay,
        duration: n.dur,
        gain: 0.035,
        attack: 0.002,
        pan: n.pan,
        wet: 0.15,
      });
    });
  }
}

function playNatureSound(eng: SoundEngine, type: SoundType, pitchOffset: number) {
  if (type === 'click') {
    triggerWoodBody(eng, {
      freq: 440,
      endFreq: 250,
      duration: 0.04,
      gain: 0.055,
      wet: 0.32,
    });
    triggerTone(eng, {
      wave: 'sine',
      freq: 760,
      endFreq: 1120,
      duration: 0.025,
      gain: 0.02,
      attack: 0.002,
      wet: 0.4,
    });
  } else if (type === 'tick') {
    const p = Math.min(1, Math.max(0, pitchOffset));
    triggerTone(eng, {
      wave: 'sine',
      freq: 640 + p * 360,
      endFreq: 980 + p * 480,
      duration: 0.034,
      gain: 0.036,
      attack: 0.002,
      wet: 0.38,
    });
  } else if (type === 'spin') {
    triggerNoiseBurst(eng, {
      duration: 0.24,
      filterType: 'bandpass',
      freq: 340,
      endFreq: 920,
      q: 1.1,
      gain: 0.065,
      attack: 0.05,
      wet: 0.55,
    });
  } else if (type === 'cupSlide') {
    triggerNoiseBurst(eng, {
      duration: 0.12,
      filterType: 'lowpass',
      freq: 820,
      endFreq: 480,
      q: 1.0,
      gain: 0.045,
      attack: 0.02,
      wet: 0.4,
    });
    triggerWoodBody(eng, {
      freq: 360 + Math.random() * 60,
      endFreq: 210,
      duration: 0.05,
      gain: 0.04,
      wet: 0.3,
    });
  } else if (type === 'dice') {
    [
      { delay: 0.0, pan: -0.25, gain: 0.08, freq: 520 },
      { delay: 0.1, pan: 0.22, gain: 0.07, freq: 470 },
      { delay: 0.19, pan: -0.1, gain: 0.06, freq: 590 },
      { delay: 0.27, pan: 0.14, gain: 0.048, freq: 440 },
      { delay: 0.34, pan: 0.0, gain: 0.035, freq: 510 },
    ].forEach((b) => {
      triggerWoodBody(eng, {
        delay: b.delay,
        freq: b.freq + (Math.random() - 0.5) * 50,
        endFreq: 190,
        duration: 0.055,
        gain: b.gain,
        pan: b.pan,
        wet: 0.42,
      });
    });
  } else if (type === 'coin') {
    // Water-droplet chime + warm kalimba resonance
    triggerTone(eng, {
      wave: 'sine',
      freq: 784,
      endFreq: 1380,
      duration: 0.095,
      gain: 0.04,
      attack: 0.003,
      wet: 0.6,
    });
    triggerKalimbaNote(eng, {
      freq: 1174.66,
      delay: 0.03,
      duration: 0.36,
      gain: 0.038,
      wet: 0.65,
    });
  } else if (type === 'cardFlip') {
    triggerNoiseBurst(eng, {
      duration: 0.08,
      filterType: 'bandpass',
      freq: 750,
      endFreq: 1350,
      q: 1.0,
      gain: 0.042,
      attack: 0.01,
      wet: 0.45,
    });
    triggerKalimbaNote(eng, {
      freq: 587.33,
      delay: 0.03,
      duration: 0.26,
      gain: 0.05,
      wet: 0.55,
    });
  } else if (type === 'copy') {
    triggerTone(eng, {
      wave: 'sine',
      freq: 587.33,
      endFreq: 880,
      duration: 0.09,
      gain: 0.04,
      wet: 0.55,
    });
    triggerKalimbaNote(eng, {
      freq: 880,
      delay: 0.055,
      duration: 0.28,
      gain: 0.048,
      wet: 0.65,
    });
  } else if (type === 'wrong') {
    triggerWoodBody(eng, {
      freq: 261.63,
      endFreq: 185,
      duration: 0.14,
      gain: 0.065,
      wet: 0.45,
    });
    triggerWoodBody(eng, {
      delay: 0.11,
      freq: 207.65,
      endFreq: 146.83,
      duration: 0.19,
      gain: 0.06,
      wet: 0.5,
    });
  } else if (type === 'win') {
    // Tranquil D major pentatonic kalimba cascade
    const notes = [
      { freq: 587.33, delay: 0.0, pan: -0.25, gain: 0.05 },
      { freq: 739.99, delay: 0.065, pan: -0.1, gain: 0.05 },
      { freq: 880.0, delay: 0.13, pan: 0.05, gain: 0.055 },
      { freq: 987.77, delay: 0.195, pan: 0.18, gain: 0.05 },
      { freq: 1174.66, delay: 0.26, pan: 0.0, gain: 0.06 },
    ];
    notes.forEach((n) => {
      triggerKalimbaNote(eng, {
        freq: n.freq,
        delay: n.delay,
        duration: 0.52,
        gain: n.gain,
        pan: n.pan,
        wet: 0.72,
      });
    });
  }
}

function playClassicSound(eng: SoundEngine, type: SoundType, pitchOffset: number) {
  if (type === 'click') {
    triggerNoiseBurst(eng, {
      duration: 0.014,
      filterType: 'bandpass',
      freq: 1700,
      q: 1.8,
      gain: 0.045,
      wet: 0.15,
    });
    triggerWoodBody(eng, {
      freq: 380,
      endFreq: 210,
      duration: 0.032,
      gain: 0.05,
      wet: 0.12,
    });
  } else if (type === 'tick') {
    const p = Math.min(1, Math.max(0, pitchOffset));
    triggerNoiseBurst(eng, {
      duration: 0.01,
      filterType: 'bandpass',
      freq: 1950 + p * 650,
      q: 2.6,
      gain: 0.068,
      wet: 0.08,
    });
    triggerWoodBody(eng, {
      freq: 560 + p * 210,
      endFreq: 310,
      duration: 0.024,
      gain: 0.058,
      wet: 0.06,
    });
  } else if (type === 'spin') {
    triggerNoiseBurst(eng, {
      duration: 0.19,
      filterType: 'bandpass',
      freq: 520,
      endFreq: 1650,
      q: 1.4,
      gain: 0.075,
      attack: 0.035,
      wet: 0.35,
    });
    triggerWoodBody(eng, {
      freq: 220,
      endFreq: 390,
      duration: 0.14,
      gain: 0.058,
      wet: 0.24,
    });
  } else if (type === 'cupSlide') {
    triggerNoiseBurst(eng, {
      duration: 0.11,
      filterType: 'bandpass',
      freq: 920 + Math.random() * 280,
      endFreq: 1480,
      q: 1.8,
      gain: 0.045,
      attack: 0.015,
      wet: 0.2,
    });
    triggerWoodBody(eng, {
      freq: 460 + Math.random() * 90,
      endFreq: 260,
      duration: 0.04,
      gain: 0.038,
      wet: 0.15,
    });
  } else if (type === 'dice') {
    const bounces = [
      { delay: 0.0, pan: -0.25, gain: 0.105, freq: 3050, body: 355 },
      { delay: 0.105, pan: 0.22, gain: 0.095, freq: 2750, body: 325 },
      { delay: 0.195, pan: -0.1, gain: 0.082, freq: 3300, body: 385 },
      { delay: 0.275, pan: 0.15, gain: 0.068, freq: 2620, body: 310 },
      { delay: 0.34, pan: -0.05, gain: 0.052, freq: 2950, body: 340 },
      { delay: 0.395, pan: 0.04, gain: 0.038, freq: 2550, body: 300 },
    ];
    bounces.forEach((b) => {
      triggerNoiseBurst(eng, {
        delay: b.delay,
        duration: 0.015,
        filterType: 'bandpass',
        freq: b.freq + (Math.random() - 0.5) * 220,
        q: 2.5,
        gain: b.gain * 0.9,
        pan: b.pan,
        wet: 0.3,
      });
      triggerWoodBody(eng, {
        delay: b.delay,
        freq: b.body,
        endFreq: 150,
        duration: 0.045,
        gain: b.gain,
        pan: b.pan,
        wet: 0.25,
      });
    });
  } else if (type === 'coin') {
    triggerNoiseBurst(eng, {
      duration: 0.012,
      filterType: 'highpass',
      freq: 2200,
      q: 1.2,
      gain: 0.035,
      wet: 0.25,
    });
    const partials = [
      { freq: 1174.66, gain: 0.026, dur: 0.42 },
      { freq: 1792.0, gain: 0.016, dur: 0.36 },
      { freq: 2637.02, gain: 0.009, dur: 0.24 },
    ];
    partials.forEach((p) => {
      const { ctx, dryBus, wetBus } = eng;
      const start = ctx.currentTime + 0.008;
      const end = start + p.dur;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, start);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.linearRampToValueAtTime(p.gain, start + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, end);

      const send = ctx.createGain();
      send.gain.setValueAtTime(0.55, start);

      osc.connect(env);
      env.connect(dryBus);
      env.connect(send);
      send.connect(wetBus);

      osc.start(start);
      osc.stop(end + 0.02);
    });
  } else if (type === 'cardFlip') {
    triggerNoiseBurst(eng, {
      duration: 0.065,
      filterType: 'bandpass',
      freq: 1450,
      endFreq: 2400,
      q: 1.5,
      gain: 0.055,
      attack: 0.005,
      wet: 0.25,
    });
    triggerMarimbaNote(eng, {
      freq: 587.33,
      delay: 0.04,
      duration: 0.22,
      gain: 0.055,
      brightness: 0.25,
      wet: 0.45,
    });
  } else if (type === 'copy') {
    triggerMarimbaNote(eng, { freq: 698.46, duration: 0.16, gain: 0.055, wet: 0.45 });
    triggerMarimbaNote(eng, { freq: 880.0, delay: 0.06, duration: 0.24, gain: 0.06, wet: 0.55 });
  } else if (type === 'wrong') {
    triggerMarimbaNote(eng, { freq: 311.13, duration: 0.2, gain: 0.055, brightness: 0.15, wet: 0.35 });
    triggerMarimbaNote(eng, { freq: 246.94, delay: 0.11, duration: 0.28, gain: 0.055, brightness: 0.12, wet: 0.4 });
  } else if (type === 'win') {
    const notes = [
      { freq: 349.23, delay: 0.0, pan: -0.25, gain: 0.06 },
      { freq: 440.0, delay: 0.055, pan: -0.1, gain: 0.06 },
      { freq: 523.25, delay: 0.11, pan: 0.05, gain: 0.065 },
      { freq: 659.25, delay: 0.165, pan: 0.2, gain: 0.06 },
      { freq: 783.99, delay: 0.225, pan: 0.0, gain: 0.07 },
    ];
    notes.forEach((n) => {
      triggerMarimbaNote(eng, {
        freq: n.freq,
        delay: n.delay,
        duration: 0.55,
        gain: n.gain,
        brightness: 0.2,
        pan: n.pan,
        wet: 0.65,
      });
    });
  }
}

export function playSound(type: SoundType, enabled: boolean, pitchOffset = 0): void {
  if (!enabled || currentVolume <= 0) return;
  try {
    const eng = getEngine();
    if (!eng) return;

    if (type === 'tick') {
      const nowMs = performance.now();
      if (nowMs - lastTickMs < 38) return;
      lastTickMs = nowMs;
    }

    if (currentTheme === 'minimal') {
      playMinimalSound(eng, type, pitchOffset);
    } else if (currentTheme === 'arcade') {
      playArcadeSound(eng, type, pitchOffset);
    } else if (currentTheme === 'nature') {
      playNatureSound(eng, type, pitchOffset);
    } else {
      playClassicSound(eng, type, pitchOffset);
    }
  } catch {
    // Ignore audio errors
  }
}
