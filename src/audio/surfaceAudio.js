/**
 * Synthesized surface ambience and camera-servo cues.
 * Moon: vacuum comms hiss (no wind) + cosmic radiation crackles + deep system hum.
 * Mars: gusting thin-air wind + atmospheric whistles.
 * Camera transitions: realistic pneumatic/hydrazine thrusters & servo whines.
 * Volumes follow the settings modal (localStorage + gameSettingsChange).
 */

const SETTINGS_KEY = 'abnf_game_settings';

function readSettings() {
  const fallback = { master: 0.8, music: 0.7, sfx: 0.9, mute: false };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      master: clamp01((parsed.masterVolume ?? 80) / 100),
      music: clamp01((parsed.musicVolume ?? 70) / 100),
      sfx: clamp01((parsed.sfxVolume ?? 90) / 100),
      mute: !!parsed.muteAudio
    };
  } catch {
    return fallback;
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function makeNoiseBuffer(ctx, seconds = 2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    data[i] = brown * 3.4;
  }
  return buffer;
}

class SurfaceAudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    this.noiseBuffer = null;
    this.settings = readSettings();
    this.planet = null;
    this.bed = [];
    this.crackleTimer = null;
    this.windGustTimer = null;
    this.musicBed = [];
    this.musicTimer = null;
    this.musicType = null;
    this.installed = false;
  }

  install() {
    if (this.installed || typeof window === 'undefined') return () => {};
    this.installed = true;

    const onSettings = (event) => {
      const detail = event.detail || {};
      this.settings = {
        master: clamp01((detail.masterVolume ?? this.settings.master * 100) / 100),
        music: clamp01((detail.musicVolume ?? this.settings.music * 100) / 100),
        sfx: clamp01((detail.sfxVolume ?? this.settings.sfx * 100) / 100),
        mute: !!detail.muteAudio
      };
      this.applyGains();
    };

    const onCue = (event) => {
      const detail = event.detail || {};
      this.handle(detail.cue, detail);
    };

    const unlock = () => {
      this.ensure();
      if (this.ctx?.state === 'suspended') this.ctx.resume();
    };

    const onVisibility = () => {
      if (document.hidden) {
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      } else {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    };

    window.addEventListener('gameSettingsChange', onSettings);
    window.addEventListener('gameAudioCue', onCue);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });

    return () => {
      window.removeEventListener('gameSettingsChange', onSettings);
      window.removeEventListener('gameAudioCue', onCue);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      this.stopAmbience();
      this.stopMusic();
      if (this.ctx) this.ctx.close();
      this.ctx = null;
      this.installed = false;
    };
  }

  ensure() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.noiseBuffer = makeNoiseBuffer(this.ctx);
    this.applyGains();
  }

  applyGains() {
    if (!this.master) return;
    const silent = this.settings.mute ? 0 : 1;
    this.master.gain.value = this.settings.master * silent;
    this.music.gain.value = this.settings.music;
    this.sfx.gain.value = this.settings.sfx;
  }

  resume() {
    this.ensure();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  handle(cue, detail = {}) {
    if (!cue) return;
    this.resume();
    if (cue === 'intro_music') {
      this.startIntroMusic();
    } else if (cue === 'menu_music') {
      this.startMenuMusic();
    } else if (cue === 'prologue_music') {
      this.startPrologueMusic();
    } else if (cue === 'choice_music') {
      this.startChoiceMusic();
    } else if (cue === 'moon_music') {
      this.startMoonMusic();
    } else if (cue === 'mars_music') {
      this.startMarsMusic();
    } else if (cue === 'victory_stinger' || cue === 'victory_music') {
      this.startVictoryMusic();
    } else if (cue === 'menu_music_stop' || cue === 'stop_music') {
      this.stopMusic();
    } else if (cue === 'credits_music') {
      this.startCreditsMusic();
    } else if (cue === 'credits_music_stop') {
      this.stopMusic();
    } else if (cue === 'surface_ambience') {
      this.stopMusic();
      this.startAmbience(detail.planet);
    } else if (cue === 'surface_ambience_stop') {
      this.stopAmbience();
    } else if (cue === 'dialogue_type') {
      this.playTypewriter(detail.speaker || 'luna');
      this.duckMusic(1.8, 0.45);
    } else if (cue === 'quiz_correct') {
      this.playQuizCorrect();
    } else if (cue === 'quiz_wrong') {
      this.playQuizWrong();
    } else if (cue === 'sector_complete' || cue === 'campaign_complete') {
      this.playSectorComplete();
    } else if (cue === 'transit_whoosh') {
      this.playTransitWhoosh();
    } else if (cue === 'drawer_toggle') {
      this.playDrawerToggle();
    } else if (cue === 'tab_switch') {
      this.playTabSwitch();
    } else if (cue === 'camera_servo') {
      this.playServo('fly');
      this.playThruster('medium');
    } else if (cue === 'vehicle_swipe') {
      this.playServo('swipe');
      this.playThruster('light');
    } else if (cue === 'thruster') {
      this.playThruster(detail.intensity || 'medium');
    } else if (cue === 'part_select' || cue === 'part_lock') {
      this.playServo('lock');
      this.playBlip(0.12, 980, 1640);
    } else if (cue === 'part_unlock' || cue === 'unlock') {
      this.playUnlockChime();
    } else if (cue === 'start_journey') {
      this.stopMusic();
      this.playServo('launch');
      this.playThruster('heavy');
    } else if (String(cue).startsWith('story_step_')) {
      this.playBlip(0.05, 800, 1200);
    }
  }

  /**
   * Smoothly ducks background music volume during dialogue speech.
   */
  duckMusic(duration = 2.0, duckFactor = 0.45) {
    if (!this.ctx || !this.music || this.settings.mute) return;
    const now = this.ctx.currentTime;
    const baseGain = this.settings.music;
    this.music.gain.cancelScheduledValues(now);
    this.music.gain.setValueAtTime(this.music.gain.value, now);
    this.music.gain.linearRampToValueAtTime(baseGain * duckFactor, now + 0.12);
    this.music.gain.linearRampToValueAtTime(baseGain, now + duration);
  }

  /**
   * Dialogue typewriter character sound: soft bright blip for Luna,
   * warm low resonant click for Mission Logbook.
   */
  playTypewriter(speaker = 'luna') {
    if (!this.ctx || this.settings.mute) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (speaker === 'logbook') {
      osc.type = 'triangle';
      const baseFreq = 230 + (Math.random() - 0.5) * 35;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.78, now + 0.04);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);
    } else {
      osc.type = 'sine';
      const baseFreq = 960 + (Math.random() - 0.5) * 80;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, now + 0.025);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.032, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    }

    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  /** Bright ascending chime chord for correct quiz answers */
  playQuizCorrect() {
    if (!this.ctx || this.settings.mute) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + idx * 0.07;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.65);

      osc.connect(gain);
      gain.connect(this.sfx);
      osc.start(startTime);
      osc.stop(startTime + 0.7);
    });
  }

  /** Gentle low warning dissonance for incorrect quiz attempts */
  playQuizWrong() {
    if (!this.ctx || this.settings.mute) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(185, now);
    osc2.frequency.setValueAtTime(196, now);
    osc1.frequency.exponentialRampToValueAtTime(130, now + 0.28);
    osc2.frequency.exponentialRampToValueAtTime(138, now + 0.28);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.32);
    osc2.stop(now + 0.32);
  }

  /** Triumphant fanfare for sector or campaign completion */
  playSectorComplete() {
    if (!this.ctx || this.settings.mute) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const chords = [
      { t: 0.0, freqs: [261.63, 329.63, 392.0] },
      { t: 0.22, freqs: [293.66, 369.99, 440.0] },
      { t: 0.5, freqs: [329.63, 392.0, 523.25, 659.25] }
    ];
    chords.forEach((chord) => {
      chord.freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = now + chord.t;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.09, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(this.sfx);
        osc.start(startTime);
        osc.stop(startTime + 1.3);
      });
    });
  }

  /** Sweeping hyperspace whoosh for planetary transit */
  playTransitWhoosh() {
    if (!this.ctx || this.settings.mute || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.0;
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.55);
    filter.frequency.exponentialRampToValueAtTime(160, now + 1.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);
    noise.start(now);
    noise.stop(now + 1.5);
  }

  /** Tactile latch and servo click for details drawer toggle */
  playDrawerToggle() {
    this.playServo('lock');
    this.playBlip(0.08, 640, 920);
  }

  /** Crisp UI tab switch blip */
  playTabSwitch() {
    this.playBlip(0.045, 900, 1150);
  }

  /** Harmonic unlock chime */
  playUnlockChime() {
    this.playBlip(0.07, 780, 1420);
  }

  /**
   * Intimate, nostalgic piano & soft string pads for Story Prologue (B2)
   */
  startPrologueMusic() {
    this.resume();
    if (!this.ctx || this.musicType === 'prologue') return;
    this.stopMusic();
    this.musicType = 'prologue';

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 65.4; // C2

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 160;

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.linearRampToValueAtTime(0.12, now + 2.0);

    drone.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.music);
    drone.start();

    // Soft string chords (C maj - G - Am - F)
    const stringFilter = ctx.createBiquadFilter();
    stringFilter.type = 'lowpass';
    stringFilter.frequency.value = 520;

    const stringGain = ctx.createGain();
    stringGain.gain.setValueAtTime(0.0001, now);
    stringGain.gain.linearRampToValueAtTime(0.11, now + 2.5);

    stringFilter.connect(stringGain);
    stringGain.connect(this.music);

    const freqs = [130.81, 164.81, 196.0, 261.63];
    const stringOscs = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (i - 1.5) * 4;
      osc.connect(stringFilter);
      osc.start();
      return osc;
    });

    this.musicBed.push(
      { source: drone, gain: droneGain },
      { source: stringFilter, gain: stringGain },
      ...stringOscs.map((o) => ({ source: o, gain: null }))
    );

    // Random gentle nostalgic piano notes
    const pianoNotes = [329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.settings.mute || this.musicType !== 'prologue') return;
      const tNow = this.ctx.currentTime;
      const freq = pianoNotes[Math.floor(Math.random() * pianoNotes.length)];

      const piano = this.ctx.createOscillator();
      piano.type = 'sine';
      piano.frequency.value = freq;

      const pGain = this.ctx.createGain();
      pGain.gain.setValueAtTime(0.0001, tNow);
      pGain.gain.exponentialRampToValueAtTime(0.065, tNow + 0.03);
      pGain.gain.exponentialRampToValueAtTime(0.0001, tNow + 2.4);

      piano.connect(pGain);
      pGain.connect(this.music);
      piano.start(tNow);
      piano.stop(tNow + 2.5);
    }, 4500);
  }

  /**
   * Calm rising resonant pad chords for Choice Scene (B2)
   */
  startChoiceMusic() {
    this.resume();
    if (!this.ctx || this.musicType === 'choice') return;
    this.stopMusic();
    this.musicType = 'choice';

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(320, now);
    padFilter.frequency.linearRampToValueAtTime(580, now + 12);

    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.linearRampToValueAtTime(0.14, now + 2.0);

    padFilter.connect(padGain);
    padGain.connect(this.music);

    const freqs = [110.0, 164.81, 220.0, 277.18, 329.63]; // A major 9
    const oscs = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (i - 2) * 5;
      osc.connect(padFilter);
      osc.start();
      return osc;
    });

    this.musicBed.push(
      { source: padFilter, gain: padGain },
      ...oscs.map((o) => ({ source: o, gain: null }))
    );
  }

  /**
   * Pre-menu intro scene: mysterious cosmic pads and faint telemetry pings
   */
  startIntroMusic() {
    this.resume();
    if (!this.ctx || this.musicType === 'intro') return;
    this.stopMusic();
    this.musicType = 'intro';

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 48.0;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 2.5);
    drone.connect(gain);
    gain.connect(this.music);
    drone.start();

    this.musicBed.push({ source: drone, gain });
  }

  /**
   * Short uplifting stinger on victory modals
   */
  startVictoryMusic() {
    this.playSectorComplete();
  }

  /**
   * Procedural Space Ambient Music for Main Menu (Item 7)
   */
  startMenuMusic() {
    this.resume();
    if (!this.ctx || this.musicType === 'menu') return;
    this.stopMusic();
    this.musicType = 'menu';

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Deep Space Sub-Bass Drone (A1: 55Hz & E2: 82.4Hz)
    const drone1 = ctx.createOscillator();
    drone1.type = 'sine';
    drone1.frequency.value = 55;

    const drone2 = ctx.createOscillator();
    drone2.type = 'triangle';
    drone2.frequency.value = 82.4;

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 140;

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.linearRampToValueAtTime(0.18, now + 2.5);

    drone1.connect(droneFilter);
    drone2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.music);

    drone1.start();
    drone2.start();

    // 2. Cosmic Pad Chords (Space harmony chords)
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 450;
    padFilter.Q.value = 1.2;

    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.linearRampToValueAtTime(0.14, now + 3.0);
    padFilter.connect(padGain);
    padGain.connect(this.music);

    const freqs = [130.81, 155.56, 196.0, 233.08];
    const padOscs = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (i - 1.5) * 6;
      osc.connect(padFilter);
      osc.start();
      return osc;
    });

    const padLfo = ctx.createOscillator();
    padLfo.frequency.value = 0.08;
    const padLfoGain = ctx.createGain();
    padLfoGain.gain.value = 160;
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padFilter.frequency);
    padLfo.start();

    this.musicBed.push(
      { source: drone1, gain: droneGain },
      { source: drone2, gain: null },
      { source: padFilter, gain: padGain },
      ...padOscs.map((o) => ({ source: o, gain: null })),
      { source: padLfo, gain: padLfoGain }
    );

    // 3. Random celestial crystalline chime pings
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.settings.mute || this.musicType !== 'menu') return;
      const tNow = this.ctx.currentTime;
      const noteFreq = pentatonic[Math.floor(Math.random() * pentatonic.length)];

      const chime = this.ctx.createOscillator();
      chime.type = 'sine';
      chime.frequency.value = noteFreq;

      const chimeGain = this.ctx.createGain();
      chimeGain.gain.setValueAtTime(0.0001, tNow);
      chimeGain.gain.exponentialRampToValueAtTime(0.06, tNow + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, tNow + 2.8);

      chime.connect(chimeGain);
      chimeGain.connect(this.music);

      chime.start(tNow);
      chime.stop(tNow + 3.0);
    }, 5500);
  }

  /**
   * Warm, reflective, emotional space music for Credits (Item 7)
   */
  startCreditsMusic() {
    this.resume();
    if (!this.ctx || this.musicType === 'credits') return;
    this.stopMusic();
    this.musicType = 'credits';

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bass = ctx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = 43.65;

    const bassWarmth = ctx.createOscillator();
    bassWarmth.type = 'triangle';
    bassWarmth.frequency.value = 87.31;

    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.0001, now);
    bassGain.gain.linearRampToValueAtTime(0.18, now + 2.0);

    bass.connect(bassGain);
    bassWarmth.connect(bassGain);
    bassGain.connect(this.music);

    bass.start();
    bassWarmth.start();

    const chordFreqs = [174.61, 220.0, 261.63, 329.63, 392.0];
    const chordFilter = ctx.createBiquadFilter();
    chordFilter.type = 'lowpass';
    chordFilter.frequency.value = 600;

    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.0001, now);
    chordGain.gain.linearRampToValueAtTime(0.12, now + 3.2);

    chordFilter.connect(chordGain);
    chordGain.connect(this.music);

    const chordOscs = chordFreqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      osc.detune.value = (i - 2) * 5;
      osc.connect(chordFilter);
      osc.start();
      return osc;
    });

    this.musicBed.push(
      { source: bass, gain: bassGain },
      { source: bassWarmth, gain: null },
      { source: chordFilter, gain: chordGain },
      ...chordOscs.map((o) => ({ source: o, gain: null }))
    );

    const chimeNotes = [659.25, 783.99, 880.0, 987.77, 1046.5, 1318.5];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.settings.mute || this.musicType !== 'credits') return;
      const tNow = this.ctx.currentTime;
      const freq = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];

      const bell = this.ctx.createOscillator();
      bell.type = 'sine';
      bell.frequency.value = freq;

      const bellGain = this.ctx.createGain();
      bellGain.gain.setValueAtTime(0.0001, tNow);
      bellGain.gain.exponentialRampToValueAtTime(0.05, tNow + 0.04);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, tNow + 3.2);

      bell.connect(bellGain);
      bellGain.connect(this.music);

      bell.start(tNow);
      bell.stop(tNow + 3.4);
    }, 4200);
  }

  stopMusic() {
    this.musicType = null;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    const now = this.ctx?.currentTime ?? 0;
    this.musicBed.forEach((node) => {
      try {
        if (node.gain) {
          node.gain.gain.cancelScheduledValues(now);
          node.gain.gain.setTargetAtTime(0.0001, now, 0.12);
        }
        if (node.source?.stop) node.source.stop(now + 0.5);
      } catch {
        /* already stopped */
      }
    });
    this.musicBed = [];
  }

  startAmbience(planet) {
    if (planet !== 'moon' && planet !== 'mars') return;
    this.resume();
    if (!this.ctx || this.planet === planet) return;
    this.stopAmbience();
    this.planet = planet;
    if (planet === 'mars') this.buildMarsWind();
    else this.buildMoonVacuum();
  }

  stopAmbience() {
    this.planet = null;
    if (this.crackleTimer) {
      clearInterval(this.crackleTimer);
      this.crackleTimer = null;
    }
    if (this.windGustTimer) {
      clearInterval(this.windGustTimer);
      this.windGustTimer = null;
    }
    const now = this.ctx?.currentTime ?? 0;
    this.bed.forEach((node) => {
      try {
        if (node.gain) {
          node.gain.gain.cancelScheduledValues(now);
          node.gain.gain.setTargetAtTime(0.0001, now, 0.08);
        }
        if (node.source?.stop) node.source.stop(now + 0.4);
      } catch {
        /* already stopped */
      }
    });
    this.bed = [];
  }

  spawnNoise(destination) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    source.connect(destination);
    source.start();
    return source;
  }

  buildMarsWind() {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Atmospheric low-mid hollow wind
    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'bandpass';
    bedFilter.frequency.value = 260;
    bedFilter.Q.value = 0.7;

    const bedGain = ctx.createGain();
    bedGain.gain.setValueAtTime(0.0001, now);
    bedGain.gain.linearRampToValueAtTime(0.24, now + 1.2);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain);
    lfoGain.connect(bedGain.gain);
    lfo.start();

    const source = this.spawnNoise(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(this.music);

    // High altitude thin-sky whistle
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 1600;
    hissFilter.Q.value = 3.0;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.018;
    const hiss = this.spawnNoise(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(this.music);

    this.bed.push(
      { source, gain: bedGain },
      { source: lfo, gain: lfoGain },
      { source: hiss, gain: hissGain }
    );

    // Occasional Martian dust wind gusts
    this.windGustTimer = setInterval(() => {
      if (this.planet !== 'mars' || !this.ctx || this.settings.mute) return;
      const gustTime = this.ctx.currentTime;
      bedFilter.frequency.cancelScheduledValues(gustTime);
      bedFilter.frequency.setValueAtTime(260, gustTime);
      bedFilter.frequency.exponentialRampToValueAtTime(420, gustTime + 1.8);
      bedFilter.frequency.exponentialRampToValueAtTime(260, gustTime + 4.2);
    }, 9500);
  }

  buildMoonVacuum() {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Airless space: high frequency telemetry carrier hiss
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 4400;
    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0.0001, now);
    hissGain.gain.linearRampToValueAtTime(0.022, now + 0.8);
    const hiss = this.spawnNoise(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(this.music);

    // Deep spacesuit life support internal drone
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 48;
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, now);
    droneGain.gain.linearRampToValueAtTime(0.035, now + 1.4);
    drone.connect(droneGain);
    droneGain.connect(this.music);
    drone.start();

    this.bed.push({ source: hiss, gain: hissGain }, { source: drone, gain: droneGain });

    // Occasional cosmic radiation crackles
    this.crackleTimer = setInterval(() => {
      if (this.planet !== 'moon' || !this.ctx) return;
      this.playCrackle();
    }, 2800);
  }

  playCrackle() {
    if (!this.ctx || this.settings.mute) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400 + Math.random() * 1800;
    filter.Q.value = 6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.music);
    source.start(now);
    source.stop(now + 0.1);
  }

  /**
   * Synthesizes an authentic spacecraft pneumatic thruster / RCS burst
   * @param {'light'|'medium'|'heavy'} intensity
   */
  playThruster(intensity = 'medium') {
    if (!this.ctx || this.settings.mute) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const isLight = intensity === 'light';
    const isHeavy = intensity === 'heavy';
    const dur = isLight ? 0.28 : isHeavy ? 1.35 : 0.65;
    const peakGain = isLight ? 0.14 : isHeavy ? 0.32 : 0.22;

    // 1. High-pressure gas jet hiss
    const hissSource = ctx.createBufferSource();
    hissSource.buffer = this.noiseBuffer;
    hissSource.loop = true;

    const hissBand = ctx.createBiquadFilter();
    hissBand.type = 'bandpass';
    hissBand.frequency.setValueAtTime(isLight ? 1400 : 950, now);
    hissBand.frequency.exponentialRampToValueAtTime(isLight ? 600 : 380, now + dur);
    hissBand.Q.value = 2.2;

    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0.0001, now);
    hissGain.gain.exponentialRampToValueAtTime(peakGain, now + 0.035);
    hissGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    hissSource.connect(hissBand);
    hissBand.connect(hissGain);
    hissGain.connect(this.sfx);
    hissSource.start(now);
    hissSource.stop(now + dur + 0.02);

    // 2. Deep sub-bass propulsion rumble
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    const startSub = isLight ? 90 : isHeavy ? 45 : 65;
    const endSub = isLight ? 40 : 32;
    subOsc.frequency.setValueAtTime(startSub, now);
    subOsc.frequency.exponentialRampToValueAtTime(endSub, now + dur);

    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = isHeavy ? 160 : 120;

    const subGain = ctx.createGain();
    const subPeak = isLight ? 0.08 : isHeavy ? 0.28 : 0.18;
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(subPeak, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.sfx);
    subOsc.start(now);
    subOsc.stop(now + dur + 0.02);
  }

  playServo(kind) {
    if (!this.ctx || this.settings.mute) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const isLock = kind === 'lock';
    const isSwipe = kind === 'swipe';
    const isLaunch = kind === 'launch';

    const dur = isSwipe ? 0.32 : isLaunch ? 1.15 : isLock ? 0.22 : 0.85;
    const peak = isSwipe ? 0.16 : isLaunch ? 0.28 : isLock ? 0.18 : 0.22;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = isSwipe ? 3.2 : isLock ? 4.5 : 5;
    const startFreq = isSwipe ? 720 : isLaunch ? 180 : isLock ? 950 : 260;
    const midFreq = isSwipe ? 1680 : isLaunch ? 1400 : isLock ? 1800 : 1280;
    band.frequency.setValueAtTime(startFreq, now);
    band.frequency.exponentialRampToValueAtTime(midFreq, now + dur * 0.45);
    band.frequency.exponentialRampToValueAtTime(210, now + dur);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(peak, now + 0.035);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(this.sfx);
    noise.start(now);
    noise.stop(now + dur + 0.02);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isSwipe ? 180 : isLock ? 240 : 96, now);
    osc.frequency.exponentialRampToValueAtTime(isSwipe ? 460 : isLock ? 520 : 280, now + dur * 0.7);
    const oscFilter = ctx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.value = 900;
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(isSwipe ? 0.05 : isLock ? 0.06 : 0.07, now + 0.04);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.sfx);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  playBlip(level = 0.07, startFreq = 880, endFreq = 1320) {
    if (!this.ctx || this.settings.mute) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(now);
    osc.stop(now + 0.16);
  }
}

const engine = new SurfaceAudioEngine();

export function installSurfaceAudio() {
  return engine.install();
}

export function dispatchAudioCue(cue, extra = {}) {
  engine.handle(cue, extra);
}

/** Play HUD confirmation lock cue without touching the core synthesis graph. */
export function playLock() {
  engine.handle('part_lock');
}

/** Play HUD release / toggle cue. */
export function playUnlock() {
  engine.handle('part_unlock');
}

/** Play lightweight UI servo cue ('fly' | 'swipe' | 'lock' | 'launch'). */
export function playServo(kind = 'fly') {
  engine.resume();
  engine.playServo(kind);
}
