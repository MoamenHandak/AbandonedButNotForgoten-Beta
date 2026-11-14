import React, { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  Radio,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  RotateCw,
  Orbit,
  Sparkles,
  Info,
  RotateCcw,
  Layers,
  Archive,
  AlertTriangle,
  Pause,
  Play,
  CheckCircle2,
  HelpCircle,
  Compass,
  Eye,
  FileText
} from 'lucide-react';
import { dispatchAudioCue, playServo } from '../audio/surfaceAudio';
import {
  loadGLTFModel,
  disposeObject3D,
  isWebGLAvailable,
  prefersReducedMotion,
  getDeviceQualityProfile
} from '../utils/modelCache';
import {
  readStoredSettings,
  resolveGraphicsProfile,
  getEffectivePixelRatio
} from '../constants/settings';
import { getCraftStory, getStoryUiCopy, useActiveLanguage } from '../data/craftStories';
import { getTranslations } from '../constants/translations';
import MissionBriefingDialog from './MissionBriefingDialog';
import StatusBadge from './StatusBadge';
import ShowroomStoryPanel from './ShowroomStoryPanel';
import { createOrbitLayer } from '../scene/orbitLayer';
import '../styles/spacecraft.css';

const MoreEquipmentModal = lazy(() => import('./MoreEquipmentModal'));
const SourcesModal = lazy(() => import('./SourcesModal'));

/* ==========================================================================
   SPACECRAFT CONFIGURATION & CALIBRATED HOTSPOTS
   Staged deep-space models preserved in public/models/ without UI modification:
   pioneer10-opt.glb, dawn-opt.glb, near-opt.glb, kepler-opt.glb, llcd-opt.glb
   ========================================================================== */
