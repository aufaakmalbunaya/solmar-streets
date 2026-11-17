// All sound is synthesised with WebAudio: no audio files, no network. Engine hum,
// police siren, gunshots, punches, pickups, crashes and a slow synth music loop.
// Everything is a no-op until the first user gesture creates the AudioContext,
// so headless screenshot runs stay silent and error-free. M toggles mute.
export function createAudio() {
  const audio = {
    muted: false,
    ctx: null,
    master: null,
    engineOsc: null,
    engineOsc2: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    musicTimer: null,
    musicStep: 0,
  };

  audio.ensure = () => {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.5;
      audio.master.connect(audio.ctx.destination);
      // Engine: two detuned saws through a low-pass, pitch follows speed.
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      audio.engineOsc2 = audio.ctx.createOscillator();
      audio.engineOsc2.type = 'sawtooth';
      audio.engineOsc2.frequency.value = 58;
      const engineFilter = audio.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(engineFilter);
      audio.engineOsc2.connect(engineFilter);
      engineFilter.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engineOsc.start();
      audio.engineOsc2.start();
      // Siren: one square wave, its frequency flips between two tones.
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'square';
      audio.sirenOsc.frequency.value = 720;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenGain.connect(audio.master);
      audio.sirenOsc.start();
      audio.startMusic();
      return true;
    } catch {
      audio.ctx = null;
      return false;
    }
  };

  audio.setMuted = (muted) => {
    audio.muted = muted;
    if (audio.master && audio.ctx) {
      audio.master.gain.setTargetAtTime(muted ? 0 : 0.5, audio.ctx.currentTime, 0.05);
    }
  };

  // speed01 is 0..1 (car speed over max), driving is false on foot.
  audio.engine = (speed01, driving) => {
    if (!audio.ctx || !audio.engineGain) return;
    const t = audio.ctx.currentTime;
    const level = driving ? 0.05 + speed01 * 0.09 : 0;
    audio.engineGain.gain.setTargetAtTime(level, t, 0.08);
    const freq = 52 + speed01 * 130;
    audio.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
    audio.engineOsc2.frequency.setTargetAtTime(freq * 1.01 + 2, t, 0.08);
  };

  audio.siren = (on) => {
    if (!audio.ctx || !audio.sirenGain) return;
    const t = audio.ctx.currentTime;
    audio.sirenGain.gain.setTargetAtTime(on ? 0.035 : 0, t, 0.2);
    if (on) audio.sirenOsc.frequency.setTargetAtTime(Math.floor(t * 2) % 2 === 0 ? 720 : 960, t, 0.05);
  };

  function noiseBurst(duration, filterFreq, level) {
    if (!audio.ctx) return;
    const length = Math.max(1, Math.floor(audio.ctx.sampleRate * duration));
    const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = audio.ctx.createGain();
    gain.gain.value = level;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    source.start();
  }

  function blip(freq, duration, level, type = 'sine') {
    if (!audio.ctx) return;
    const osc = audio.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(level, audio.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start();
    osc.stop(audio.ctx.currentTime + duration);
  }

  audio.gunshot = () => {
    noiseBurst(0.14, 1800, 0.5);
    blip(160, 0.1, 0.25, 'square');
  };
  audio.enemyShot = () => noiseBurst(0.12, 1200, 0.18);
  audio.punch = () => noiseBurst(0.08, 900, 0.3);
  audio.crash = () => noiseBurst(0.25, 500, 0.5);
  audio.pickup = () => { blip(660, 0.09, 0.25); setTimeout(() => blip(990, 0.12, 0.25), 90); };
  audio.cash = () => { blip(880, 0.08, 0.22); setTimeout(() => blip(1320, 0.14, 0.22), 80); };
  audio.busted = () => { blip(220, 0.5, 0.3, 'sawtooth'); setTimeout(() => blip(180, 0.6, 0.3, 'sawtooth'), 200); };
  audio.missionDone = () => {
    [523, 659, 784].forEach((freq, i) => setTimeout(() => blip(freq, 0.18, 0.25), i * 110));
  };

  // A slow four-chord loop (Am - F - C - G) as a quiet pad plus a soft bass pulse.
  // One chord per bar, one bar every 2.4 s.
  const CHORDS = [
    [110, 220, 261.6, 329.6],
    [87.3, 174.6, 220, 261.6],
    [130.8, 196, 261.6, 329.6],
    [98, 196, 246.9, 293.7],
  ];
  audio.startMusic = () => {
    if (!audio.ctx || audio.musicTimer) return;
    audio.musicTimer = setInterval(() => {
      if (!audio.ctx || audio.muted) return;
      const chord = CHORDS[audio.musicStep % CHORDS.length];
      audio.musicStep += 1;
      const t = audio.ctx.currentTime;
      chord.forEach((freq, i) => {
        const osc = audio.ctx.createOscillator();
        osc.type = i === 0 ? 'triangle' : 'sawtooth';
        osc.frequency.value = freq;
        const gain = audio.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(i === 0 ? 0.06 : 0.016, t + 0.4);
        gain.gain.linearRampToValueAtTime(0.0001, t + 2.3);
        const filter = audio.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audio.master);
        osc.start(t);
        osc.stop(t + 2.4);
      });
    }, 2400);
  };

  return audio;
}
