import { useState, useEffect } from 'react';
import { readStoredSettings } from '../constants/settings';

const UNVERIFIED_TEXT = {
  en: 'Unconfirmed in the sources we reviewed',
  ar: '',
};

const L = (en, ar = '') => ({ en, ar });

/**
 * Shared verified NASA reference list used across dossier cards, archive cards,
 * and SourcesModal. Update `accessed` dates when re-verifying against live pages.
 */
export const CRAFT_SOURCES = [
  {
    id: 'nasa-lrv',
    label: L('NASA — Apollo Lunar Roving Vehicle (LRV) Overview'),
    url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html',
    accessed: '2026-04-15',
  },
  {
    id: 'nasa-heritage-2011',
    label: L(
      "NASA's Recommendations to Space-Faring Entities: How to Protect and Preserve the Historic and Scientific Value of U.S. Government Lunar Artifacts (2011)"
    ),
    url: 'https://www.nasa.gov/wp-content/uploads/2023/04/617743main_nasa-usg_lunar_historic_sites_revA-508.pdf',
    accessed: '2026-04-15',
  },
  {
    id: 'nasa-opportunity',
    label: L('NASA JPL — Mars Exploration Rover Opportunity Mission Page'),
    url: 'https://science.nasa.gov/mission/mer-opportunity/',
    accessed: '2026-04-15',
  },
  {
    id: 'nasa-ingenuity',
    label: L('NASA JPL — Ingenuity Mars Helicopter Mission Reference (Pending Full Fact Audit)'),
    url: 'https://science.nasa.gov/mission/mars-2020-ingenuity/',
    accessed: '2026-11-12',
  },
  {
    id: 'nasa-viking1',
    label: L('NASA — Viking 1 Lander Mission Reference (Pending Full Fact Audit)'),
    url: 'https://science.nasa.gov/mission/viking-1/',
    accessed: '2026-11-12',
  },
  {
    id: 'nasa-voyager',
    label: L('NASA JPL — Voyager Interstellar Mission Status'),
    url: 'https://science.nasa.gov/mission/voyager/',
    accessed: '2026-04-15',
  },
  {
    id: 'nasa-new-horizons',
    label: L('NASA — New Horizons Kuiper Belt Mission Status'),
    url: 'https://science.nasa.gov/mission/new-horizons/',
    accessed: '2026-07-15',
  },
  {
    id: 'nasa-apollo-lm',
    label: L('NASA — Apollo Lunar Module Mission Overview'),
    url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/cslm.html',
    accessed: '2026-11-13',
  },
  {
    id: 'nasa-insight',
    label: L('NASA JPL — InSight Mission Reference & Status'),
    url: 'https://science.nasa.gov/mission/insight/',
    accessed: '2026-11-13',
  },
  {
    id: 'nasa-lro',
    label: L('NASA — Lunar Reconnaissance Orbiter (LRO) Overview'),
    url: 'https://science.nasa.gov/mission/lro/',
    accessed: '2026-11-13',
  },
];

const SOURCE_BY_ID = Object.fromEntries(CRAFT_SOURCES.map((src) => [src.id, src]));

/**
 * Primary bilingual craft stories matching 3D showroom IDs (`VEHICLES_DATA`)
 * plus 2D archive equipment entries rendered inside `MoreEquipmentModal`.
 *
 * Editorial rules enforced in copy:
 * - Never refer to remaining mission equipment as "junk" or "scrap"
 * - Never call lunar/Martian surface craft "orbital debris"
 * - Never equate evidence of past liquid water with confirmed life
 * - Show "Unconfirmed in the sources we reviewed" wherever facts are pending verification
 */