export const VEHICLES_DATA = [
  {
    id: 'lunar-rover',
    name: 'LUNAR ROVER',
    codename: 'LRV // MOON',
    role: 'LUNAR ROVING VEHICLE',
    destination: 'moon',
    planet: 'THE MOON',
    sector: 'SECTOR 01 // HADLEY RILLE',
    modelSrc: '/models/lunar_rover-opt.glb',
    alt: 'Detailed 3D model of Apollo Lunar Roving Vehicle standing on the Moon',
    scale: 1,
    position: [0, 0, 0],
    rotation: [0, -0.4, 0],
    focusCamPos: [2.8, 1.25, 3.4],
    focusLookAt: [0, 0.65, 0],
    contactShadowRadius: 2.2,
    agency: 'NASA / Boeing / General Motors',
    launchDate: 'July 26, 1971',
    landingSite: 'Hadley-Apennine, Moon',
    distanceTraveled: '27.76 km',
    operationalTime: '3 Days Active (Apollo 15 EVA)',
    status: 'Parked in Lunar Silence for 50+ Years',
    tagline: "Humanity's first electric wheels on an alien world.",
    description:
      'Engineered by Boeing and Delco (General Motors), the Lunar Roving Vehicle radically expanded the exploration radius of Apollo astronauts. Powered by dual 36-volt silver-zinc batteries and woven wire wheels, three LRVs (Apollo 15, 16, and 17) remain parked on the Moon today, completely preserved in the airless vacuum.',
    lastTelemetry:
      'Parked 90 meters from the Falcon Lunar Module to film the astronauts\' ascent back to orbit using its automated color TV camera.',
    stats: [
      { label: 'TOP SPEED', value: '13 km/h' },
      { label: 'MASS', value: '210 kg' },
      { label: 'POWER', value: 'Ag-Zn Bat' },
      { label: 'STATUS', value: 'Preserved' }
    ],
    hotspots: [
      { id: 'lrv-tv', label: 'Color TV Camera', position: [0.68, 1.15, 0.40], offset: { x: 80, y: -50 } },
      { id: 'lrv-hga', label: 'High-Gain Umbrella Dish', position: [0.99, 1.55, 0.14], offset: { x: 85, y: -65 } },
      { id: 'lrv-wheel', label: 'Woven Wire Wheels', position: [0.29, 0.38, 0.75], offset: { x: -85, y: -35 } },
      { id: 'lrv-battery', label: '36V Dual Ag-Zn Battery', position: [0.12, 0.75, 0.35], offset: { x: 85, y: 40 } }
    ],
    vistaAnchor: [0, 1.75, 0]
  },
  {
    id: 'apollo-lunar-module',
    name: 'LUNAR MODULE',
    codename: 'LM-10 // FALCON',
    role: 'APOLLO CREWED LUNAR LANDER',
    destination: 'moon',
    planet: 'THE MOON',
    sector: 'SECTOR 01 // HADLEY RILLE',
    modelSrc: '/models/lunar_module-opt.glb',
    alt: 'Detailed 3D model of Apollo Lunar Module standing on the Moon',
    scale: 1.0,
    position: [-18.0, 0, 10.0],
    rotation: [0, 0.45, 0],
    focusCamPos: [-15.2, 2.2, 13.8],
    focusLookAt: [-18.0, 1.8, 10.0],
    contactShadowRadius: 3.8,
    agency: 'NASA / Grumman Aerospace',
    launchDate: 'July 26, 1971',
    landingSite: 'Hadley-Apennine, Moon (July 30, 1971)',
    distanceTraveled: 'Descent Stage Launch Platform',
    operationalTime: '66 Hours, 55 Minutes Surface Stay',
    status: 'Descent Stage Remains on the Lunar Surface',
    tagline: 'Descent stages remained at the six Apollo landing sites.',
    description:
      'Descent stages remained at the six Apollo landing sites and served as launch platforms for the ascent stage. Note: While this historic 3D model depicts the integrated spacecraft configuration, only the descent stage remained on the Moon after lunar liftoff.',
    lastTelemetry:
      'Descent stages remained at the six Apollo landing sites and served as launch platforms for the ascent stage.',
    stats: [
      { label: 'LANDING', value: '30 Jul 1971' },
      { label: 'STAY TIME', value: '66.9 Hours' },
      { label: 'MASS (DRY)', value: '2,034 kg' },
      { label: 'STATUS', value: 'Permanent Site' }
    ],
    hotspots: [
      { id: 'lm-descent', label: 'Descent Stage & Engine', position: [-18.0, 0.85, 10.0], offset: { x: -85, y: 40 } },
      { id: 'lm-footpad', label: 'Landing Gear & Lunar Footpad', position: [-15.8, 0.35, 12.2], offset: { x: 85, y: 45 } },
      { id: 'lm-mesa', label: 'Modular Equipment Stowage (MESA)', position: [-18.8, 1.65, 8.8], offset: { x: -85, y: -35 } },
      { id: 'lm-antenna', label: 'S-Band Steerable Antenna', position: [-17.3, 3.85, 11.2], offset: { x: 85, y: -55 } }
    ],
    vistaAnchor: [-18.0, 2.5, 10.0]
  },
  {
    id: 'lro-orbiter',
    isOrbiter: true,
    name: 'LRO',
    codename: 'LRO // LUNAR ORBIT',
    role: 'LUNAR RECONNAISSANCE ORBITER',
    destination: 'moon',
    planet: 'THE MOON',
    sector: 'LUNAR POLAR ORBIT // MAPPING',
    modelSrc: '/models/lro-opt.glb',
    alt: '3D model of Lunar Reconnaissance Orbiter circling the Moon',
    scale: 0.15,
    position: [12.93, -9.06, 2.2],
    rotation: [0.1, 0.4, 0],
    focusCamPos: [16.46, -10.19, 5.02],
    focusLookAt: [12.93, -9.06, 2.2],
    contactShadowRadius: 0,
    agency: 'NASA / Goddard',
    launchDate: 'June 18, 2009',
    landingSite: 'Lunar Polar Mapping Orbit',
    distanceTraveled: 'Polar Orbit Reconnaissance',
    operationalTime: 'Over 15 Years in Orbit',
    status: 'Active Lunar Orbital Mapper',
    tagline: 'Mapping the Moon in unprecedented meter-scale detail.',
    description:
      'Launched on June 18, 2009, LRO entered lunar polar orbit to map the surface, identify landing sites and water ice deposits, and photograph Apollo landing sites.',
    lastTelemetry:
      'Continuing high-resolution surface mapping and laser altimetry from polar orbit.',
    stats: [
      { label: 'ORBIT', value: 'Polar Lunar' },
      { label: 'ACTIVE', value: '15+ Years' },
      { label: 'INSTRUMENTS', value: 'LROC, LOLA' },
      { label: 'STATUS', value: 'Operational' }
    ],
    hotspots: [
      { id: 'lro-hga', label: 'High-Gain Antenna (HGA)', position: [13.48, -8.51, 2.45], offset: { x: 85, y: -45 } },
      { id: 'lro-cam', label: 'LROC Narrow Angle Camera', position: [12.48, -9.11, 2.0], offset: { x: -85, y: -35 } },
      { id: 'lro-solar', label: 'Solar Array Wing', position: [11.98, -8.91, 2.65], offset: { x: 85, y: 35 } }
    ],
    vistaAnchor: [12.93, -9.06, 2.2]
  },
  {
    id: 'ladee-orbiter',
    isOrbiter: true,
    name: 'LADEE',
    codename: 'LADEE // EXOSPHERE',
    role: 'LUNAR DUST & ATMOSPHERE EXPLORER',
    destination: 'moon',
    planet: 'THE MOON',
    sector: 'LUNAR EQUATORIAL ORBIT // RETIRED',
    modelSrc: '/models/ladee-opt.glb',
    alt: '3D model of LADEE lunar atmosphere probe',
    scale: 0.055,
    position: [-12.21, -8.24, 12.37],
    rotation: [0.15, 0.5, 0],
    focusCamPos: [-16.82, -8.7, 13.91],
    focusLookAt: [-12.21, -8.24, 12.37],
    contactShadowRadius: 0,
    agency: 'NASA / Ames',
    launchDate: 'September 7, 2013',
    landingSite: 'Lunar Surface (Impact Apr 18, 2014)',
    distanceTraveled: 'Low Lunar Equatorial Orbit',
    operationalTime: '7 Months Active (Impacted Apr 18, 2014)',
    status: 'Intentional Lunar Far-Side Impact',
    tagline: 'Unveiling the mystery of glowing lunar sunrise dust.',
    description:
      'LADEE investigated the Moon’s extremely tenuous atmosphere and floating dust grains, demonstrating high-speed lunar optical laser communications (LLCD).',
    lastTelemetry:
      'Mission concluded with a planned, intentional impact on the lunar far side on April 18, 2014.',
    stats: [
      { label: 'LAUNCH', value: '7 Sep 2013' },
      { label: 'IMPACT', value: '18 Apr 2014' },
      { label: 'OPTICAL COMM', value: '622 Mbps' },
      { label: 'STATUS', value: 'Decommissioned' }
    ],
    hotspots: [
      { id: 'ladee-laser', label: 'LLCD Optical Laser Terminal', position: [-11.81, -7.84, 12.57], offset: { x: 85, y: -40 } },
      { id: 'ladee-dust', label: 'Lunar Dust Experiment (LDEX)', position: [-12.56, -8.44, 12.07], offset: { x: -85, y: 35 } },
      { id: 'ladee-cells', label: 'Body Solar Array Panels', position: [-12.66, -7.99, 12.72], offset: { x: -85, y: -30 } }
    ],
    vistaAnchor: [-12.21, -8.24, 12.37]
  },
  {
    id: 'mer-opportunity',
    name: 'OPPORTUNITY',
    codename: 'MER-B // MARS',
    role: 'EXPLORATION ROVER',
    destination: 'mars',
    planet: 'MARS',
    sector: 'SECTOR 02 // PERSEVERANCE VALLEY',
    modelSrc: '/models/mer_rover-opt.glb',
    alt: 'Detailed 3D model of Mars Exploration Rover Opportunity standing on Mars',
    scale: 1.0,
    position: [0, 0, 0],
    rotation: [0, 0.35, 0],
    focusCamPos: [2.5, 1.25, 2.9],
    focusLookAt: [0, 0.65, 0],
    contactShadowRadius: 1.8,
    agency: 'NASA / Caltech JPL',
    launchDate: 'July 7, 2003',
    landingSite: 'Meridiani Planum, Mars (Jan 25, 2004)',
    distanceTraveled: '45.16 km (All-Time Record)',
    operationalTime: '14 Years, 138 Days (5,111 Sols)',
    status: 'Resting in Perseverance Valley',
    tagline: 'The little robot that would not give up.',
    description:
      'Designed for a 90-day mission, Opportunity survived nearly 15 years on Mars. She discovered hematite spherules ("blueberries") proving ancient liquid water, climbed steep crater rims, and completed the first off-world marathon, becoming an immortal robotic legend.',
    lastTelemetry:
      '"My battery is low and it\'s getting dark." — Final communication received June 10, 2018, before a historic planet-encircling dust storm.',
    stats: [
      { label: 'DESIGN LIFE', value: '90 Sols' },
      { label: 'ACTUAL LIFE', value: '5,111 Sols' },
      { label: 'MARATHON', value: '45.16 km' },
      { label: 'PHOTOS', value: '217,594' }
    ],
    hotspots: [
      { id: 'oppy-pancam', label: 'Pancam/Navcam Mast', position: [-0.04, 1.55, 0.34], offset: { x: 80, y: -50 } },
      { id: 'oppy-solar', label: 'Solar Array Wings', position: [0.92, 1.10, -0.29], offset: { x: 85, y: -25 } },
      { id: 'oppy-arm', label: '5-Joint Arm & RAT', position: [-0.04, 0.50, 0.75], offset: { x: -85, y: 35 } },
      { id: 'oppy-wheels', label: 'Rocker-Bogie Mobility', position: [0.98, 0.35, -0.11], offset: { x: 85, y: 45 } }
    ],
    vistaAnchor: [0, 1.6, 0]
  },
  {
    id: 'ingenuity-helicopter',
    name: 'INGENUITY',
    codename: 'MARS 2020 // MARS',
    role: 'AUTONOMOUS SCOUT ROTORCRAFT',
    destination: 'mars',
    planet: 'MARS',
    sector: 'SECTOR 02 // JEZERO CRATER',
    modelSrc: '/models/ingenuity-opt.glb',
    alt: 'Detailed 3D model of Ingenuity Mars Helicopter standing on Mars',
    scale: 0.9,
    position: [-14.0, 0.02, -7.0],
    rotation: [0, 0.8, 0],
    focusCamPos: [-12.8, 1.03, -5.6],
    focusLookAt: [-14.0, 0.48, -7.0],
    contactShadowRadius: 0.85,
    agency: 'NASA / Caltech JPL',
    launchDate: 'July 30, 2020',
    landingSite: 'Jezero Crater, Mars (Feb 18, 2021)',
    distanceTraveled: '17.0 km Total Flight',
    operationalTime: '1,004 Sols (72 Completed Flights)',
    status: 'Retired at "Valinor Hills"',
    tagline: 'The Wright Brothers moment in the thin skies of Mars.',
    description:
      'A solar-powered autonomous rotorcraft designed as a high-risk tech demo to attempt up to 5 flights in Mars’s ultra-thin atmosphere (1% of Earth\'s density). Ingenuity shattered expectations, completing 72 flights, scouting paths for Perseverance, and proving aerial flight is possible on other worlds.',
    lastTelemetry:
      'On Flight 72 (Jan 18, 2024), one carbon-fiber rotor blade sustained tip damage during an emergency landing. Ingenuity remains healthy and logs daily meteorological readings.',
    stats: [
      { label: 'PLANNED', value: '5 Flights' },
      { label: 'COMPLETED', value: '72 Flights' },
      { label: 'AIR TIME', value: '128.8 min' },
      { label: 'ALTITUDE', value: '24.0 m' }
    ],
    hotspots: [
      { id: 'ing-solar', label: 'Top Solar Array', position: [-14.00, 0.80, -7.00], offset: { x: 85, y: -55 } },
      { id: 'ing-rotor-upper', label: 'Upper Rotor Blade', position: [-13.75, 0.66, -6.85], offset: { x: -85, y: -35 } },
      { id: 'ing-rotor-lower', label: 'Lower Rotor Blade', position: [-14.25, 0.54, -7.15], offset: { x: 85, y: -20 } },
      { id: 'ing-camera', label: 'Nav Eye & Horizon Cam', position: [-13.95, 0.34, -6.90], offset: { x: -85, y: 40 } }
    ],
    vistaAnchor: [-14.0, 0.84, -7.0]
  },
  {
    id: 'viking-lander',
    name: 'VIKING 1 LANDER',
    codename: 'LANDER // MARS',
    role: 'SURFACE SCIENCE STATION',
    destination: 'mars',
    planet: 'MARS',
    sector: 'SECTOR 02 // CHRYSE PLANITIA',
    modelSrc: '/models/viking_lander-opt.glb',
    alt: 'Detailed 3D model of NASA Viking 1 Lander standing on Mars',
    scale: 0.28,
    position: [16.0, -0.08, -8.0],
    rotation: [0, -0.7, 0],
    focusCamPos: [17.6, 1.46, -6.4],
    focusLookAt: [16.0, 0.66, -8.0],
    contactShadowRadius: 1.7,
    agency: 'NASA / Langley / Martin Marietta',
    launchDate: 'August 20, 1975',
    landingSite: 'Chryse Planitia, Mars (July 20, 1976)',
    distanceTraveled: 'Stationary Surface Lab',
    operationalTime: '6 Years, 116 Days (2,245 Sols)',
    status: 'Silent Pioneer in Golden Plains',
    tagline: 'First long-duration surface science station on Mars.',
    description:
      'Viking 1 was the first US spacecraft to safely land on Mars and operate long-term. Equipped with biology labs, seismometers, and robotic soil arms, Viking beamed humanity’s first clear color photographs of red Martian soil and rocky horizons back to Earth.',
    lastTelemetry:
      'Contact was lost on November 13, 1982 when a ground command accidentally modified antenna pointing parameters, permanently silencing the pioneer.',
    stats: [
      { label: 'COLOR PHOTO', value: 'July 1976' },
      { label: 'ACTIVE SOLS', value: '2,245 Sols' },
      { label: 'POWER', value: 'Dual RTGs' },
      { label: 'SOIL DATA', value: 'Analyzed' }
    ],
    hotspots: [
      { id: 'viking-hga', label: 'High-Gain S-Band Dish', position: [16.05, 1.27, -8.25], offset: { x: 85, y: -55 } },
      { id: 'viking-camera', label: 'Surface Facsimile Cameras', position: [15.95, 1.17, -7.85], offset: { x: -85, y: -45 } },
      { id: 'viking-arm', label: 'Soil Sampler Boom & Scoop', position: [16.55, 0.37, -7.65], offset: { x: 85, y: 35 } },
      { id: 'viking-rtg', label: 'SNAP-19 RTG Power', position: [15.55, 0.67, -8.15], offset: { x: -85, y: 30 } }
    ],
    vistaAnchor: [16.0, 1.96, -8.0]
  },
  {
    id: 'insight-lander',
    name: 'INSIGHT LANDER',
    codename: 'INSIGHT // MARS',
    role: 'GEOPHYSICAL SURFACE OBSERVATORY',
    destination: 'mars',
    planet: 'MARS',
    sector: 'SECTOR 02 // ELYSIUM PLANITIA',
    modelSrc: '/models/insight-opt.glb',
    alt: 'Detailed 3D model of InSight Mars lander on Martian plain',
    scale: 1.0,
    position: [0.0, 0, -22.0],
    rotation: [0, -0.6, 0],
    focusCamPos: [2.2, 1.35, -20.2],
    focusLookAt: [0.0, 0.65, -22.0],
    contactShadowRadius: 2.6,
    agency: 'NASA / CNES / DLR / JPL',
    launchDate: 'May 5, 2018',
    landingSite: 'Elysium Planitia, Mars',
    distanceTraveled: 'Stationary Geophysical Station',
    operationalTime: 'Landed 26 Nov 2018 – Retired 21 Dec 2022',
    status: 'Retired 21 Dec 2022 on Mars',
    tagline: 'InSight landed 26 Nov 2018 on Mars.',
    description:
      'InSight landed 26 Nov 2018 on Mars, used a seismometer plus heat and geodesy instruments, dust on the solar panels reduced power, NASA declared it retired 21 Dec 2022 (last contact 15 Dec 2022).',
    lastTelemetry:
      'Dust on the solar panels reduced power. NASA declared it retired 21 Dec 2022 (last contact 15 Dec 2022).',
    stats: [
      { label: 'LANDED', value: '26 Nov 2018' },
      { label: 'RETIRED', value: '21 Dec 2022' },
      { label: 'LAST CONTACT', value: '15 Dec 2022' },
      { label: 'STATUS', value: 'Retired' }
    ],
    hotspots: [
      { id: 'insight-solar', label: 'UltraFlex Solar Array', position: [-2.1, 0.85, -22.0], offset: { x: -85, y: -45 } },
      { id: 'insight-arm', label: 'Instrument Deployment Arm (IDA)', position: [0.75, 0.65, -21.15], offset: { x: 85, y: -35 } },
      { id: 'insight-wts', label: 'Wind and Thermal Shield (WTS)', position: [0.2, 0.78, -22.2], offset: { x: -85, y: 35 } },
      { id: 'insight-antenna', label: 'UHF Relay Antenna & Weather Mast', position: [-0.05, 1.25, -22.15], offset: { x: 85, y: 45 } }
    ],
    vistaAnchor: [0.0, 1.8, -22.0]
  },
  {
    id: 'mgs-orbiter',
    isOrbiter: true,
    name: 'MARS SURVEYOR',
    codename: 'MGS // MAPPING ORBIT',
    role: 'MARS GLOBAL SURVEYOR',
    destination: 'mars',
    planet: 'MARS',
    sector: 'AEROBRAKING ORBIT // ARCHIVE',
    modelSrc: '/models/mgs-opt.glb',
    alt: '3D model of Mars Global Surveyor orbiter',
    scale: 0.024,
    position: [17.13, 0.19, 2.77],
    rotation: [0.1, 0.35, 0],
    focusCamPos: [21.52, 1.84, 5.7],
    focusLookAt: [17.13, 0.19, 2.77],
    contactShadowRadius: 0,
    agency: 'NASA / JPL / Lockheed Martin',
    launchDate: 'November 7, 1996',
    landingSite: 'Sun-synchronous Mars Orbit',
    distanceTraveled: 'Over 20,000 Orbits',
    operationalTime: '10 Years in Martian Orbit (1996-2006)',
    status: 'Permanent Silent Orbit around Mars',
    tagline: 'First comprehensive global surveyor of the Red Planet.',
    description:
      'Mars Global Surveyor revolutionized our understanding of Mars with high-resolution imagery of gullies and mineral maps identifying hematite deposits that guided Opportunity.',
    lastTelemetry:
      'Last contact November 2, 2006, after 10 years of groundbreaking operations.',
    stats: [
      { label: 'ORBITS', value: '20,000+' },
      { label: 'PHOTOS', value: '240,000+' },
      { label: 'SERVICE', value: '10 Years' },
      { label: 'STATUS', value: 'Silent Orbit' }
    ],
    hotspots: [
      { id: 'mgs-dish', label: '1.5m High-Gain Antenna', position: [17.78, 0.64, 2.97], offset: { x: 85, y: -45 } },
      { id: 'mgs-camera', label: 'Mars Orbiter Camera (MOC)', position: [16.73, -0.06, 2.52], offset: { x: -85, y: -35 } },
      { id: 'mgs-solar', label: 'Solar Array & Drag Flaps', position: [15.88, 0.24, 2.87], offset: { x: -85, y: 40 } }
    ],
    vistaAnchor: [17.13, 0.19, 2.77]
  },
  {
    id: 'odyssey-orbiter',
    isOrbiter: true,
    name: 'MARS ODYSSEY',
    codename: '2001 ODYSSEY // MARS',
    role: 'LONGEST SURVIVING MARS ORBITER',
    destination: 'mars',
    planet: 'MARS',
    sector: 'CIRCULAR POLAR ORBIT // ACTIVE',
    modelSrc: '/models/odyssey-opt.glb',
    alt: '3D model of Mars Odyssey 2001 spacecraft',
    scale: 0.065,
    position: [0.15, 6.53, 17.77],
    rotation: [0.2, 0.4, 0],
    focusCamPos: [-2.01, 9.78, 22.29],
    focusLookAt: [0.15, 6.53, 17.77],
    contactShadowRadius: 0,
    agency: 'NASA / JPL / Lockheed Martin',
    launchDate: 'April 7, 2001',
    landingSite: 'Sun-Synchronous Polar Orbit',
    distanceTraveled: 'Over 100,000 Orbits',
    operationalTime: 'Over 23 Years Active (Record Holder)',
    status: 'Longest Continuously Operating Mars Spacecraft',
    tagline: 'Humanity\'s longest-serving scout at another world.',
    description:
      '2001 Mars Odyssey discovered vast deposits of subsurface water ice, mapped global elemental abundances, and relayed key telemetry for Spirit, Opportunity, and Curiosity.',
    lastTelemetry:
      'Continuing orbital thermal emission imaging and rover relay support.',
    stats: [
      { label: 'ACTIVE', value: '23+ Years' },
      { label: 'ORBITS', value: '100,000+' },
      { label: 'RELAY', value: 'UHF Link' },
      { label: 'STATUS', value: 'Operational' }
    ],
    hotspots: [
      { id: 'ody-boom', label: 'GRS Instrument Boom', position: [0.9, 6.88, 18.02], offset: { x: 85, y: -45 } },
      { id: 'ody-themis', label: 'THEMIS Thermal Imager', position: [-0.3, 6.33, 17.57], offset: { x: -85, y: -35 } },
      { id: 'ody-antenna', label: 'High-Gain Parabolic Dish', position: [0.35, 7.13, 17.67], offset: { x: 85, y: 35 } }
    ],
    vistaAnchor: [0.15, 6.53, 17.77]
  },
  {
    id: 'mro-orbiter',
    isOrbiter: true,
    name: 'MRO',
    codename: 'MRO // RECONNAISSANCE',
    role: 'HIGH RESOLUTION RECONNAISSANCE ORBITER',
    destination: 'mars',
    planet: 'MARS',
    sector: 'LOW MARTIAN ORBIT // HI-RES',
    modelSrc: '/models/mro-opt.glb',
    alt: '3D model of Mars Reconnaissance Orbiter with large dish',
    scale: 0.26,
    position: [-17.41, 14.01, -4.08],
    rotation: [0.1, 0.5, 0],
    focusCamPos: [-20.58, 18.57, -7.09],
    focusLookAt: [-17.41, 14.01, -4.08],
    contactShadowRadius: 0,
    agency: 'NASA / JPL / Lockheed Martin',
    launchDate: 'August 12, 2005',
    landingSite: 'Low Mars Polar Orbit',
    distanceTraveled: 'Over 75,000 Orbits',
    operationalTime: '19+ Years in Orbit',
    status: 'Active Primary Reconnaissance & Relay',
    tagline: 'Revealing Martian surface features down to boulder size.',
    description:
      'Equipped with the 0.5m HiRISE telescope camera, MRO captures stunning 30cm/pixel imagery of Mars, photographing landers on the surface and tracking recurring dust storms.',
    lastTelemetry:
      'Operating HiRISE camera and UHF relay supporting surface missions.',
    stats: [
      { label: 'CAMERA', value: 'HiRISE 30cm' },
      { label: 'DATA RETURN', value: '450+ Terabits' },
      { label: 'SERVICE', value: '19+ Years' },
      { label: 'STATUS', value: 'Operational' }
    ],
    hotspots: [
      { id: 'mro-dish', label: '3.0m High-Gain Antenna Dish', position: [-16.56, 14.71, -3.78], offset: { x: 85, y: -50 } },
      { id: 'mro-hirise', label: 'HiRISE High-Resolution Camera', position: [-17.96, 13.66, -4.38], offset: { x: -85, y: -35 } },
      { id: 'mro-solar', label: 'UltraFlex Solar Wings', position: [-18.86, 14.11, -3.93], offset: { x: -85, y: 40 } }
    ],
    vistaAnchor: [-17.41, 14.01, -4.08]
  },
  {
    id: 'maven-orbiter',
    isOrbiter: true,
    name: 'MAVEN',
    codename: 'MAVEN // ATMOSPHERE',
    role: 'ATMOSPHERE & VOLATILE EVOLUTION',
    destination: 'mars',
    planet: 'MARS',
    sector: 'ELLIPTICAL SCIENCE ORBIT',
    modelSrc: '/models/maven-opt.glb',
    alt: '3D model of MAVEN Mars orbiter',
    scale: 0.18,
    position: [3.6, -9.57, -21.08],
    rotation: [0.15, 0.45, 0],
    focusCamPos: [6.51, -9.93, -25.03],
    focusLookAt: [3.6, -9.57, -21.08],
    contactShadowRadius: 0,
    agency: 'NASA / Goddard / Lockheed Martin',
    launchDate: 'November 18, 2013',
    landingSite: 'Elliptical Mars Orbit',
    distanceTraveled: 'Elliptical Upper Atmosphere Dipping',
    operationalTime: '10+ Years in Orbit',
    status: 'Active Atmospheric Evolution Observatory',
    tagline: 'Discovering how Mars lost its atmosphere and water.',
    description:
      'MAVEN studies how the solar wind stripped away the Martian atmosphere over billions of years, transforming Mars from a warm, wet world into today\'s frozen desert.',
    lastTelemetry:
      'Conducting upper atmospheric escape measurements and deep-space communications relay.',
    stats: [
      { label: 'LAUNCH', value: '18 Nov 2013' },
      { label: 'MISSION', value: 'Atmosphere' },
      { label: 'SERVICE', value: '10+ Years' },
      { label: 'STATUS', value: 'Operational' }
    ],
    hotspots: [
      { id: 'maven-boom', label: 'Articulated Payload Boom', position: [4.3, -9.17, -20.88], offset: { x: 85, y: -45 } },
      { id: 'maven-spectrometer', label: 'IUVS Ultraviolet Spectrograph', position: [3.1, -9.77, -21.33], offset: { x: -85, y: -35 } },
      { id: 'maven-solar', label: 'Gull-Wing Solar Arrays', position: [2.25, -9.42, -20.98], offset: { x: -85, y: 40 } }
    ],
    vistaAnchor: [3.6, -9.57, -21.08]
  }
];

