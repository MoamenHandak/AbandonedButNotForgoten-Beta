/**
 * audioManifest.js
 * Central audio configuration manifest for "Abandoned, But Not Forgotten".
 * 
 * Each track or SFX entry can either specify an optional file path in
 * `public/assets/audio/music/` or `public/assets/audio/sfx/`, or fall back
 * to the procedural WebAudio synthesizer in `surfaceAudio.js`.
 * 
 * To supply your own royalty-free audio files:
 * 1. Place your audio files in `public/assets/audio/music/` or `public/assets/audio/sfx/`.
 * 2. Set the corresponding `file` property below to match your filename.
 * 
 * Recommended free sources:
 * - NASA Audio Collection (Internet Archive / freesound.org CC0)
 * - Free Music Archive (FMA - Ambient / Cinematic CC-BY)
 * - Pixabay Music (Royalty-free space ambient, cinematic pads)
 * - Kenney.nl (UI Audio pack, CC0 SFX)
 */

export const AUDIO_MANIFEST = {
  music: {
    intro: {
      id: 'intro',
      title: 'Cosmic Threshold',
      vibe: 'Mysterious, awe-filled, slow cosmic pads, faint telemetry pings',
      file: null, // Expected: '/assets/audio/music/intro_cosmic_threshold.mp3'
      fallbackPreset: 'intro_space_pad',
      volume: 0.65,
      loop: true,
      fadeSec: 2.5
    },
    menu: {
      id: 'menu',
      title: 'Echoes of Exploration',
      vibe: 'Hopeful, epic ambient synth with gentle melody',
      file: null, // Expected: '/assets/audio/music/menu_echoes_of_exploration.mp3'
      fallbackPreset: 'menu_space_synth',
      volume: 0.7,
      loop: true,
      fadeSec: 2.0
    },
    prologue: {
      id: 'prologue',
      title: "Luna's Nocturne",
      vibe: 'Intimate, gentle piano and soft cosmic strings, nostalgic and emotional',
      file: null, // Expected: '/assets/audio/music/story_prologue_luna.mp3'
      fallbackPreset: 'prologue_intimate_piano',
      volume: 0.6,
      loop: true,
      fadeSec: 2.0
    },
    choice: {
      id: 'choice',
      title: 'Celestial Crossroads',
      vibe: 'Anticipation, calm rising resonant pad chords',
      file: null, // Expected: '/assets/audio/music/choice_celestial_crossroads.mp3'
      fallbackPreset: 'choice_rising_pad',
      volume: 0.65,
      loop: true,
      fadeSec: 1.8
    },
    moon: {
      id: 'moon',
      title: 'Sea of Serenity',
      vibe: 'Lonely, silent, sparse reverb piano notes, deep sub drone',
      file: null, // Expected: '/assets/audio/music/sector_moon_silence.mp3'
      fallbackPreset: 'moon_ambient_drone',
      volume: 0.55,
      loop: true,
      fadeSec: 2.5
    },
    mars: {
      id: 'mars',
      title: 'Winds of Meridiani',
      vibe: 'Warm, dusty, vast low wind textures, slow arpeggios, subtle tension',
      file: null, // Expected: '/assets/audio/music/sector_mars_winds.mp3'
      fallbackPreset: 'mars_ambient_winds',
      volume: 0.55,
      loop: true,
      fadeSec: 2.5
    },
    victory: {
      id: 'victory',
      title: 'All Sentinels Remembered',
      vibe: 'Short uplifting cosmic victory stinger & fanfare',
      file: null, // Expected: '/assets/audio/music/stinger_victory.mp3'
      fallbackPreset: 'victory_fanfare',
      volume: 0.8,
      loop: false,
      fadeSec: 0.5
    }
  },
  sfx: {
    ui_hover: { id: 'ui_hover', file: null, fallbackPreset: 'blip_high' },
    ui_click: { id: 'ui_click', file: null, fallbackPreset: 'blip_click' },
    camera_servo: { id: 'camera_servo', file: null, fallbackPreset: 'servo_pneumatic' },
    story_step_choice: { id: 'story_step_choice', file: null, fallbackPreset: 'chime_celestial' },
    quiz_correct: { id: 'quiz_correct', file: null, fallbackPreset: 'chime_correct' },
    quiz_wrong: { id: 'quiz_wrong', file: null, fallbackPreset: 'buzz_wrong' },
    sector_complete: { id: 'sector_complete', file: null, fallbackPreset: 'fanfare_sector' },
    transit_whoosh: { id: 'transit_whoosh', file: null, fallbackPreset: 'whoosh_hyperspace' },
    unlock: { id: 'unlock', file: null, fallbackPreset: 'chime_unlock' },
    drawer_toggle: { id: 'drawer_toggle', file: null, fallbackPreset: 'servo_drawer' },
    tab_switch: { id: 'tab_switch', file: null, fallbackPreset: 'blip_soft' },
    dialogue_type_luna: { id: 'dialogue_type_luna', file: null, fallbackPreset: 'typewriter_luna' },
    dialogue_type_logbook: { id: 'dialogue_type_logbook', file: null, fallbackPreset: 'typewriter_logbook' }
  }
};