export const CRAFT_STORIES = {
  'lunar-rover': {
    id: 'lunar-rover',
    name: L('Lunar Roving Vehicle (LRV)'),
    operator: L('NASA (Apollo Program)'),
    location: 'moon',
    launch: L('Apollo 15, 16, and 17 (1971–1972; exact per-flight timestamps pending audit)'),
    landing: L('Hadley-Apennine, Descartes, and Taurus-Littrow (Apollo 15–17)'),
    status: 'halted',
    statusNote: L(
      'Halted historic mission relic parked on the lunar surface after crew departure.'
    ),
    lastVerified: '2026-04-15',
    story: {
      question: L(
        'How could astronauts travel beyond walking distance to sample diverse lunar geology within strict suit life-support limits?'
      ),
      device: L(
        'An electric, four-wheel-drive folding vehicle stowed in the Lunar Module descent bay for the final three Apollo missions.'
      ),
      experiment: L(
        'Crew drove between crater rims and highland slopes, hauling geology tools, core tubes, and lunar rock boxes back to the lander.'
      ),
      discovery: L(
        'Extending traverse range across Apollo 15, 16, and 17 let crews collect varied highland and volcanic samples that reshaped models of lunar history.'
      ),
      ending: L(
        'All three LRVs remain powered down on the Moon because they were engineered only for surface mobility and never designed to return to Earth.'
      ),
    },
    quiz: {
      prompt: L('Why were the three Apollo Lunar Roving Vehicles left parked on the Moon?'),
      options: [
        L('They were never designed to launch back to Earth and stayed as remaining mission hardware.'),
        L('They were deliberately abandoned mid-mission due to total wheel failure.'),
        L('International law required every vehicle to remain running autonomously.'),
      ],
      correctIndex: 0,
      explanation: L(
        'Each electric LRV was built specifically to extend astronaut exploration range on Apollo 15, 16, and 17. Once the ascent stage lifted off, the remaining equipment stayed on the surface.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?'),
      approachOutcome: L(
        'Approaching closely could disturb delicate tracks and stir abrasive lunar dust onto historic cameras and metal surfaces. NASA’s 2011 Lunar Heritage guidance recommends keep-out buffer distances — note that these are technical preservation recommendations, not binding international law.'
      ),
      keepDistanceOutcome: L(
        'Good preservation choice. Keeping a safe standoff honors NASA’s 2011 Lunar Heritage technical recommendations (non-binding guidance) so future teams can still study dust coating and untouched boot and wheel tracks.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-lrv'], SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'mer-opportunity': {
    id: 'mer-opportunity',
    name: L('Opportunity (MER-B)'),
    operator: L('NASA / Jet Propulsion Laboratory'),
    location: 'mars',
    launch: L('7 Jul 2003'),
    landing: L('24 Jan 2004'),
    status: 'halted',
    statusNote: L(
      'Halted spacecraft: planned for ~90 sols, operated nearly 15 years; last contact 10 Jun 2018; mission concluded 13 Feb 2019.'
    ),
    lastVerified: '2026-04-15',
    story: {
      question: L(
        'Did Meridiani Planum once hold surface or subsurface liquid water capable of altering Martian rocks?'
      ),
      device: L(
        'A six-wheeled solar-powered geology rover equipped with panoramic cameras, spectrometers, and a rock abrasion tool.'
      ),
      experiment: L(
        'Opportunity drove 45.16 km across craters and bedrock outcrops — the first human-made vehicle to exceed marathon distance on another world.'
      ),
      discovery: L(
        'Iron-rich hematite spherules and sulfate deposits provided strong evidence of past liquid water conditions that could have been hospitable to microbial life (it did not detect life).'
      ),
      ending: L(
        'A planet-encircling 2018 dust storm blocked sunlight to its solar arrays; after last contact on 10 Jun 2018 and over 1,000 unanswered recovery commands, NASA concluded the mission on 13 Feb 2019.'
      ),
    },
    quiz: {
      prompt: L('What did Opportunity’s hematite and rock chemistry findings actually show about Mars?'),
      options: [
        L('They confirmed living microbes currently inhabit Meridiani Planum craters.'),
        L('They revealed evidence of past water conditions that may have supported microbial life, though no life was found.'),
        L('They proved Mars never experienced liquid water on its surface.'),
      ],
      correctIndex: 1,
      explanation: L(
        'Past habitability is not the same as proof of life. Opportunity established that Meridiani Planum experienced ancient liquid water, showing conditions once favorable for microbes without finding life itself.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?'),
      approachOutcome: L(
        'Driving right up to a halted rover risks throwing dust over untouched solar decks or snagging fragile appendages. Keeping clear — similar in spirit to NASA’s 2011 lunar technical recommendations, which remain advisory rather than binding treaty law — preserves long-term weathering clues in Perseverance Valley.'
      ),
      keepDistanceOutcome: L(
        'Observing from a respectful standoff protects Opportunity as a mission relic while letting scientists track Martian wind and dust changes around a stationary reference point.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-opportunity'], SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'ingenuity-helicopter': {
    id: 'ingenuity-helicopter',
    name: L('Ingenuity Mars Helicopter'),
    operator: L('NASA / JPL (Verification Pending)'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify exact Mars 2020 launch timestamp against NASA JPL source
    landing: UNVERIFIED_TEXT, // TODO: verify Jezero Crater landing & deployment dates against NASA JPL source
    status: 'unverified',
    statusNote: L(
      'Unconfirmed in the sources we reviewed — full flight log, dates, and final blade-damage details pending direct NASA verification.'
    ),
    lastVerified: '2026-11-12',
    story: {
      question: UNVERIFIED_TEXT, // TODO: verify official technology-demonstration objective phrasing
      device: UNVERIFIED_TEXT, // TODO: verify mass, coaxial rotor specs, and solar cap from NASA source
      experiment: UNVERIFIED_TEXT, // TODO: verify exact flight count and distance totals
      discovery: UNVERIFIED_TEXT, // TODO: verify primary aerodynamic & scouting finding
      ending: UNVERIFIED_TEXT, // TODO: verify final flight date and rotor condition wording
    },
    quiz: {
      prompt: L('How should explorers treat Ingenuity details not yet verified in the reviewed briefing?'),
      options: [
        L('Label unverified dates, counts, and causes as unconfirmed until primary NASA records are checked.'),
        L('Estimate approximate flight totals so the telemetry card looks complete.'),
        L('Classify halted surface rotorcraft under Earth orbital debris.'),
      ],
      correctIndex: 0,
      explanation: L(
        'Scientific storytelling requires transparency: unreviewed specs, flight totals, and failure causes must never be guessed or filled in from memory.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?'),
      approachOutcome: UNVERIFIED_TEXT, // TODO: verify Mars heritage/contamination standoff rules with NASA Planetary Protection brief
      keepDistanceOutcome: L(
        'Until exact site preservation and planetary protection rules are verified in reviewed sources, keeping a conservative inspection standoff avoids disturbing a historic surface vehicle.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-ingenuity']],
  },

  'viking-lander': {
    id: 'viking-lander',
    name: L('Viking 1 Lander'),
    operator: L('NASA (Verification Pending)'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify exact 1975 Viking 1 launch date against NASA archive
    landing: UNVERIFIED_TEXT, // TODO: verify Chryse Planitia landing & last transmission dates against NASA archive
    status: 'unverified',
    statusNote: L(
      'Unconfirmed in the sources we reviewed — mission timeline, biology package outcome, and shutdown details pending source check.'
    ),
    lastVerified: '2026-11-12',
    story: {
      question: UNVERIFIED_TEXT, // TODO: verify Viking 1 surface science goals
      device: UNVERIFIED_TEXT, // TODO: verify RTG lander and meteorology/biology suite specs
      experiment: UNVERIFIED_TEXT, // TODO: verify surface soil scooping & weather logging summary
      discovery: UNVERIFIED_TEXT, // TODO: verify carefully framed finding avoiding false "life" claims
      ending: UNVERIFIED_TEXT, // TODO: verify exact 1982 command error / battery shutdown cause
    },
    quiz: {
      prompt: L('When a historical craft entry is marked UNVERIFIED in our archive, what is the editorial rule?'),
      options: [
        L('Never equate inconclusive soil tests with life and never invent missing dates or causes.'),
        L('Reuse Opportunity dates until a reviewer updates the file.'),
        L('Refer to the stationary lander as orbital scrap.'),
      ],
      correctIndex: 0,
      explanation: L(
        'Every claim shown to learners must match reviewed primary sources; unverified dates, biology interpretations, and shutdown causes remain explicitly flagged.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?'),
      approachOutcome: UNVERIFIED_TEXT, // TODO: verify Mars historic site standoff guidance
      keepDistanceOutcome: L(
        'Maintaining a safe perimeter prevents kickup dust and mechanical contact with an aging mission relic while full archival guidelines are verified.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-viking1']],
  },

  // --- Task 5: 2D Archive Equipment Cards (`noModel: true`) ---
  'apollo-alsep': {
    id: 'apollo-alsep',
    noModel: true,
    name: L('Apollo ALSEP Stations'),
    operator: L('NASA (Apollo Surface Experiments)'),
    location: 'moon',
    launch: UNVERIFIED_TEXT, // TODO: verify Apollo 12–17 station deployment dates
    landing: L('Multiple Apollo landing sites (exact dates pending audit)'),
    status: 'halted',
    statusNote: L('Halted surface science stations; exact station-by-station shutdown dates unconfirmed in reviewed sources.'),
    lastVerified: '2026-04-15',
    story: {
      question: L('How do moonquakes, solar wind, and heat flow behave on the Moon long after astronauts depart?'),
      device: L('Central telemetry stations linked to geophysical sensors deployed near Apollo landing zones.'),
      experiment: L('Radioed seismic, magnetic, and charged-particle readings continuously back to Earth receivers.'),
      discovery: L('Recorded multi-year seismic and environmental datasets revealing clues about the Moon’s internal structure.'),
      ending: L('Transmissions were ended after years of operations, leaving the silent instrument packages intact on the regolith.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'lunar-retroreflectors': {
    id: 'lunar-retroreflectors',
    noModel: true,
    name: L('Lunar Laser Retroreflector Arrays'),
    operator: L('Apollo & Soviet Lunokhod Programs'),
    location: 'moon',
    launch: UNVERIFIED_TEXT, // TODO: verify Apollo 11/14/15 and Lunokhod 1/2 mirror dates
    landing: UNVERIFIED_TEXT,
    status: 'passive-useful',
    statusNote: L('Passive & still useful: unpowered corner-cube optics still bounce Earth lasers for millimeter-scale distance ranging.'),
    lastVerified: '2026-04-15',
    story: {
      question: L('How precisely does the Earth-Moon distance change over decades, and does gravity behave as predicted?'),
      device: L('Arrays of fused-silica corner-cube mirrors that require zero electrical power or moving parts.'),
      experiment: L('Earth observatories fire laser pulses at the Moon and time photons reflected straight back to their source.'),
      discovery: L('Continues to enable ultra-precise Earth-Moon ranging and tests of lunar interior dynamics and gravity.'),
      ending: L('Though no electronics operate inside them, these mission relics remain scientifically active whenever lasers target them.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'mars-pathfinder-sojourner': {
    id: 'mars-pathfinder-sojourner',
    noModel: true,
    name: L('Mars Pathfinder & Sojourner'),
    operator: L('NASA / JPL'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify exact Pathfinder launch/landing dates
    landing: UNVERIFIED_TEXT,
    status: 'halted',
    statusNote: L('Halted pioneer lander & first wheeled rover on Mars; exact contact dates unconfirmed in reviewed sources.'),
    lastVerified: '2026-11-12',
    story: {
      question: L('Could a compact solar-powered rover navigate boulders and measure Martian rock chemistry safely?'),
      device: L('Airbag-cushioned lander paired with the shoebox-sized six-wheeled Sojourner rover.'),
      experiment: L('Tested autonomous hazard avoidance and pressed an X-ray spectrometer against nearby rocks.'),
      discovery: L('Demonstrated mobile surface exploration on Mars, paving the engineering path for Spirit, Opportunity, and later rovers.'),
      ending: L('Halted on the surface after communications ended; remains one of the earliest Martian surface mission relics.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'mars-spirit': {
    id: 'mars-spirit',
    noModel: true,
    name: L('Spirit (MER-A)'),
    operator: L('NASA / JPL'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify Spirit launch/landing/end dates
    landing: UNVERIFIED_TEXT,
    status: 'halted',
    statusNote: L('Halted twin rover to Opportunity; exact odometry & final signal date unconfirmed in reviewed sources.'),
    lastVerified: '2026-11-12',
    story: {
      question: L('Did ancient Gusev Crater hold watery minerals sculpted by volcanic hydrothermal activity or shallow water?'),
      device: L('Twin solar-powered Mars Exploration Rover carrying matching cameras and rock-grinding instruments.'),
      experiment: L('Examined bright silica-rich soils and layered rocks in the Columbia Hills after crossing crater plains.'),
      discovery: L('Found minerals formed in ancient wet and steam-altered environments — evidence of past habitability, not life.'),
      ending: L('Became embedded in soft Martian sand and lost solar charging during Martian winter, becoming a silent stationary station.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'mars-phoenix': {
    id: 'mars-phoenix',
    noModel: true,
    name: L('Phoenix Mars Lander'),
    operator: L('NASA / University of Arizona'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify Phoenix dates & metrics
    landing: UNVERIFIED_TEXT,
    status: 'halted',
    statusNote: L('Halted polar lander; exact sol duration and winter loss dates unconfirmed in reviewed sources.'),
    lastVerified: '2026-11-12',
    story: {
      question: L('Was frozen water lying just beneath the soil at Mars’s far northern plains?'),
      device: L('Stationary polar lander fitted with a robotic digging arm and miniature thermal chemistry ovens.'),
      experiment: L('Scooped shallow trenches into high-latitude soil to expose subsurface layers and heat samples.'),
      discovery: L('Confirmed shallow subsurface water ice near the surface in the Martian northern plains.'),
      ending: L('Designed for sunlit polar summer only, Phoenix shut down as Arctic winter darkness and carbon-dioxide frost arrived.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'mars-insight': {
    id: 'mars-insight',
    noModel: true,
    name: L('InSight Lander'),
    operator: L('NASA / JPL / CNES / DLR'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO: verify InSight exact launch/landing/retirement dates
    landing: UNVERIFIED_TEXT,
    status: 'halted',
    statusNote: L('Halted geophysical station; exact quake counts & retirement date unconfirmed in reviewed sources.'),
    lastVerified: '2026-11-12',
    story: {
      question: L('What do crust thickness, mantle depth, and core size reveal about Mars’s deep interior?'),
      device: L('Stationary lander placing a domed ultra-sensitive seismometer directly onto the Martian soil.'),
      experiment: L('Listened patiently for marsquakes and meteoroid impacts rippling through the planet’s interior.'),
      discovery: L('Measured seismic waves that mapped the thickness of Mars’s crust and constrained its liquid core properties.'),
      ending: L('Accumulating dust choked solar power after years of operation, halting the station while leaving its instruments in place.'),
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'deep-space-timeline': {
    id: 'deep-space-timeline',
    noModel: true,
    isContrastTimeline: true,
    name: L('Deep Space Contrast: Silent vs. Still Active'),
    operator: L('NASA / JPL / Applied Physics Laboratory'),
    location: 'deep-space',
    launch: L('Multiple deep-space eras (Pioneer 10 halted; Voyager & New Horizons checked 2026)'),
    landing: L('Interstellar & Outer Solar System trajectories (no planetary landing)'),
    status: 'active',
    statusNote: L(
      'Contrast Card — Pioneer 10 is silent (halted), while Voyager 1 & 2 (Apr 2026) and New Horizons (Jul 2026) remain active.'
    ),
    lastVerified: '2026-07-15',
    story: {
      question: L('Do all distant spacecraft go silent forever once they leave the inner solar system?'),
      device: L('Radioisotope-powered deep-space probes using long-range high-gain dishes instead of solar panels.'),
      experiment: L('Compare Pioneer 10 (now silent/halted) against Voyager 1 & 2 (still returning interstellar readings in Apr 2026) and New Horizons (active in Jul 2026).'),
      discovery: L('Not every distant machine is silent: power reserves and receiver upgrades keep several deep-space spacecraft actively sending science.'),
      ending: L('Whether active or halted, distant and surface spacecraft are historic mission equipment — never "scrap" or "orbital debris".'),
    },
    timelineNodes: [
      {
        id: 'pioneer-10',
        name: L('Pioneer 10'),
        status: 'halted',
        note: L('Silent / halted deep-space pioneer; exact final signal year pending audit.'),
        checked: '2026-04-15',
      },
      {
        id: 'voyager-1-2',
        name: L('Voyager 1 & Voyager 2'),
        status: 'active',
        note: L('Active as of April 2026 — continuing interstellar particle and magnetic measurements.'),
        checked: '2026-04-15',
      },
      {
        id: 'new-horizons',
        name: L('New Horizons'),
        status: 'active',
        note: L('Active as of July 2026 — operating in the distant Kuiper Belt environment.'),
        checked: '2026-07-15',
      },
    ],
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-voyager'], SOURCE_BY_ID['nasa-new-horizons']],
  },

  'apollo-lunar-module': {
    id: 'apollo-lunar-module',
    name: L('Apollo Lunar Module (Descent Stage)'),
    operator: L('NASA (Apollo Program)'),
    location: 'moon',
    launch: L('Apollo 11–17 (1969–1972; exact timestamps per flight pending audit)'),
    landing: L('Six lunar landing sites (Apollo 11, 12, 14, 15, 16, 17)'),
    status: 'halted',
    statusNote: L(
      'Halted mission hardware: descent stages remained at the six Apollo landing sites and served as launch platforms for the ascent stage. Only the descent stage remained on the Moon.'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: L(
        'How could a crewed spacecraft land softly on an airless lunar surface and later launch astronauts back into lunar orbit?'
      ),
      device: L(
        'A two-stage vehicle comprising a descent stage with a throttleable rocket engine and landing gear, and an ascent stage for crew cabin and liftoff. Note that only the descent stage remained on the Moon.'
      ),
      experiment: L(
        'Supported surface EVAs, scientific deployment, and geological sampling at six distinct landing zones across the lunar nearside.'
      ),
      discovery: L(
        'Enabled the first direct human field exploration of another world, returning over 380 kilograms of lunar samples.'
      ),
      ending: L(
        'Descent stages remained at the six Apollo landing sites as permanent historic mission relics, while ascent stages returned crew to orbit.'
      ),
    },
    quiz: {
      prompt: L('Which part of the Apollo Lunar Module remained permanently on the lunar surface?'),
      options: [
        L('Only the descent stage remained on the Moon, serving as the launch platform for the crew.'),
        L('The entire spacecraft including the crew cabin stayed parked together.'),
        L('Both stages returned to Earth inside the Command Module.'),
      ],
      correctIndex: 0,
      explanation: L(
        'Only the descent stage remained on the Moon at each Apollo site; the ascent stage carried the astronauts back into lunar orbit.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?'),
      approachOutcome: L(
        'Approaching closely risks kicking abrasive regolith onto historic thermal foils and descent engine structures. NASA’s 2011 preservation recommendations advise generous buffer perimeters around landing sites.'
      ),
      keepDistanceOutcome: L(
        'Respecting a standoff preserves historic descent stages and untouched footprint trails for future scientific study.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-apollo-lm'], SOURCE_BY_ID['nasa-heritage-2011']],
  },

  'insight-lander': {
    id: 'insight-lander',
    name: L('InSight Mars Lander'),
    operator: L('NASA / JPL'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO verify exact InSight launch date
    landing: L('26 Nov 2018 (Elysium Planitia, Mars)'),
    status: 'halted',
    statusNote: L(
      'Halted spacecraft: landed 26 Nov 2018 on Mars, used a seismometer plus heat and geodesy instruments, dust on the solar panels reduced power, NASA declared it retired 21 Dec 2022 (last contact 15 Dec 2022).'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: L(
        'What do seismic tremors, heat flow, and precision wobble reveal about the deep interior structure and core of Mars?'
      ),
      device: L(
        'A stationary lander equipped with the SEIS seismometer, HP3 heat flow probe, and RISE radio science antennas. Displayed in arm-deployed configuration before ground instrument placement.'
      ),
      experiment: L(
        'Recorded over 1,300 marsquakes and measured subtle radio Doppler shifts to map the Martian crust, mantle, and molten core.'
      ),
      discovery: L(
        'Revealed Mars has a liquid metallic core, determined crustal thickness, and proved the planet remains seismically active.'
      ),
      ending: L(
        'Dust on the solar panels reduced power over four years of operations; NASA declared it retired 21 Dec 2022 after last contact on 15 Dec 2022.'
      ),
    },
    quiz: {
      prompt: L('What primary factor caused the InSight lander to eventually lose electrical power on Mars?'),
      options: [
        L('Dust accumulating on its solar arrays gradually choked electrical generation over years.'),
        L('A catastrophic software crash during a routine seismic recording.'),
        L('Immediate battery failure upon landing in 2018.'),
      ],
      correctIndex: 0,
      explanation: L(
        'Without cleaning winds, atmospheric dust slowly covered InSight’s solar panels until battery power could no longer support transmissions.'
      ),
    },
    visitDecision: {
      prompt: L('DO WE APPROACH THE INSTRUMENT?'),
      approachOutcome: L(
        'Moving close to InSight’s deck could disturb dust distribution that records years of environmental deposition in Elysium Planitia.'
      ),
      keepDistanceOutcome: L(
        'A careful standoff protects InSight and its delicate deployment arm as a quiet monument to Martian geophysics.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-insight']],
  },

  'lro-orbiter': {
    id: 'lro-orbiter',
    name: L('Lunar Reconnaissance Orbiter (LRO)'),
    operator: L('NASA / Goddard Space Flight Center'),
    location: 'moon',
    launch: UNVERIFIED_TEXT, // TODO verify LRO launch date
    landing: L('Lunar Polar Orbit (No surface landing)'),
    status: 'active',
    statusNote: L(
      'Orbiter in lunar polar orbit. Orbit visuals are illustrative and not to true scale or true orbital geometry.'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: L(
        'Can high-resolution orbital cameras map lunar topography and detect surface changes across decades?'
      ),
      device: L(
        'A lunar polar orbiter carrying a suite of cameras, altimeters, and spectrometers. Orbit visuals are illustrative and not to true scale or true orbital geometry.'
      ),
      experiment: L(
        'LRO\'s cameras (LROC) imaged the Apollo landing sites, showing descent stages and some tracks across the regolith.'
      ),
      discovery: L(
        'Produced comprehensive 3D lunar surface maps and verified the preservation of historic hardware and tracks from orbit.'
      ),
      ending: L(
        'Continues in active lunar orbit monitoring impact cratering and supporting landing site planning.'
      ),
    },
    quiz: {
      prompt: L('What significant historic feature did LRO’s narrow-angle cameras image on the Moon?'),
      options: [
        L('Apollo landing sites, showing the preserved descent stages and astronaut tracks.'),
        L('Remnants of active ancient cities beneath the craters.'),
        L('Active volcanic eruptions across the lunar maria.'),
      ],
      correctIndex: 0,
      explanation: L(
        'LRO’s high-resolution LROC camera successfully captured clear orbital views of the Apollo descent stages, rover trails, and scientific equipment.'
      ),
    },
    visitDecision: {
      prompt: L('ORBITAL TELEMETRY OBSERVATION'),
      approachOutcome: L(
        'Orbit visuals are illustrative and not to true scale or true orbital geometry. Telemetry is tracked via NASA ground networks.'
      ),
      keepDistanceOutcome: L(
        'Observing from designated flight geometry honors orbital mechanics and technical drawing conventions.'
      ),
    },
    sources: [SOURCE_BY_ID['nasa-lro']],
  },

  'ladee-orbiter': {
    id: 'ladee-orbiter',
    name: L('LADEE Orbiter'),
    operator: L('NASA / Ames Research Center (TODO verify)'),
    location: 'moon',
    launch: UNVERIFIED_TEXT, // TODO verify LADEE launch date
    landing: L('Lunar Orbit / Impact (TODO verify exact date)'),
    status: 'unverified',
    statusNote: L(
      'Unconfirmed in the sources we reviewed. Orbit visuals are illustrative and not to true scale or true orbital geometry. (TODO verify LADEE operational status).'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: UNVERIFIED_TEXT,
      device: L('Modular lunar orbiter designed to study the tenuous lunar exosphere and dust environment. Orbit visuals are illustrative and not to true scale or true orbital geometry. Note: LLCD may have flown as a technology demonstration payload on LADEE rather than as a separate spacecraft; verify before presenting separately.'),
      experiment: UNVERIFIED_TEXT,
      discovery: UNVERIFIED_TEXT,
      ending: UNVERIFIED_TEXT,
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-lro']],
  },

  'mgs-orbiter': {
    id: 'mgs-orbiter',
    name: L('Mars Global Surveyor (MGS)'),
    operator: L('NASA / JPL (TODO verify)'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO verify MGS launch date
    landing: L('Martian Orbit (TODO verify)'),
    status: 'unverified',
    statusNote: L(
      'Unconfirmed in the sources we reviewed. Orbit visuals are illustrative and not to true scale or true orbital geometry. (TODO verify MGS dates and status).'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: UNVERIFIED_TEXT,
      device: L('High-resolution mapping orbiter. Orbit visuals are illustrative and not to true scale or true orbital geometry.'),
      experiment: UNVERIFIED_TEXT,
      discovery: UNVERIFIED_TEXT,
      ending: UNVERIFIED_TEXT,
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'odyssey-orbiter': {
    id: 'odyssey-orbiter',
    name: L('2001 Mars Odyssey'),
    operator: L('NASA / JPL (TODO verify)'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO verify Odyssey launch date
    landing: L('Martian Orbit (TODO verify)'),
    status: 'unverified',
    statusNote: L(
      'Unconfirmed in the sources we reviewed. Orbit visuals are illustrative and not to true scale or true orbital geometry. (TODO verify Odyssey dates and status).'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: UNVERIFIED_TEXT,
      device: L('Long-duration orbital thermal mapper and communication relay. Orbit visuals are illustrative and not to true scale or true orbital geometry.'),
      experiment: UNVERIFIED_TEXT,
      discovery: UNVERIFIED_TEXT,
      ending: UNVERIFIED_TEXT,
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'mro-orbiter': {
    id: 'mro-orbiter',
    name: L('Mars Reconnaissance Orbiter (MRO)'),
    operator: L('NASA / JPL (TODO verify)'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO verify MRO launch date
    landing: L('Martian Orbit (TODO verify)'),
    status: 'unverified',
    statusNote: L(
      'Unconfirmed in the sources we reviewed. Orbit visuals are illustrative and not to true scale or true orbital geometry. (TODO verify MRO dates and status).'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: UNVERIFIED_TEXT,
      device: L('Heavy reconnaissance orbiter with HiRISE camera and radar sounder. Orbit visuals are illustrative and not to true scale or true orbital geometry.'),
      experiment: UNVERIFIED_TEXT,
      discovery: UNVERIFIED_TEXT,
      ending: UNVERIFIED_TEXT,
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },

  'maven-orbiter': {
    id: 'maven-orbiter',
    name: L('MAVEN Orbiter'),
    operator: L('NASA / Goddard Space Flight Center (TODO verify)'),
    location: 'mars',
    launch: UNVERIFIED_TEXT, // TODO verify MAVEN launch date
    landing: L('Martian Elliptical Orbit (TODO verify)'),
    status: 'unverified',
    statusNote: L(
      'Unconfirmed in the sources we reviewed. Orbit visuals are illustrative and not to true scale or true orbital geometry. (TODO verify MAVEN dates and status).'
    ),
    lastVerified: '2026-11-13',
    story: {
      question: UNVERIFIED_TEXT,
      device: L('Atmospheric exploration orbiter investigating solar wind loss. Orbit visuals are illustrative and not to true scale or true orbital geometry.'),
      experiment: UNVERIFIED_TEXT,
      discovery: UNVERIFIED_TEXT,
      ending: UNVERIFIED_TEXT,
    },
    quiz: null,
    visitDecision: null,
    sources: [SOURCE_BY_ID['nasa-opportunity']],
  },
};

export const ARCHIVE_EQUIPMENT_IDS = [
  'apollo-alsep',
  'lunar-retroreflectors',
  'mars-pathfinder-sojourner',
  'mars-spirit',
  'mars-phoenix',
  'mars-insight',
  'deep-space-timeline',
];

/** Concise bilingual UI chrome labels so no new HUD/Story text is hardcoded in JSX. */
export const STORY_UI_COPY = {
  en: {
    statusLabels: {
      halted: 'HALTED',
      'passive-useful': 'PASSIVE & STILL USEFUL',
      active: 'ACTIVE AS OF LAST UPDATE',
      unverified: 'UNVERIFIED',
    },
    verifiedChipPrefix: 'VERIFIED',
    learnMore: 'LEARN MORE',
    showLess: 'HIDE DETAILS',
    sectionLabels: {
      question: 'THE QUESTION',
      device: 'THE DEVICE',
      experiment: 'THE EXPERIMENT',
      discovery: 'THE DISCOVERY',
      ending: 'THE END',
      verify: 'VERIFY',
    },
    quizHeader: 'KNOWLEDGE CHECK',
    quizExplanationLabel: 'MISSION NOTE',
    visitSafeBtn: 'KEEP RESPECTFUL DISTANCE',
    visitApproachBtn: 'APPROACH CLOSELY',
    visitHint: 'NASA 2011 lunar heritage recommendations (advisory technical guidance, not binding law)',
    operatorLabel: 'OPERATOR',
    launchLabel: 'LAUNCH',
    landingLabel: 'LANDING',
    sourcesLabel: 'SOURCE RECORDS',
    viewAllSources: 'VIEW ALL SOURCES',
    moreEquipmentBtn: 'MORE EQUIPMENT',
    moreEquipmentTitle: 'OTHER REMAINING EQUIPMENT',
    moreEquipmentSubtitle:
      'Historic surface stations, passive reflectors, and active vs. silent deep-space probes',
    filters: {
      all: 'ALL REGIONS',
      moon: 'MOON',
      mars: 'MARS',
      'deep-space': 'DEEP SPACE',
    },
    deepSpaceContrastTitle: 'SILENT VS. STILL ACTIVE TIMELINE',
    sourcesModalTitle: 'SOURCES & VERIFICATION LOG',
    sourcesModalSubtitle:
      'Editorial policy: surface craft are remaining equipment or mission relics — never "junk", "scrap", or "orbital debris". Unreviewed facts are marked unverified.',
    menuSourcesBtn: 'Sources',
    closeLabel: 'CLOSE',
    openExternal: 'OPEN RECORD',
    accessedLabel: 'ACCESSED',
    locationLabels: {
      moon: 'LUNAR SECTOR',
      mars: 'MARTIAN SECTOR',
      'deep-space': 'DEEP SPACE',
    },
    logbookNotes: {
      book: "Grandpa's Logbook — Entry 01: They didn't vanish. They stayed right where their last command ended.",
      drift: "Grandpa's Margin Note — Two quiet worlds and the vast expanse of deep space hold machines built by hands from Earth.",
      choice: "Grandpa's Field Sketch — Choose a destination below, and read carefully before you disturb a single speck of dust.",
    },
  },
  ar: {
    // Ready for full Arabic localization; falls back cleanly to English if keys are omitted
    menuSourcesBtn: 'المصادر',
  },
};

function pickText(field, lang = 'en') {
  if (!field) return '';
  if (typeof field === 'string') return field;
  const candidate = field[lang];
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }
  return field.en || '';
}

function resolveStoryEntry(entry, lang) {
  if (!entry) return null;
  return {
    id: entry.id,
    noModel: Boolean(entry.noModel),
    isContrastTimeline: Boolean(entry.isContrastTimeline),
    name: pickText(entry.name, lang),
    operator: pickText(entry.operator, lang),
    location: entry.location,
    launch: pickText(entry.launch, lang),
    landing: pickText(entry.landing, lang),
    status: entry.status,
    statusNote: pickText(entry.statusNote, lang),
    lastVerified: entry.lastVerified,
    story: {
      question: pickText(entry.story?.question, lang),
      device: pickText(entry.story?.device, lang),
      experiment: pickText(entry.story?.experiment, lang),
      discovery: pickText(entry.story?.discovery, lang),
      ending: pickText(entry.story?.ending, lang),
    },
    quiz: entry.quiz
      ? {
          prompt: pickText(entry.quiz.prompt, lang),
          options: (entry.quiz.options || []).map((opt) => pickText(opt, lang)),
          correctIndex: entry.quiz.correctIndex,
          explanation: pickText(entry.quiz.explanation, lang),
        }
      : null,
    visitDecision: entry.visitDecision
      ? {
          prompt: pickText(entry.visitDecision.prompt, lang),
          approachOutcome: pickText(entry.visitDecision.approachOutcome, lang),
          keepDistanceOutcome: pickText(entry.visitDecision.keepDistanceOutcome, lang),
        }
      : null,
    timelineNodes: entry.timelineNodes
      ? entry.timelineNodes.map((node) => ({
          id: node.id,
          name: pickText(node.name, lang),
          status: node.status,
          note: pickText(node.note, lang),
          checked: node.checked,
        }))
      : null,
    sources: (entry.sources || []).map((src) => ({
      id: src.id,
      label: pickText(src.label, lang),
      url: src.url,
      accessed: src.accessed,
    })),
  };
}

/** Returns localized story data for a given craft id, falling back to English. */
export function getCraftStory(id, lang = 'en') {
  return resolveStoryEntry(CRAFT_STORIES[id], lang);
}

/** Returns localized UI chrome labels for the storytelling layer, falling back to English. */
export function getStoryUiCopy(lang = 'en') {
  const en = STORY_UI_COPY.en;
  const override = STORY_UI_COPY[lang];
  if (!override || lang === 'en') return en;
  return {
    ...en,
    ...override,
    statusLabels: { ...en.statusLabels, ...(override.statusLabels || {}) },
    sectionLabels: { ...en.sectionLabels, ...(override.sectionLabels || {}) },
    filters: { ...en.filters, ...(override.filters || {}) },
    locationLabels: { ...en.locationLabels, ...(override.locationLabels || {}) },
    logbookNotes: { ...en.logbookNotes, ...(override.logbookNotes || {}) },
  };
}

/** Returns all 2D archive equipment entries (Moon, Mars, and Deep Space contrast card). */
export function getArchiveEquipment(lang = 'en') {
  return ARCHIVE_EQUIPMENT_IDS.map((id) => getCraftStory(id, lang)).filter(Boolean);
}

/** Returns the deduplicated list of verified & audited mission sources. */
export function getAllCraftSources(lang = 'en') {
  return CRAFT_SOURCES.map((src) => ({
    id: src.id,
    label: pickText(src.label, lang),
    url: src.url,
    accessed: src.accessed,
  }));
}

/** React hook keeping components synchronized with SettingsModal language changes. */
export function useActiveLanguage() {
  const [lang, setLang] = useState(() => readStoredSettings().language || 'en');

  useEffect(() => {
    const handleSettingsChange = (e) => {
      const next = e?.detail?.language || readStoredSettings().language || 'en';
      setLang(next);
    };
    window.addEventListener('gameSettingsChange', handleSettingsChange);
    return () => window.removeEventListener('gameSettingsChange', handleSettingsChange);
  }, []);

  return lang;
}