const MOON_TERRAIN_URL = '/models/moon_surface-opt.glb';
const EARTH_BACKDROP_URL = '/models/realistic_earth-opt.glb';
const MARS_TERRAIN_URL = '/models/mud_of_mars-opt.glb';
const LUNAR_ROVER_URL = '/models/lunar_rover-opt.glb';
const LUNAR_MODULE_URL = '/models/lunar_module-opt.glb';
const MER_ROVER_URL = '/models/mer_rover-opt.glb';
const INGENUITY_URL = '/models/ingenuity-opt.glb';
const VIKING_URL = '/models/viking_lander-opt.glb';
const INSIGHT_URL = '/models/insight-opt.glb';

const MOON_VISTA_CAM = { pos: [0, 1.8, 14.5], lookAt: [0, 0.9, 0] };
const MARS_VISTA_CAM = { pos: [0, 2.0, 12.0], lookAt: [0, 0.75, -1.0] };
const DEEPSPACE_VISTA_CAM = { pos: [0, 2.0, 14.0], lookAt: [0, 0.5, 0] };

const SHOWROOM_BRIEFINGS = {
  moon: [
    'Lunar Sector telemetry locked — Hadley Rille, Palus Putredinis.',
    'Beneath Earth’s pale rise rests Apollo 15’s Lunar Roving Vehicle, silent since 1971.',
    'Engaging inspection camera on LRV-1...'
  ],
  mars: [
    'Martian telemetry acquired across Meridiani Planum, Jezero Crater, and Chryse Planitia.',
    'Three pioneers remain on watch: Opportunity, Ingenuity, and Viking 1.',
    'Locking onto primary target: Mars Exploration Rover Opportunity...'
  ],
  deepspace: [
    'Deep Space telemetry locked — interstellar void beyond the heliopause.',
    'Distant pioneers sail through cosmic radiation and stellar silence.',
    'Engaging deep space telemetry inspection array...'
  ],
  all: [
    'Deep Space Archive synchronized across lunar regolith and Martian plains.',
    'Four historic spacecraft remain on silent watch across two worlds.',
    'Initiating inspection sequence from Lunar Roving Vehicle...'
  ]
};

// Generates soft ambient-occlusion contact shadow disk under vehicle
function createContactShadowMesh(radius = 1.6, opacity = 0.65) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  grad.addColorStop(0.35, `rgba(0, 0, 0, ${opacity * 0.7})`);
  grad.addColorStop(0.7, `rgba(0, 0, 0, ${opacity * 0.2})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.015;
  return mesh;
}

function clearAndDisposeGroup(group) {
  if (!group) return;
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    disposeObject3D(child);
  }
}

export default function PlanetaryShowroom({
  isOpen,
  onClose,
  initialDestination = 'all',
  onBackToChoice = null
}) {
  const containerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCraftDialogOpen, setIsCraftDialogOpen] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [moreEquipmentOpen, setMoreEquipmentOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [isLoading3D, setIsLoading3D] = useState(true);
  const [loadPercent, setLoadPercent] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [isHudMinimized, setIsHudMinimized] = useState(false);

  // UX Redesign States (Tasks 1, 2, 3, 6)
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [detailTab, setDetailTab] = useState('info'); // 'info' | 'task' | 'quiz'
  const [quizState, setQuizState] = useState({});
  const [isOrbitalView, setIsOrbitalView] = useState(false);
  const [isOrbitTransitioning, setIsOrbitTransitioning] = useState(false);

  const activeLang = useActiveLanguage();
  const storyUi = getStoryUiCopy(activeLang);
  const t = getTranslations(activeLang).showroom;

  const overlayPausedRef = useRef(false);
  overlayPausedRef.current = showStoryModal || moreEquipmentOpen || sourcesOpen || isPauseMenuOpen;

  const threeRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    animFrameId: null,
    terrainGroup: null,
    vehiclesGroup: null,
    loadedVehicles: {},
    currentPlanet: null,
    earthMesh: null,
    orbitLayer: null,
    loadPlanetScene: null,
    syncRenderLoop: null,
    renderOnce: null,
    animating: false,
    animStartTime: 0,
    animDuration: 1600,
    startCamPos: new THREE.Vector3(),
    targetCamPos: new THREE.Vector3(),
    startLookAt: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3()
  });

  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const touchStartTRef = useRef(0);

  // Filter vehicles if locked to one destination
  const activePlanet =
    initialDestination === 'moon'
      ? 'moon'
      : initialDestination === 'mars'
      ? 'mars'
      : initialDestination === 'deepspace'
      ? 'deepspace'
      : 'all';
  const filteredVehicles = VEHICLES_DATA.filter(
    (v) => activePlanet === 'all' || v.destination === activePlanet
  );

  const currentVehicle = filteredVehicles[currentIndex] || filteredVehicles[0];
  const isMoon = currentVehicle?.destination === 'moon';
  const isDeepSpace = currentVehicle?.destination === 'deepspace';

  const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  // Trigger camera fly-to animation (instant snap under prefers-reduced-motion)
  const triggerCameraFly = useCallback(
    (targetPosArr, targetLookAtArr, duration = 1600, cue = 'camera_servo') => {
      const s = threeRef.current;
      if (!s.camera || !s.controls) return;
      if (!Array.isArray(targetPosArr) || !Array.isArray(targetLookAtArr)) return;

      if (prefersReducedMotion() || duration <= 0) {
        s.animating = false;
        setIsTransitioning(false);
        s.camera.position.set(...targetPosArr);
        s.controls.target.set(...targetLookAtArr);
        s.controls.enabled = true;
        s.controls.update();
        s.renderOnce?.();
        if (cue) dispatchAudioCue(cue);
        return;
      }

      s.controls.enabled = false;
      s.startCamPos.copy(s.camera.position);
      s.targetCamPos.set(...targetPosArr);
      s.startLookAt.copy(s.controls.target);
      s.targetLookAt.set(...targetLookAtArr);

      s.animStartTime = performance.now();
      s.animDuration = duration;
      s.animating = true;
      setIsTransitioning(true);
      if (cue) dispatchAudioCue(cue);
      s.syncRenderLoop?.();
    },
    []
  );

  // Switch to specific vehicle with surface <-> orbit dark fade transition (Task 6)
  const selectVehicleIndex = useCallback(
    (idx, autoFly = true, cue = 'vehicle_swipe') => {
      if (idx < 0 || idx >= filteredVehicles.length) return;
      const vehicle = filteredVehicles[idx];
      if (!vehicle) return;

      const currentV = filteredVehicles[currentIndex];
      const isSwitchingOrbit = currentV && Boolean(currentV.isOrbiter) !== Boolean(vehicle.isOrbiter);

      if (isSwitchingOrbit) {
        setIsOrbitTransitioning(true);
        if (cue) dispatchAudioCue(cue);

        setTimeout(() => {
          setIsOrbitalView(Boolean(vehicle.isOrbiter));
          setCurrentIndex(idx);
          setIsDetailsOpen(true);

          const s = threeRef.current;
          if (vehicle.isOrbiter) {
            if (s.terrainGroup) s.terrainGroup.visible = false;
            if (s.vehiclesGroup) s.vehiclesGroup.visible = false;
            s.orbitLayer?.setOrbitalMode(true);
            s.orbitLayer?.select(vehicle.id);
            if (s.scene) {
              s.scene.fog = null;
            }
            if (s.controls) {
              s.controls.maxPolarAngle = Math.PI;
              s.controls.maxDistance = 140.0;
              s.controls.minDistance = 1.0;
            }
          } else {
            if (s.terrainGroup) s.terrainGroup.visible = true;
            if (s.vehiclesGroup) s.vehiclesGroup.visible = true;
            s.orbitLayer?.setOrbitalMode(false);
            s.orbitLayer?.release();
            if (s.scene) {
              if (vehicle.destination === 'mars') {
                s.scene.fog = new THREE.FogExp2(0x1e0b07, 0.014);
              } else {
                s.scene.fog = new THREE.Fog(0x020409, 3500, 7500);
              }
            }
            if (s.controls) {
              s.controls.maxPolarAngle = Math.PI / 2 - 0.02;
              s.controls.maxDistance = 45.0;
              s.controls.minDistance = 1.5;
            }
          }

          if (s.camera && s.controls) {
            s.camera.position.set(...vehicle.focusCamPos);
            s.controls.target.set(...vehicle.focusLookAt);
            s.controls.update();
            s.renderOnce?.();
          }

          setTimeout(() => {
            setIsOrbitTransitioning(false);
          }, 450);
        }, 400);

        return;
      }

      setCurrentIndex(idx);
      setIsDetailsOpen(true);

      const s = threeRef.current;
      if (vehicle.isOrbiter) {
        if (s.terrainGroup) s.terrainGroup.visible = false;
        if (s.vehiclesGroup) s.vehiclesGroup.visible = false;
        s.orbitLayer?.setOrbitalMode(true);
        s.orbitLayer?.select(vehicle.id);
        if (s.scene) {
          s.scene.fog = null;
        }
        if (s.controls) {
          s.controls.maxPolarAngle = Math.PI;
          s.controls.maxDistance = 140.0;
          s.controls.minDistance = 1.0;
        }
      } else {
        if (s.terrainGroup) s.terrainGroup.visible = true;
        if (s.vehiclesGroup) s.vehiclesGroup.visible = true;
        s.orbitLayer?.setOrbitalMode(false);
        s.orbitLayer?.release();
        if (s.scene) {
          if (vehicle.destination === 'mars') {
            s.scene.fog = new THREE.FogExp2(0x1e0b07, 0.014);
          } else {
            s.scene.fog = new THREE.Fog(0x020409, 3500, 7500);
          }
        }
        if (s.controls) {
          s.controls.maxPolarAngle = Math.PI / 2 - 0.02;
          s.controls.maxDistance = 45.0;
          s.controls.minDistance = 1.5;
        }
      }

      if (s.currentPlanet !== vehicle.destination && s.loadPlanetScene) {
        s.loadPlanetScene(vehicle.destination, () => {
          if (autoFly) {
            triggerCameraFly(vehicle.focusCamPos, vehicle.focusLookAt, 1600, cue);
          }
        });
      } else if (autoFly) {
        triggerCameraFly(vehicle.focusCamPos, vehicle.focusLookAt, 1600, cue);
      }
    },
    [filteredVehicles, currentIndex, triggerCameraFly]
  );

  const handleReturnToSurface = useCallback(() => {
    const surfaceIdx = filteredVehicles.findIndex((v) => !v.isOrbiter);
    if (surfaceIdx !== -1) {
      selectVehicleIndex(surfaceIdx, true, 'camera_servo');
    }
  }, [filteredVehicles, selectVehicleIndex]);

  const handleNext = useCallback(() => {
    const nextIdx = (currentIndex + 1) % filteredVehicles.length;
    selectVehicleIndex(nextIdx, true);
  }, [currentIndex, filteredVehicles.length, selectVehicleIndex]);

  const handlePrev = useCallback(() => {
    const prevIdx = (currentIndex - 1 + filteredVehicles.length) % filteredVehicles.length;
    selectVehicleIndex(prevIdx, true);
  }, [currentIndex, filteredVehicles.length, selectVehicleIndex]);

  const handleRetryLoad = useCallback(() => {
    const s = threeRef.current;
    const planet = s.currentPlanet || (initialDestination === 'mars' ? 'mars' : initialDestination === 'deepspace' ? 'deepspace' : 'moon');
    s.loadPlanetScene?.(planet);
  }, [initialDestination]);

  const isDialogVisible = isCraftDialogOpen && !isLoading3D && !loadError;

  const handleCraftDialogComplete = useCallback(() => {
    setIsCraftDialogOpen(false);
    setIsDetailsOpen(true);
    // Always transition to the first vehicle of the active destination
    // (Opportunity on Mars, Lunar Rover on Moon / All, Deep Space Probe on Deep Space).
    selectVehicleIndex(0, true, 'camera_servo');
  }, [selectVehicleIndex]);

  const handleOpenCraftDialog = useCallback(() => {
    const s = threeRef.current;
    const planet = s.currentPlanet || (initialDestination === 'mars' ? 'mars' : initialDestination === 'deepspace' ? 'deepspace' : 'moon');
    const vista = planet === 'mars' ? MARS_VISTA_CAM : planet === 'deepspace' ? DEEPSPACE_VISTA_CAM : MOON_VISTA_CAM;
    s.orbitLayer?.release();
    setIsCraftDialogOpen(true);
    triggerCameraFly(vista.pos, vista.lookAt, 1100, 'camera_servo');
  }, [initialDestination, triggerCameraFly]);

  // Wake/pause render loop when overlay modals open/close
  useEffect(() => {
    threeRef.current.orbitLayer?.setPaused(overlayPausedRef.current);
    threeRef.current.syncRenderLoop?.();
  }, [isCraftDialogOpen, showStoryModal, moreEquipmentOpen, sourcesOpen, isLoading3D, isPauseMenuOpen]);

  // Audio pause/resume effect for pause menu (Task 1)
  useEffect(() => {
    if (isPauseMenuOpen) {
      dispatchAudioCue('surface_ambience_stop');
    } else if (!isLoading3D && !loadError && isOpen) {
      const planet = threeRef.current.currentPlanet || (activePlanet === 'all' ? (currentVehicle?.destination || 'moon') : activePlanet);
      dispatchAudioCue('surface_ambience', { planet });
    }
  }, [isPauseMenuOpen, isLoading3D, loadError, isOpen, activePlanet, currentVehicle]);

  // Touch swipe handlers
  const handleTouchStart = (e) => {
    if (
      e.target.closest(
        'button, a, input, textarea, .showroom-menu-card, .ui-dialogue, .briefing-overlay, .story-hud-modal, .story-modal-backdrop, .showroom-pause-overlay, .showroom-details-panel'
      )
    ) {
      touchStartXRef.current = null;
      return;
    }
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTRef.current = performance.now();
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    const elapsed = performance.now() - touchStartTRef.current;
    touchStartXRef.current = null;

    const flicked = elapsed < 360 && Math.abs(deltaX) > 85 && Math.abs(deltaX) > Math.abs(deltaY) * 2.2;
    if (!flicked || filteredVehicles.length < 2) return;
    if (deltaX > 0) handlePrev();
    else handleNext();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.defaultPrevented) return;

      if (sourcesOpen || moreEquipmentOpen) {
        return;
      }

      if (isPauseMenuOpen) {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          e.stopPropagation();
          setIsPauseMenuOpen(false);
        }
        return;
      }

      if (showStoryModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          setShowStoryModal(false);
        }
        return;
      }

      if (isDialogVisible) {
        // Handled exclusively by MissionBriefingDialog (Enter/Space advance, Esc skips).
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        e.stopPropagation();
        setIsPauseMenuOpen(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isPauseMenuOpen, showStoryModal, isDialogVisible, handleNext, handlePrev, onClose, onBackToChoice]);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    setCurrentIndex(0);
    setIsCraftDialogOpen(true);
    setLoadError(null);

    if (!isWebGLAvailable()) {
      setIsLoading3D(false);
      setLoadError('WebGL 3D rendering is unavailable on this device or browser.');
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    let activeQuality = resolveGraphicsProfile(
      readStoredSettings().graphicsQuality,
      getDeviceQualityProfile()
    );
    let activeSunLight = null;
    let activeContactMeshes = [];

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: activeQuality.antialias,
        alpha: false,
        powerPreference: 'high-performance'
      });
    } catch {
      setIsLoading3D(false);
      setLoadError('Unable to initialize the 3D WebGL context.');
      return;
    }

    const scene = new THREE.Scene();
    threeRef.current.scene = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 8000);
    const dest =
      initialDestination === 'mars'
        ? 'mars'
        : initialDestination === 'deepspace'
        ? 'deepspace'
        : 'moon';
    const initVista =
      dest === 'mars'
        ? MARS_VISTA_CAM
        : dest === 'deepspace'
        ? DEEPSPACE_VISTA_CAM
        : MOON_VISTA_CAM;
    camera.position.set(...initVista.pos);
    threeRef.current.camera = camera;

    renderer.setPixelRatio(getEffectivePixelRatio(activeQuality));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = activeQuality.shadowsEnabled;
    renderer.shadowMap.autoUpdate = activeQuality.shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    threeRef.current.renderer = renderer;

    // PMREMGenerator Environment Map for PBR metal reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(envScene, 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.55;
    envScene.dispose();
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 1.5;
    controls.maxDistance = 45.0;
    controls.target.set(...initVista.lookAt);
    threeRef.current.controls = controls;

    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);
    threeRef.current.terrainGroup = terrainGroup;

    const vehiclesGroup = new THREE.Group();
    scene.add(vehiclesGroup);
    threeRef.current.vehiclesGroup = vehiclesGroup;

    // Starfield Background (Deep Space)
    const MAX_STAR_COUNT = 3000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(MAX_STAR_COUNT * 3);
    for (let i = 0; i < MAX_STAR_COUNT * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 250 + Math.random() * 50;
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = Math.abs(r * Math.cos(phi)) + 5;
      starPositions[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setDrawRange(0, Math.max(100, Math.round(MAX_STAR_COUNT * activeQuality.starScale)));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    let isDisposed = false;
    let contextLost = false;
    let activeAbort = null;
    let loadToken = 0;
    let loadingInProgress = false;
    let isInteracting = false;
    let activeRenderFrames = 0;

    const timer = new THREE.Timer();
    const prevCamPos = new THREE.Vector3().copy(camera.position);
    const prevTarget = new THREE.Vector3().copy(controls.target);

    const stopLoop = () => {
      if (threeRef.current.animFrameId !== null) {
        cancelAnimationFrame(threeRef.current.animFrameId);
        threeRef.current.animFrameId = null;
      }
    };

    const renderOnce = () => {
      if (isDisposed || contextLost || !threeRef.current.renderer) return;
      controls.update();
      renderer.render(scene, camera);
      prevCamPos.copy(camera.position);
      prevTarget.copy(controls.target);
    };
    threeRef.current.renderOnce = renderOnce;

    const needsContinuousLoop = () => {
      if (isDisposed || contextLost || document.hidden || overlayPausedRef.current || loadingInProgress) {
        return false;
      }
      const s = threeRef.current;
      if (s.animating || isInteracting || activeRenderFrames > 0) return true;
      if (s.orbitLayer && !prefersReducedMotion()) return true;
      if (s.earthMesh && !prefersReducedMotion()) return true;
      return false;
    };

    const animate = (time) => {
      if (!needsContinuousLoop()) {
        threeRef.current.animFrameId = null;
        return;
      }

      threeRef.current.animFrameId = requestAnimationFrame(animate);
      timer.update(time);
      const dt = Math.min(timer.getDelta(), 0.05);
      const s = threeRef.current;

      if (s.orbitLayer) {
        s.orbitLayer.update(dt);
      }

      if (s.earthMesh && !prefersReducedMotion()) {
        // 0.036 rad/s matches original 0.0006/frame at 60 FPS across all refresh rates
        s.earthMesh.rotation.y += 0.036 * dt;
      }

      if (s.animating) {
        const elapsed = performance.now() - s.animStartTime;
        const progress = Math.min(elapsed / s.animDuration, 1.0);
        const ease = easeInOutCubic(progress);

        s.camera.position.lerpVectors(s.startCamPos, s.targetCamPos, ease);
        s.controls.target.lerpVectors(s.startLookAt, s.targetLookAt, ease);
        s.camera.lookAt(s.controls.target);

        if (progress >= 1.0) {
          s.animating = false;
          setIsTransitioning(false);
          s.controls.enabled = true;
          s.controls.update();
          activeRenderFrames = 4;
        }
      } else {
        s.controls.update();
        if (activeRenderFrames > 0) {
          const moved =
            prevCamPos.distanceToSquared(s.camera.position) +
            prevTarget.distanceToSquared(s.controls.target);
          activeRenderFrames = moved > 1e-8 ? 3 : activeRenderFrames - 1;
        }
      }

      prevCamPos.copy(s.camera.position);
      prevTarget.copy(s.controls.target);
      s.renderer.render(s.scene, s.camera);
    };

    const syncRenderLoop = () => {
      if (needsContinuousLoop()) {
        if (threeRef.current.animFrameId === null) {
          timer.update();
          threeRef.current.animFrameId = requestAnimationFrame(animate);
        }
      } else {
        stopLoop();
      }
    };
    threeRef.current.syncRenderLoop = syncRenderLoop;

    const wakeDemand = (frames = 12) => {
      activeRenderFrames = Math.max(activeRenderFrames, frames);
      syncRenderLoop();
    };

    const onControlStart = () => {
      isInteracting = true;
      wakeDemand(20);
    };
    const onControlEnd = () => {
      isInteracting = false;
      wakeDemand(24);
    };
    const onControlChange = () => {
      if (!overlayPausedRef.current && !threeRef.current.animating && threeRef.current.animFrameId === null) {
        wakeDemand(8);
      }
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);
    controls.addEventListener('change', onControlChange);

    const onVisibility = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        renderOnce();
        syncRenderLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onContextLost = (e) => {
      e.preventDefault();
      contextLost = true;
      stopLoop();
      setLoadError('Graphics context was temporarily suspended by the browser.');
    };
    const onContextRestored = () => {
      contextLost = false;
      setLoadError(null);
      const current = threeRef.current.currentPlanet || dest;
      threeRef.current.loadPlanetScene?.(current);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // Parallel Planet Scene Builder with cancellation & full GPU disposal
    const loadPlanetScene = async (planetName, onComplete) => {
      activeAbort?.abort();
      const abortController = new AbortController();
      activeAbort = abortController;
      const myToken = ++loadToken;
      const { signal } = abortController;

      loadingInProgress = true;
      stopLoop();
      threeRef.current.currentPlanet = planetName;
      threeRef.current.loadedVehicles = {};
      threeRef.current.earthMesh = null;

      dispatchAudioCue('surface_ambience', { planet: planetName });
      setLoadError(null);
      setIsLoading3D(true);
      setLoadPercent(8);

      if (threeRef.current.orbitLayer) {
        threeRef.current.orbitLayer.dispose();
        threeRef.current.orbitLayer = null;
      }
      clearAndDisposeGroup(terrainGroup);
      clearAndDisposeGroup(vehiclesGroup);
      activeSunLight = null;
      activeContactMeshes = [];

      const registerContactShadow = (radius, opacity, x, y, z) => {
        const contact = createContactShadowMesh(radius, opacity);
        contact.userData.baseOpacity = opacity;
        contact.position.set(x, y, z);
        contact.visible = activeQuality.contactShadowEnabled;
        if (contact.material) {
          contact.material.opacity = opacity * (activeQuality.contactShadowScale ?? 1);
        }
        vehiclesGroup.add(contact);
        activeContactMeshes.push(contact);
        return contact;
      };

      // Weighted concurrent progress tracker
      const progressState = {};
      const reportWeightedProgress = (key, ratio, weight, baseOffset = 8) => {
        if (isDisposed || myToken !== loadToken) return;
        progressState[key] = ratio * weight;
        const total = Object.values(progressState).reduce((acc, v) => acc + v, 0);
        setLoadPercent((prev) => Math.max(prev, Math.min(96, Math.round(baseOffset + total))));
      };

      try {
        if (planetName === 'moon') {
          scene.background = new THREE.Color(0x020409);
          scene.fog = new THREE.Fog(0x020409, 3500, 7500);

          const sunLight = new THREE.DirectionalLight(0xfffaea, 2.45);
          sunLight.position.set(24, 15, 18);
          sunLight.castShadow = activeQuality.shadowsEnabled;
          sunLight.shadow.mapSize.width = activeQuality.shadowSize;
          sunLight.shadow.mapSize.height = activeQuality.shadowSize;
          activeSunLight = sunLight;
          sunLight.shadow.radius = 2.5;
          sunLight.shadow.camera.near = 0.5;
          sunLight.shadow.camera.far = 120;
          sunLight.shadow.camera.left = -24;
          sunLight.shadow.camera.right = 24;
          sunLight.shadow.camera.top = 24;
          sunLight.shadow.camera.bottom = -24;
          sunLight.shadow.bias = -0.00015;
          sunLight.shadow.normalBias = 0.02;
          terrainGroup.add(sunLight);

          const hemiLight = new THREE.HemisphereLight(0x587296, 0x242428, 0.42);
          terrainGroup.add(hemiLight);

          const rimLight = new THREE.DirectionalLight(0x5580aa, 0.45);
          rimLight.position.set(-25, 12, -20);
          terrainGroup.add(rimLight);

          const earthshine = new THREE.DirectionalLight(0x4080bf, 0.6);
          earthshine.position.set(-65, 38, -120);
          earthshine.target.position.set(0, 0, 0);
          terrainGroup.add(earthshine);
          terrainGroup.add(earthshine.target);

          const earthGroup = new THREE.Group();
          earthGroup.position.set(-65, 38, -120);
          terrainGroup.add(earthGroup);
          threeRef.current.earthMesh = earthGroup;

          const earthBaseGeo = new THREE.SphereGeometry(5.6, 36, 36);
          const earthBaseMat = new THREE.MeshStandardMaterial({
            color: 0x1f5fa8,
            roughness: 0.5,
            metalness: 0.05,
            emissive: 0x09264a,
            emissiveIntensity: 0.4
          });
          const earthBaseMesh = new THREE.Mesh(earthBaseGeo, earthBaseMat);
          earthGroup.add(earthBaseMesh);

          const [earthGltf, terrainGltf, roverGltf, lmGltf] = await Promise.all([
            loadGLTFModel(EARTH_BACKDROP_URL, {
              signal,
              cacheBuffer: true,
              onProgress: (r) => reportWeightedProgress('earth', r, 8)
            }).catch((err) => {
              if (err?.name === 'AbortError') throw err;
              console.warn('Realistic earth GLB notice:', err);
              return null;
            }),
            loadGLTFModel(MOON_TERRAIN_URL, {
              signal,
              cacheBuffer: false,
              onProgress: (r) => reportWeightedProgress('terrain', r, 54)
            }),
            loadGLTFModel(LUNAR_ROVER_URL, {
              signal,
              cacheBuffer: true,
              onProgress: (r) => reportWeightedProgress('rover', r, 18)
            }),
            loadGLTFModel(LUNAR_MODULE_URL, {
              signal,
              cacheBuffer: true,
              onProgress: (r) => reportWeightedProgress('lm', r, 12)
            })
          ]);

          if (isDisposed || signal.aborted || myToken !== loadToken) {
            if (earthGltf) disposeObject3D(earthGltf.scene);
            disposeObject3D(terrainGltf.scene);
            disposeObject3D(roverGltf.scene);
            disposeObject3D(lmGltf.scene);
            return;
          }

          if (earthGltf) {
            const earthModel = earthGltf.scene;
            earthModel.scale.setScalar(4.5);
            earthModel.position.set(-0.35, 0, -0.45);
            earthModel.traverse((c) => {
              if (c.isMesh && c.material) {
                c.material.roughness = 0.65;
                c.material.metalness = 0.05;
              }
            });
            earthGroup.remove(earthBaseMesh);
            disposeObject3D(earthBaseMesh);
            earthGroup.add(earthModel);
          }

          const terrain = terrainGltf.scene;
          terrain.traverse((c) => {
            if (c.isMesh) {
              c.receiveShadow = true;
              if (c.material) {
                c.material.roughness = 0.95;
                c.material.metalness = 0.0;
                c.material.envMapIntensity = 0.14;
              }
            }
          });
          terrain.position.set(0, 239.28, 0);
          terrainGroup.add(terrain);

          const rover = roverGltf.scene;
          const lunar = VEHICLES_DATA.find((v) => v.id === 'lunar-rover');
          rover.scale.setScalar(lunar.scale);
          rover.position.set(...lunar.position);
          rover.rotation.set(...lunar.rotation);
          rover.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              const matName = c.material?.name || '';
              if (c.material) {
                if (matName === 'Wheels') {
                  c.material.metalness = 0.55;
                  c.material.roughness = 0.38;
                } else if (matName === 'Antenne') {
                  c.material.metalness = 0.65;
                  c.material.roughness = 0.32;
                } else if (matName === 'Kameralinse') {
                  c.material.metalness = 0.30;
                  c.material.roughness = 0.12;
                } else if (matName === 'Seats') {
                  c.material.metalness = 0.28;
                  c.material.roughness = 0.48;
                } else if (matName === 'ControlPanel') {
                  c.material.metalness = 0.22;
                  c.material.roughness = 0.42;
                } else if (matName === 'Damping') {
                  c.material.metalness = 0.50;
                  c.material.roughness = 0.35;
                } else {
                  c.material.roughness = 0.52;
                  c.material.metalness = 0.20;
                }
                c.material.needsUpdate = true;
              }
            }
          });
          vehiclesGroup.add(rover);
          threeRef.current.loadedVehicles['lunar-rover'] = rover;

          terrain.updateMatrixWorld(true);
          rover.updateMatrixWorld(true);
          const rBox = new THREE.Box3().setFromObject(rover);
          const floorRay = new THREE.Raycaster(
            new THREE.Vector3(rover.position.x, 20, rover.position.z),
            new THREE.Vector3(0, -1, 0)
          );
          const floorHits = floorRay.intersectObject(terrain, true);
          const surfaceY = floorHits.length > 0 ? floorHits[0].point.y : -0.028;
          rover.position.y += surfaceY - 0.01 - rBox.min.y;

          // Stage Apollo Lunar Module (LM-10 Falcon)
          const lm = lmGltf.scene;
          const lmData = VEHICLES_DATA.find((v) => v.id === 'apollo-lunar-module');
          lm.scale.setScalar(lmData.scale);
          lm.position.set(...lmData.position);
          lm.rotation.set(...lmData.rotation);
          lm.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              if (c.material) {
                c.material.metalness = Math.min(Math.max(c.material.metalness ?? 0.45, 0.25), 0.65);
                c.material.roughness = Math.min(Math.max(c.material.roughness ?? 0.42, 0.3), 0.6);
                c.material.envMapIntensity = 0.5;
                c.material.needsUpdate = true;
              }
            }
          });
          vehiclesGroup.add(lm);
          threeRef.current.loadedVehicles['apollo-lunar-module'] = lm;

          registerContactShadow(
            lmData.contactShadowRadius || 3.8,
            0.65,
            lm.position.x,
            lm.position.y + 0.012,
            lm.position.z
          );

          lm.updateMatrixWorld(true);
          const lmBox = new THREE.Box3().setFromObject(lm);
          const lmFloorRay = new THREE.Raycaster(
            new THREE.Vector3(lm.position.x, 30, lm.position.z),
            new THREE.Vector3(0, -1, 0)
          );
          const lmFloorHits = lmFloorRay.intersectObject(terrain, true);
          const lmSurfaceY = lmFloorHits.length > 0 ? lmFloorHits[0].point.y : -0.02;
          lm.position.y += lmSurfaceY - 0.01 - lmBox.min.y;

          // Initialize Moon Orbit Layer (LRO, LADEE)
          if (threeRef.current.orbitLayer) {
            threeRef.current.orbitLayer.dispose();
            threeRef.current.orbitLayer = null;
          }
          threeRef.current.orbitLayer = createOrbitLayer({
            scene,
            destination: 'moon',
            profile: activeQuality,
            signal
          });
        } else if (planetName === 'mars') {
          // ================= MARS SETUP =================
          const MARS_HORIZON_COLOR = 0x1e0b07;
          scene.background = new THREE.Color(MARS_HORIZON_COLOR);
          scene.fog = new THREE.FogExp2(MARS_HORIZON_COLOR, 0.014);

          const sunLight = new THREE.DirectionalLight(0xffc58e, 2.5);
          sunLight.position.set(22, 16, 16);
          sunLight.target.position.set(0, 0, -4);
          sunLight.castShadow = activeQuality.shadowsEnabled;
          sunLight.shadow.mapSize.width = activeQuality.shadowSize;
          sunLight.shadow.mapSize.height = activeQuality.shadowSize;
          activeSunLight = sunLight;
          sunLight.shadow.radius = 2;
          sunLight.shadow.camera.near = 0.5;
          sunLight.shadow.camera.far = 140;
          sunLight.shadow.camera.left = -28;
          sunLight.shadow.camera.right = 28;
          sunLight.shadow.camera.top = 28;
          sunLight.shadow.camera.bottom = -28;
          sunLight.shadow.bias = -0.0001;
          sunLight.shadow.normalBias = 0.02;
          terrainGroup.add(sunLight);
          terrainGroup.add(sunLight.target);

          const hemiLight = new THREE.HemisphereLight(0xffbe85, 0x4a1e12, 0.85);
          terrainGroup.add(hemiLight);

          const rimLight = new THREE.DirectionalLight(0xb06540, 0.55);
          rimLight.position.set(-22, 10, -22);
          terrainGroup.add(rimLight);

          const skirtGeo = new THREE.CircleGeometry(600, 64);
          const skirtMat = new THREE.MeshStandardMaterial({
            color: 0x5d2212,
            roughness: 0.96,
            metalness: 0.0
          });
          const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
          skirtMesh.rotation.x = -Math.PI / 2;
          skirtMesh.position.y = -0.21;
          skirtMesh.receiveShadow = true;
          terrainGroup.add(skirtMesh);

          const duneGeo = new THREE.RingGeometry(85, 175, 64, 8);
          duneGeo.rotateX(-Math.PI / 2);
          const dunePos = duneGeo.attributes.position;
          for (let i = 0; i < dunePos.count; i++) {
            const x = dunePos.getX(i);
            const z = dunePos.getZ(i);
            const distFromCenter = Math.sqrt(x * x + z * z);
            const angle = Math.atan2(z, x);
            const normDist = (distFromCenter - 85) / (175 - 85);
            const rFactor = Math.sin(normDist * Math.PI);
            const wave =
              Math.sin(angle * 7) * 1.8 +
              Math.cos(angle * 13) * 0.9 +
              Math.sin(angle * 23) * 0.4 +
              1.2;
            dunePos.setY(i, wave * rFactor - 0.18);
          }
          dunePos.needsUpdate = true;
          duneGeo.computeVertexNormals();

          const duneMat = new THREE.MeshStandardMaterial({
            color: 0x5a2010,
            roughness: 0.96,
            metalness: 0.0
          });
          const duneMesh = new THREE.Mesh(duneGeo, duneMat);
          duneMesh.position.y = -0.04;
          duneMesh.receiveShadow = true;
          terrainGroup.add(duneMesh);

          const [marsTerrainGltf, oppyGltf, ingGltf, vikingGltf, insGltf] = await Promise.all([
            loadGLTFModel(MARS_TERRAIN_URL, {
              signal,
              cacheBuffer: true,
              onProgress: (r) => reportWeightedProgress('terrain', r, 24)
            }),
            loadGLTFModel(MER_ROVER_URL, {
              signal,
              cacheBuffer: true,
              onProgress: (r) => reportWeightedProgress('oppy', r, 22)
            }),
            loadGLTFModel(INGENUITY_URL, {
              signal,
              cacheBuffer: true,
              onProgress: (r) => reportWeightedProgress('ing', r, 16)
            }),
            loadGLTFModel(VIKING_URL, {
              signal,
              cacheBuffer: true,
              onProgress: (r) => reportWeightedProgress('viking', r, 16)
            }),
            loadGLTFModel(INSIGHT_URL, {
              signal,
              cacheBuffer: true,
              onProgress: (r) => reportWeightedProgress('insight', r, 16)
            })
          ]);

          if (isDisposed || signal.aborted || myToken !== loadToken) {
            disposeObject3D(marsTerrainGltf.scene);
            disposeObject3D(oppyGltf.scene);
            disposeObject3D(ingGltf.scene);
            disposeObject3D(vikingGltf.scene);
            disposeObject3D(insGltf.scene);
            return;
          }

          const marsTerrain = marsTerrainGltf.scene;
          marsTerrain.scale.set(140.0, 35.0, 140.0);
          marsTerrain.position.set(0, 0.319, 0);
          let marsDiffuse = null;
          let marsNorm = null;

          marsTerrain.traverse((c) => {
            if (c.isMesh) {
              c.receiveShadow = true;
              if (c.material) {
                c.material.roughness = 0.92;
                if (c.material.map) {
                  if (!marsDiffuse) marsDiffuse = c.material.map;
                  c.material.map.wrapS = THREE.RepeatWrapping;
                  c.material.map.wrapT = THREE.RepeatWrapping;
                  c.material.map.repeat.set(6, 6);
                }
                if (c.material.normalMap) {
                  if (!marsNorm) marsNorm = c.material.normalMap;
                  c.material.normalMap.wrapS = THREE.RepeatWrapping;
                  c.material.normalMap.wrapT = THREE.RepeatWrapping;
                  c.material.normalMap.repeat.set(6, 6);
                }
              }

              const pos = c.geometry.attributes.position;
              if (pos) {
                const targetEdgeY = -0.015;
                for (let i = 0; i < pos.count; i++) {
                  const x = pos.getX(i);
                  const z = pos.getZ(i);
                  let y = pos.getY(i);
                  const r = Math.sqrt(x * x + z * z);
                  if (r > 0.60) {
                    const t = Math.min((r - 0.60) / 0.40, 1.0);
                    const blend = 0.5 - 0.5 * Math.cos(t * Math.PI);
                    y = y * (1 - blend) + targetEdgeY * blend;
                    pos.setY(i, y);
                  }
                }
                pos.needsUpdate = true;
                c.geometry.computeVertexNormals();
              }
            }
          });

          if (marsDiffuse) {
            const skirtMap = marsDiffuse.clone();
            skirtMap.wrapS = THREE.RepeatWrapping;
            skirtMap.wrapT = THREE.RepeatWrapping;
            skirtMap.repeat.set(36, 36);
            skirtMap.needsUpdate = true;
            skirtMat.map = skirtMap;
            duneMat.map = skirtMap;
          }
          if (marsNorm) {
            const skirtNormalMap = marsNorm.clone();
            skirtNormalMap.wrapS = THREE.RepeatWrapping;
            skirtNormalMap.wrapT = THREE.RepeatWrapping;
            skirtNormalMap.repeat.set(36, 36);
            skirtNormalMap.needsUpdate = true;
            skirtMat.normalMap = skirtNormalMap;
            duneMat.normalMap = skirtNormalMap;
          }
          skirtMat.needsUpdate = true;
          duneMat.needsUpdate = true;
          terrainGroup.add(marsTerrain);

          // Stage Opportunity (MER-B)
          const oppy = oppyGltf.scene;
          const oppyData = VEHICLES_DATA.find((v) => v.id === 'mer-opportunity');
          oppy.scale.setScalar(oppyData.scale);
          oppy.position.set(...oppyData.position);
          oppy.rotation.set(...oppyData.rotation);
          oppy.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              if (c.material) {
                if (c.material.metalness > 0.6) c.material.metalness = 0.35;
                if (c.material.roughness < 0.3) c.material.roughness = 0.45;
              }
            }
          });
          vehiclesGroup.add(oppy);
          threeRef.current.loadedVehicles['mer-opportunity'] = oppy;

          registerContactShadow(
            oppyData.contactShadowRadius || 1.8,
            0.7,
            oppy.position.x,
            oppy.position.y + 0.012,
            oppy.position.z
          );
          oppy.updateMatrixWorld(true);
          const oppyBox = new THREE.Box3().setFromObject(oppy);
          if (oppyBox.min.y < 0) oppy.position.y += -oppyBox.min.y;

          // Stage Ingenuity
          const ing = ingGltf.scene;
          const ingData = VEHICLES_DATA.find((v) => v.id === 'ingenuity-helicopter');
          ing.scale.setScalar(ingData.scale);
          ing.position.set(...ingData.position);
          ing.rotation.set(...ingData.rotation);
          ing.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              if (c.material) {
                if (c.material.metalness > 0.6) c.material.metalness = 0.35;
                if (c.material.roughness < 0.25) c.material.roughness = 0.40;
              }
            }
          });
          vehiclesGroup.add(ing);
          threeRef.current.loadedVehicles['ingenuity-helicopter'] = ing;

          registerContactShadow(
            ingData.contactShadowRadius || 0.85,
            0.65,
            ing.position.x,
            ing.position.y + 0.012,
            ing.position.z
          );
          ing.updateMatrixWorld(true);
          const ingBox = new THREE.Box3().setFromObject(ing);
          const targetGroundY = ingData.position[1];
          if (ingBox.min.y < targetGroundY) ing.position.y += targetGroundY - ingBox.min.y;

          // Stage Viking 1 Lander
          const viking = vikingGltf.scene;
          const vikingData = VEHICLES_DATA.find((v) => v.id === 'viking-lander');
          viking.scale.setScalar(vikingData.scale);
          viking.position.set(...vikingData.position);
          viking.rotation.set(...vikingData.rotation);
          viking.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              if (c.material) {
                c.material.roughness = 0.58;
                c.material.metalness = 0.25;
                if (c.material.color) c.material.color.setRGB(0.82, 0.82, 0.85);
              }
            }
          });
          vehiclesGroup.add(viking);
          threeRef.current.loadedVehicles['viking-lander'] = viking;

          registerContactShadow(
            vikingData.contactShadowRadius || 1.7,
            0.7,
            viking.position.x,
            viking.position.y + 0.012,
            viking.position.z
          );
          viking.updateMatrixWorld(true);
          const vikingBox = new THREE.Box3().setFromObject(viking);
          const targetVikingY = vikingData.position[1];
          if (vikingBox.min.y < targetVikingY) viking.position.y += targetVikingY - vikingBox.min.y;

          // Stage InSight Lander
          const ins = insGltf.scene;
          const insData = VEHICLES_DATA.find((v) => v.id === 'insight-lander');
          ins.scale.setScalar(insData.scale);
          ins.position.set(...insData.position);
          ins.rotation.set(...insData.rotation);
          ins.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              if (c.material) {
                const matName = c.material.name || '';
                if (matName === 'InSIGHT_foil_silver') {
                  c.material.metalness = 0.65;
                  c.material.roughness = 0.28;
                } else {
                  c.material.metalness = Math.min(Math.max(c.material.metalness ?? 0.35, 0.2), 0.6);
                  c.material.roughness = Math.min(Math.max(c.material.roughness ?? 0.45, 0.3), 0.6);
                }
                c.material.envMapIntensity = 0.5;
                c.material.needsUpdate = true;
              }
            }
          });
          vehiclesGroup.add(ins);
          threeRef.current.loadedVehicles['insight-lander'] = ins;

          registerContactShadow(
            insData.contactShadowRadius || 2.6,
            0.7,
            ins.position.x,
            ins.position.y + 0.012,
            ins.position.z
          );
          marsTerrain.updateMatrixWorld(true);
          ins.updateMatrixWorld(true);
          const insBox = new THREE.Box3().setFromObject(ins);
          const insFloorRay = new THREE.Raycaster(
            new THREE.Vector3(ins.position.x, 30, ins.position.z),
            new THREE.Vector3(0, -1, 0)
          );
          const insFloorHits = insFloorRay.intersectObject(marsTerrain, true);
          const insSurfaceY = insFloorHits.length > 0 ? insFloorHits[0].point.y : -0.05;
          ins.position.y += insSurfaceY - 0.01 - insBox.min.y;

          // Initialize Mars Orbit Layer (MGS, Odyssey, MRO, MAVEN, Phobos, Deimos)
          if (threeRef.current.orbitLayer) {
            threeRef.current.orbitLayer.dispose();
            threeRef.current.orbitLayer = null;
          }
          threeRef.current.orbitLayer = createOrbitLayer({
            scene,
            destination: 'mars',
            profile: activeQuality,
            signal
          });
        } else {
          // ================= DEEP SPACE SETUP =================
          scene.background = new THREE.Color(0x000205);
          scene.fog = new THREE.FogExp2(0x000205, 0.003);

          const ambientLight = new THREE.AmbientLight(0x223355, 0.8);
          terrainGroup.add(ambientLight);

          const sunLight = new THREE.DirectionalLight(0xddeeff, 1.8);
          sunLight.position.set(40, 20, 30);
          terrainGroup.add(sunLight);

          const blueRim = new THREE.DirectionalLight(0x4488ff, 0.9);
          blueRim.position.set(-30, -10, -20);
          terrainGroup.add(blueRim);

          // Cosmic dust particles in Deep Space
          const DUST_COUNT = 600;
          const dustGeo = new THREE.BufferGeometry();
          const dustPositions = new Float32Array(DUST_COUNT * 3);
          for (let i = 0; i < DUST_COUNT * 3; i += 3) {
            dustPositions[i] = (Math.random() - 0.5) * 50;
            dustPositions[i + 1] = (Math.random() - 0.5) * 30;
            dustPositions[i + 2] = (Math.random() - 0.5) * 50;
          }
          dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
          const dustMat = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 0.8,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending
          });
          const dustParticles = new THREE.Points(dustGeo, dustMat);
          terrainGroup.add(dustParticles);

          // Sleek holographic beacon / probe representation while awaiting custom models
          const beaconGroup = new THREE.Group();
          beaconGroup.position.set(0, 0, 0);

          const coreGeo = new THREE.SphereGeometry(0.7, 32, 32);
          const coreMat = new THREE.MeshStandardMaterial({
            color: 0x112244,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x0055aa,
            emissiveIntensity: 0.6
          });
          const coreMesh = new THREE.Mesh(coreGeo, coreMat);
          beaconGroup.add(coreMesh);

          const ringGeo = new THREE.TorusGeometry(1.6, 0.04, 16, 64);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0x66ccff,
            transparent: true,
            opacity: 0.75
          });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.rotation.x = Math.PI / 3;
          beaconGroup.add(ringMesh);

          const dishGeo = new THREE.CylinderGeometry(1.4, 0.1, 0.35, 32, 1, true);
          const dishMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.3,
            metalness: 0.8,
            side: THREE.DoubleSide
          });
          const dishMesh = new THREE.Mesh(dishGeo, dishMat);
          dishMesh.rotation.x = -Math.PI / 4;
          dishMesh.position.set(0, 0.6, -0.4);
          beaconGroup.add(dishMesh);

          vehiclesGroup.add(beaconGroup);
          threeRef.current.loadedVehicles['deep-space-probe'] = beaconGroup;

          reportWeightedProgress('deepspace', 1, 90);
        }

        if (isDisposed || signal.aborted || myToken !== loadToken) return;

        loadingInProgress = false;
        setLoadPercent(100);
        setIsLoading3D(false);

        // Always render one crisp frame right away (even if modal overlay blurs above canvas)
        renderOnce();
        if (onComplete) onComplete();
        syncRenderLoop();
      } catch (err) {
        if (err?.name === 'AbortError' || isDisposed || myToken !== loadToken) return;
        loadingInProgress = false;
        console.error(`Failed to load ${planetName} showroom:`, err);
        setIsLoading3D(false);
        setLoadError(`Unable to load 3D ${planetName === 'moon' ? 'Lunar' : 'Martian'} environment assets.`);
      }
    };

    threeRef.current.loadPlanetScene = loadPlanetScene;
    loadPlanetScene(dest);

    const handleResize = () => {
      if (isDisposed || !containerRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getEffectivePixelRatio(activeQuality));
      renderer.setSize(w, h);
      renderOnce();
      syncRenderLoop();
    };
    window.addEventListener('resize', handleResize);

    const onSettingsChange = (e) => {
      if (isDisposed) return;
      const nextQuality = resolveGraphicsProfile(
        e?.detail?.graphicsQuality,
        getDeviceQualityProfile()
      );
      const shadowsToggled = nextQuality.shadowsEnabled !== activeQuality.shadowsEnabled;
      activeQuality = nextQuality;

      if (containerRef.current) {
        const w = containerRef.current.clientWidth || window.innerWidth;
        const h = containerRef.current.clientHeight || window.innerHeight;
        renderer.setPixelRatio(getEffectivePixelRatio(activeQuality));
        renderer.setSize(w, h);
      }

      renderer.shadowMap.enabled = activeQuality.shadowsEnabled;
      renderer.shadowMap.autoUpdate = activeQuality.shadowsEnabled;

      if (activeSunLight) {
        activeSunLight.castShadow = activeQuality.shadowsEnabled;
        if (activeSunLight.shadow.mapSize.width !== activeQuality.shadowSize) {
          activeSunLight.shadow.mapSize.set(activeQuality.shadowSize, activeQuality.shadowSize);
          activeSunLight.shadow.map?.dispose();
          activeSunLight.shadow.map = null;
        }
        activeSunLight.shadow.needsUpdate = activeQuality.shadowsEnabled;
      }

      for (const contactMesh of activeContactMeshes) {
        contactMesh.visible = activeQuality.contactShadowEnabled;
        if (contactMesh.material) {
          const base = contactMesh.userData?.baseOpacity ?? 0.65;
          contactMesh.material.opacity = base * (activeQuality.contactShadowScale ?? 1);
        }
      }

      starGeometry.setDrawRange(0, Math.max(100, Math.round(MAX_STAR_COUNT * activeQuality.starScale)));

      if (shadowsToggled) {
        scene.traverse((obj) => {
          if (!obj.isMesh || !obj.material) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m && 'needsUpdate' in m) m.needsUpdate = true;
          });
        });
      }

      renderOnce();
      syncRenderLoop();
    };
    window.addEventListener('gameSettingsChange', onSettingsChange);

    return () => {
      isDisposed = true;
      activeAbort?.abort();
      threeRef.current.loadPlanetScene = null;
      threeRef.current.syncRenderLoop = null;
      threeRef.current.renderOnce = null;
      dispatchAudioCue('surface_ambience_stop');
      stopLoop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('gameSettingsChange', onSettingsChange);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      if (threeRef.current.orbitLayer) {
        threeRef.current.orbitLayer.dispose();
        threeRef.current.orbitLayer = null;
      }
      clearAndDisposeGroup(terrainGroup);
      clearAndDisposeGroup(vehiclesGroup);
      activeSunLight = null;
      activeContactMeshes = [];
      disposeObject3D(starField);
      scene.environment = null;
      envTexture?.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [isOpen, initialDestination]);

  if (!isOpen) return null;

  return (
    <div
      className="showroom-viewport"
      role="dialog"
      aria-modal="true"
      aria-label={`Showroom: ${currentVehicle.name}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="showroom-webgl-container" />

      {/* Loading HUD Screen while 3D models load */}
      {isLoading3D && !loadError && (
        <div className="showroom-3d-loader" role="status" aria-live="polite">
          <div className="launch-loading-card">
            <Orbit className="launch-loading-icon spin-slow" size={42} />
            <p className="launch-loading-eyebrow">
              {isMoon
                ? 'LUNAR RECONNAISSANCE TELEMETRY'
                : isDeepSpace
                ? 'DEEP SPACE INTERSTELLAR TELEMETRY'
                : 'MARTIAN ORBITAL SURVEY TELEMETRY'}
            </p>
            <h2>DEPLOYING GROUND HORIZON &amp; CRAFT</h2>
            <div className="launch-progress-track">
              <span style={{ width: `${loadPercent}%` }} />
            </div>
            <p className="launch-loading-percent">
              {loadPercent}% <span>· Synchronizing 3D terrain &amp; rovers</span>
            </p>
          </div>
        </div>
      )}

      {/* Graceful Error / WebGL Unavailable Fallback */}
      {loadError && (
        <div className="showroom-3d-loader" role="alert">
          <div className="launch-loading-card">
            <AlertTriangle size={40} style={{ color: '#ff9a6b', marginBottom: 12 }} aria-hidden="true" />
            <p className="launch-loading-eyebrow">TELEMETRY INTERRUPTED</p>
            <h2>3D SURFACE UNAVAILABLE</h2>
            <p className="showroom-error-text">{loadError}</p>
            <div className="showroom-error-actions">
              <button type="button" className="btn btn-primary" onClick={handleRetryLoad}>
                RETRY LOAD
              </button>
              <button type="button" className="btn btn-secondary" onClick={onBackToChoice || onClose}>
                {onBackToChoice ? 'BACK TO DESTINATIONS' : 'RETURN TO MENU'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header HUD Bar — Clean layout with Back/Surface, Destination badge, Counter, and Accessible Pause Button (Task 1) */}
      {!isDialogVisible && (
        <header className="showroom-top-bar" role="banner" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOrbitalView ? (
              <button
                type="button"
                className="showroom-surface-return-btn"
                onClick={handleReturnToSurface}
                aria-label="Return to surface exploration"
                title="Descend back to surface exploration view"
              >
                <Compass size={15} />
                <span className="btn-label">{t.surfaceView || 'SURFACE VIEW'}</span>
              </button>
            ) : (
              <button
                type="button"
                className="showroom-back-btn"
                onClick={onBackToChoice || onClose}
                aria-label={onBackToChoice ? 'Back to Destinations' : 'Back to Main Menu'}
                title={onBackToChoice ? 'Back to Destinations' : 'Back to Main Menu'}
              >
                <ArrowLeft size={16} />
                <span className="btn-label">{t.back || 'BACK'}</span>
              </button>
            )}

            <div className="showroom-destination-badge">
              {isMoon ? <Orbit size={16} /> : isDeepSpace ? <Radio size={16} /> : <Sparkles size={16} />}
              <span>{isOrbitalView ? `${currentVehicle.planet} // ${t.orbitalSpace || 'ORBITAL SPACE'}` : currentVehicle.sector}</span>
            </div>
          </div>

          <div className="showroom-center-indicator">
            <span className="indicator-number">
              VEHICLE 0{currentIndex + 1} // 0{filteredVehicles.length}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="showroom-pause-btn"
              onClick={() => setIsPauseMenuOpen(true)}
              aria-label="Open exploration pause menu"
              title="Pause exploration (Esc or P)"
            >
              <Pause size={14} />
              <span className="btn-label">{t.pause || 'PAUSE'}</span>
            </button>
          </div>
        </header>
      )}

      {/* Task 1: Accessible Pause Menu Modal */}
      {isPauseMenuOpen && (
        <div
          className="showroom-pause-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Exploration Paused"
          dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPauseMenuOpen(false);
          }}
        >
          <div className="showroom-pause-modal">
            <button
              type="button"
              className="showroom-pause-close-btn"
              onClick={() => setIsPauseMenuOpen(false)}
              aria-label="Resume exploration"
              title="Resume exploration (Esc or P)"
            >
              <X size={16} />
            </button>

            <div className="showroom-pause-header">
              <span className="showroom-pause-eyebrow">
                {currentVehicle.planet} // SIMULATION HALTED
              </span>
              <h2 className="showroom-pause-title">{t.paused || 'EXPLORATION PAUSED'}</h2>
            </div>

            <div className="showroom-pause-actions">
              <button
                type="button"
                className="pause-action-btn is-primary"
                onClick={() => setIsPauseMenuOpen(false)}
              >
                <Play size={18} />
                <span>{t.resume || 'RESUME EXPLORATION'}</span>
              </button>

              <button
                type="button"
                className="pause-action-btn"
                onClick={() => {
                  setIsPauseMenuOpen(false);
                  handleOpenCraftDialog();
                }}
              >
                <Layers size={18} />
                <span>{t.spacecrafts || 'SPACECRAFTS'}</span>
              </button>

              <button
                type="button"
                className="pause-action-btn"
                onClick={() => {
                  setIsPauseMenuOpen(false);
                  playServo('fly');
                  setMoreEquipmentOpen(true);
                }}
              >
                <Archive size={18} />
                <span>{t.moreEquipment || 'MORE EQUIPMENT'}</span>
              </button>

              <button
                type="button"
                className="pause-action-btn"
                onClick={() => {
                  setIsPauseMenuOpen(false);
                  setSourcesOpen(true);
                }}
              >
                <FileText size={18} />
                <span>SOURCES &amp; VERIFICATION</span>
              </button>

              {onBackToChoice && (
                <button
                  type="button"
                  className="pause-action-btn"
                  onClick={() => {
                    setIsPauseMenuOpen(false);
                    onBackToChoice();
                  }}
                >
                  <RotateCcw size={18} />
                  <span>{t.changeDest || 'CHANGE DESTINATION'}</span>
                </button>
              )}

              <button
                type="button"
                className="pause-action-btn is-danger"
                onClick={() => {
                  setIsPauseMenuOpen(false);
                  onClose();
                }}
              >
                <X size={18} />
                <span>{t.exitToMenu || 'EXIT TO MAIN MENU'}</span>
              </button>
            </div>

            <p className="showroom-pause-footer-hint">
              Press ESC or P to resume • Touch controls enabled
            </p>
          </div>
        </div>
      )}

      {/* Task 3: Mission Details Panel with Info, Task, Quiz tabs */}
      {!isDialogVisible && isDetailsOpen && (
        <aside className="showroom-details-panel" role="region" aria-label="Mission Details">
          <div className="details-top-header">
            <div className="details-title-group">
              <p className="details-eyebrow">
                {currentVehicle.planet} // {currentVehicle.status}
              </p>
              <h2 className="details-main-title">{currentVehicle.name}</h2>
              <span className="details-subtitle">{currentVehicle.codename} • {currentVehicle.role}</span>
            </div>

            <button
              type="button"
              className="details-close-btn"
              onClick={() => setIsDetailsOpen(false)}
              aria-label="Close details and inspect 3D model"
              title="Close panel to inspect 3D model unobstructed"
            >
              <Eye size={13} />
              <span>VIEW MODEL</span>
              <X size={13} />
            </button>
          </div>

          {/* 3 Tabs Bar: Info, Task, Quiz */}
          <nav className="details-tabs-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === 'info'}
              className={`details-tab-btn ${detailTab === 'info' ? 'is-active' : ''} ${!isMoon ? 'is-mars' : ''}`}
              onClick={() => setDetailTab('info')}
            >
              <Info size={14} />
              <span>{t.infoTab || 'INFO'}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === 'task'}
              className={`details-tab-btn ${detailTab === 'task' ? 'is-active' : ''} ${!isMoon ? 'is-mars' : ''}`}
              onClick={() => setDetailTab('task')}
            >
              <CheckCircle2 size={14} />
              <span>{t.taskTab || 'TASK'}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={detailTab === 'quiz'}
              className={`details-tab-btn ${detailTab === 'quiz' ? 'is-active' : ''} ${!isMoon ? 'is-mars' : ''}`}
              onClick={() => setDetailTab('quiz')}
            >
              <HelpCircle size={14} />
              <span>{t.quizTab || 'QUIZ'}</span>
            </button>
          </nav>

          {/* Tab Content Body */}
          <div className="details-content-scroll">
            {detailTab === 'info' && (
              <>
                <p className="details-section-quote">"{currentVehicle.tagline}"</p>

                <div className="details-telemetry-grid">
                  {currentVehicle.stats.map((stat, i) => (
                    <div key={i} className="details-telemetry-cell">
                      <span className="details-cell-label">{stat.label}</span>
                      <span className="details-cell-value">{stat.value}</span>
                    </div>
                  ))}
                </div>

                <p className="details-description-text">{currentVehicle.description}</p>

                <div className="details-meta-list">
                  <div className="details-meta-item">
                    <span>AGENCY</span>
                    <strong>{currentVehicle.agency}</strong>
                  </div>
                  <div className="details-meta-item">
                    <span>LAUNCH</span>
                    <strong>{currentVehicle.launchDate}</strong>
                  </div>
                  <div className="details-meta-item">
                    <span>LOCATION</span>
                    <strong>{currentVehicle.landingSite}</strong>
                  </div>
                  <div className="details-meta-item">
                    <span>LIFESPAN</span>
                    <strong>{currentVehicle.operationalTime}</strong>
                  </div>
                  <div className="details-meta-item">
                    <span>TRAVERSE</span>
                    <strong>{currentVehicle.distanceTraveled}</strong>
                  </div>
                </div>
              </>
            )}

            {detailTab === 'task' && (() => {
              const activeStory = getCraftStory(currentVehicle.id, activeLang);
              return (
                <>
                  <div className="details-task-card">
                    <h3 className="details-task-heading">HISTORICAL MISSION TASK</h3>
                    <p className="details-task-body">
                      {activeStory?.story?.question || currentVehicle.tagline}
                    </p>
                    {activeStory?.story?.experiment && (
                      <p className="details-task-body" style={{ marginTop: '6px' }}>
                        {activeStory.story.experiment}
                      </p>
                    )}
                  </div>

                  <div className="details-task-card">
                    <h3 className="details-task-heading">ARCHIVE TELEMETRY LOG</h3>
                    <p className="details-task-body">
                      {currentVehicle.lastTelemetry}
                    </p>
                  </div>

                  {activeStory?.visitDecision && (
                    <div className="details-task-card">
                      <h3 className="details-task-heading">HERITAGE PRESERVATION GUIDANCE</h3>
                      <p className="details-task-body">
                        {activeStory.visitDecision.keepDistanceOutcome || activeStory.visitDecision.approachOutcome}
                      </p>
                    </div>
                  )}

                  {currentVehicle.hotspots && currentVehicle.hotspots.length > 0 && (
                    <div className="details-task-card">
                      <h3 className="details-task-heading">KEY SCIENTIFIC INSTRUMENTS</h3>
                      <div className="details-instruments-list">
                        {currentVehicle.hotspots.map((h) => (
                          <div key={h.id} className="details-instrument-chip">
                            <span className="details-instrument-dot" />
                            <span>{h.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {detailTab === 'quiz' && (() => {
              const activeStory = getCraftStory(currentVehicle.id, activeLang);
              const quiz = activeStory?.quiz;
              const currentQuizState = quizState[currentVehicle.id] || { selectedIndex: null, isSubmitted: false };
              const isAnswered = currentQuizState.isSubmitted;
              const isCorrect = isAnswered && currentQuizState.selectedIndex === quiz?.correctIndex;

              if (!quiz) {
                return (
                  <p className="details-task-body">No knowledge check quiz registered for this craft.</p>
                );
              }

              return (
                <div className="details-quiz-box">
                  <p className="details-quiz-prompt">{quiz.prompt}</p>

                  <div className="details-quiz-options">
                    {quiz.options.map((option, optIdx) => {
                      const isOptionSelected = currentQuizState.selectedIndex === optIdx;
                      let optionClass = 'details-quiz-option-btn';
                      if (isAnswered) {
                        if (optIdx === quiz.correctIndex) optionClass += ' is-correct';
                        else if (isOptionSelected) optionClass += ' is-incorrect';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          className={optionClass}
                          disabled={isAnswered}
                          onClick={() => {
                            setQuizState((prev) => ({
                              ...prev,
                              [currentVehicle.id]: { selectedIndex: optIdx, isSubmitted: true }
                            }));
                            playServo('click');
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <>
                      <div className={`details-quiz-feedback ${!isCorrect ? 'is-incorrect-banner' : ''}`}>
                        <strong>{isCorrect ? (t.verifiedKnowledge || '✓ VERIFIED KNOWLEDGE') : (t.reviewArchive || '⚠️ REVIEW THE ARCHIVE')}</strong>
                        <p style={{ margin: '6px 0 0' }}>{quiz.explanation}</p>
                      </div>

                      {!isCorrect && (
                        <button
                          type="button"
                          className="details-quiz-retry-btn"
                          onClick={() => {
                            setQuizState((prev) => ({
                              ...prev,
                              [currentVehicle.id]: { selectedIndex: null, isSubmitted: false }
                            }));
                          }}
                        >
                          {t.tryAgain || 'TRY AGAIN'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </aside>
      )}

      {/* Floating Reopen Button if details closed */}
      {!isDialogVisible && !isDetailsOpen && (
        <button
          type="button"
          className="showroom-open-details-btn"
          onClick={() => setIsDetailsOpen(true)}
          aria-label="Open mission details"
        >
          <Info size={16} />
          <span>MISSION DETAILS [INFO • TASK • QUIZ]</span>
        </button>
      )}

      {/* 3D Camera Controls Hint */}
      {!isDialogVisible && (
        <div className="showroom-controls-hint" aria-hidden="true" dir={activeLang === 'ar' ? 'rtl' : 'ltr'}>
          <RotateCw size={14} />
          <span>{t.controlsHint || 'DRAG TO ORBIT • PINCH / SCROLL TO ZOOM • ARROWS TO SWITCH CRAFT'}</span>
        </div>
      )}

      {/* Side Navigation Arrows (Item 3, media_1794609980081_8ba58ad9) */}
      {!isDialogVisible && filteredVehicles.length > 1 && (
        <>
          <button
            type="button"
            className="showroom-side-nav-btn showroom-side-nav-left"
            onClick={handlePrev}
            aria-label="Previous spacecraft"
            title="Previous spacecraft"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="showroom-side-nav-btn showroom-side-nav-right"
            onClick={handleNext}
            aria-label="Next spacecraft"
            title="Next spacecraft"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </>
      )}

      {/* Bottom Center Vehicle Title & Minimal Dots (Item 3, media_1794609980081_8ba58ad9) */}
      {!isDialogVisible && filteredVehicles.length > 1 && (
        <footer className="showroom-bottom-dock" role="navigation" aria-label="Vehicle Selector">
          <span className="showroom-dock-title">
            {currentVehicle.name} {currentVehicle.isOrbiter ? '• ORBITER' : ''}
          </span>

          <div className="showroom-dock-dots" role="tablist">
            {filteredVehicles.map((v, idx) => (
              <button
                key={v.id}
                type="button"
                className={`showroom-dock-dot ${idx === currentIndex ? 'is-active' : ''}`}
                onClick={() => selectVehicleIndex(idx, true)}
                aria-label={`Select ${v.name}${v.isOrbiter ? ' (Orbiter)' : ''}`}
                title={`${v.name}${v.isOrbiter ? ' [Orbiter]' : ''}`}
              />
            ))}
          </div>
        </footer>
      )}

      {/* Task 6: Surface <-> Orbit Dark Transition Fade Overlay */}
      <div
        className={`showroom-orbital-fade ${isOrbitTransitioning ? 'is-active' : ''}`}
        aria-hidden="true"
      />

      {/* Bottom Typewriter Briefing Dialog — transitions directly to first spacecraft */}
      <MissionBriefingDialog
        isOpen={isDialogVisible}
        onComplete={handleCraftDialogComplete}
        lines={SHOWROOM_BRIEFINGS[activePlanet] || SHOWROOM_BRIEFINGS.all}
        speaker="MISSION CONTROL"
        ariaLabel="Spacecraft Mission Briefing"
        overlayClassName="ui-overlay briefing-overlay showroom-briefing-overlay"
        secondaryAction={{
          label: storyUi.moreEquipmentBtn,
          onClick: () => {
            playServo('fly');
            setIsCraftDialogOpen(false);
            setMoreEquipmentOpen(true);
          },
        }}
      />

      {/* Lazy-loaded Task 5 Archive Modal & Task 7 Sources Modal */}
      {moreEquipmentOpen && (
        <Suspense fallback={null}>
          <MoreEquipmentModal
            isOpen={moreEquipmentOpen}
            onClose={() => setMoreEquipmentOpen(false)}
            lang={activeLang}
            onOpenSources={() => setSourcesOpen(true)}
          />
        </Suspense>
      )}

      {sourcesOpen && (
        <Suspense fallback={null}>
          <SourcesModal
            isOpen={sourcesOpen}
            onClose={() => setSourcesOpen(false)}
            lang={activeLang}
          />
        </Suspense>
      )}

      {/* Mission History Detailed Modal */}
      {showStoryModal && (
        <div
          className="story-details-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStoryModal(false);
          }}
        >
          <div className="menu-content story-details-card">
            <div className="hud-frame" aria-hidden="true">
              <span className="corner corner-tl" />
              <span className="corner corner-tr" />
              <span className="corner corner-bl" />
              <span className="corner corner-br" />
            </div>

            <p className="eyebrow">
              <Info size={14} />
              {currentVehicle.agency} // MISSION LOG
            </p>

            <h2 className="game-title" style={{ fontSize: '28px', marginBottom: '12px' }}>
              {currentVehicle.name}
            </h2>

            <p className="story-details-body">{currentVehicle.description}</p>

            <div className="story-details-meta">
              <div>
                <strong>LAUNCH:</strong> {currentVehicle.launchDate}
              </div>
              <div>
                <strong>LANDING SITE:</strong> {currentVehicle.landingSite}
              </div>
              <div>
                <strong>LIFESPAN:</strong> {currentVehicle.operationalTime}
              </div>
              <div>
                <strong>ODOMETRY:</strong> {currentVehicle.distanceTraveled}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '20px' }}
              onClick={() => setShowStoryModal(false)}
            >
              <span className="btn-label">CLOSE LOG</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
