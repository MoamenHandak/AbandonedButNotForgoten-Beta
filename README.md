# 🚀 Abandoned, But Not Forgotten

> **NASA Space Apps Challenge 2026**  
> *An interactive narrative journey and 3D planetary showroom honoring human robotic pioneers left resting across the Moon, Mars, and deep space.*

[![React](https://img.shields.io/badge/React-18.x-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r187-black.svg?style=flat-square&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Bilingual](https://img.shields.io/badge/Languages-EN%20%7C%20AR-orange.svg?style=flat-square)](#-bilingual-support-en--ar)

---

## 🌌 Project Overview

**Abandoned, But Not Forgotten** transforms real NASA mission telemetry and historical archives into an emotionally resonant, interactive 3D web experience. 

Through the eyes of **Luna**—a young student who discovers her grandfather's vintage NASA mission logbook—players embark on an educational odyssey across the solar system. Discover the frozen machines that paved the way for human space exploration: from the Apollo Lunar Roving Vehicle sitting in Hadley Rille to Opportunity resting in Perseverance Valley and the active orbiters still relaying signals from the skies above.

---

## ✨ Key Features

### 📖 Visual Novel Story Campaign
- **Immersive Full-Screen Cutscenes**: Borderless `100dvh` artwork featuring Ken Burns ambient motion, cross-fades, and atmospheric vignettes.
- **Dynamic Character Cut-out**: Luna features subtle idle breathing and facial expression swaps responding to dialogue.
- **Grandpa's NASA Logbook**: When the logbook speaks, Luna dims subtly while a glowing vintage mission logbook illuminates the scene with warm amber light.
- **Unified HUD Dialogue Box**: Clean, rounded dark card with 1px white border, high-contrast typography, bold keyword highlights, and seamless keyboard (`Space`/`Enter`) and touch advancement.
- **Linear Moon-First Progression**: In Story Mode, Sector 01 (The Moon) is the starting destination. Sector 02 (Mars) is strictly locked until the player completes all Moon spacecraft quizzes. Unlocking subsequent spacecraft requires passing interactive technical quizzes, synced via `localStorage` (`abnf_story_progression_v1`).

### 🪐 Dual Surface & Orbital Showroom
- **Surface Exploration**: Walk the cratered plains of the Moon or the red dunes of Mars in 360° detail with realistic PBR regolith, dust fog, and accurate sun lighting.
- **Circumplanetary Orbital Layer**: Toggle into **Orbit View** to observe full 3D planetary globes with true elliptical orbital trajectories, real-time orbiter propagation, and natural satellites (Phobos & Deimos).
- **Cinematic Orbit Overview Phase**: Experience a wide-angle celestial view of all orbiting sentinels before diving down to inspect individual spacecraft.
- **3D HUD Hotspots & Dynamic Leader Lines**: Inspect color TV cameras, high-gain parabolic antennas, robotic sampling arms, and solar arrays with dynamic SVG projection lines linked to physical components.

### 🔊 Comprehensive Audio Engine (Soundtracks & Procedural Synthesis)
- **Menu Theme (`/audio/menu_theme.mp3`)**: Seamlessly loops across the Title Splash screen and continues through the Main Navigation Menu behind it.
- **Story Music (`/audio/story_music.mp3`)**: Loops during the visual-novel prologue dialogue sequence before choosing the destination.
- **Space Music (`/audio/space_music.mp3`)**: Loops continuously across the entirety of 3D space (Moon surface/orbit, Mars surface/orbit, and Arcade mode).
- **Atmospheric Procedural Ambience**: 100% procedural sound generation via the Web Audio API for thin modulated Martian winds, deep 58Hz Lunar vacuum hum, cold-gas thruster bursts, and mechanical servo sweeps.
- **Settings & Volume Integration**: Fully synchronized with global Master Volume, Music Volume, and Mute controls from the in-game Settings modal.

### 📱 Handheld & Mobile-First Optimization
- **Full Viewport Safety**: Built with `100dvh` and dynamic `--vh` fallback for seamless viewing on iPhone Safari and Android browsers without URL bar clipping.
- **Safe Area Insets**: Elements adapt automatically to device notches and bottom home indicators (`env(safe-area-inset-*)`).
- **Mobile Showroom Architecture**: Features a dedicated 45%+ height 3D canvas zone, 48px circular lateral navigation buttons, collapsible compact info dock, and a swipeable 70dvh Details bottom sheet.

### 🌐 Bilingual Support (EN / AR)
- Complete native English and Arabic translation dictionaries across all story scenes, vehicle dossiers, quizzes, settings, and credits.
- Logical CSS property architecture (`padding-inline`, `margin-inline`) ensuring 100% stabilized RTL layout without broken controls.

---

## 🛰️ Spacecraft Roster (12 Robotic Pioneers)

| Destination | Domain | Spacecraft | Mission Highlights |
| :--- | :--- | :--- | :--- |
| **The Moon** | Surface | **Apollo Lunar Roving Vehicle (LRV)** | Humanity's first electric off-world wheels (Apollo 15, 16, 17). |
| | Surface | **Apollo 15 Lunar Module (Falcon)** | Descent stage preserved at Hadley-Apennine as a launch platform. |
| | Orbit | **Lunar Reconnaissance Orbiter (LRO)** | 15+ years of high-resolution polar topography mapping. |
| | Orbit | **LADEE Atmosphere Explorer** | Lunar exosphere dust investigation & laser comms demonstration. |
| **Mars** | Surface | **MER-B Opportunity Rover** | 14-year marathon explorer (45.16 km) in Meridiani Planum. |
| | Surface | **Ingenuity Mars Helicopter** | First powered flight on another world (72 completed flights). |
| | Surface | **Viking 1 Lander** | First successful long-duration surface science station on Mars. |
| | Surface | **InSight Mars Lander** | Geophysical station that detected over 1,300 marsquakes. |
| | Orbit | **Mars Global Surveyor (MGS)** | Discovered ancient hematite water deposits that guided Opportunity. |
| | Orbit | **2001 Mars Odyssey** | Humanity's longest-serving scout at another world (23+ years). |
| | Orbit | **Mars Reconnaissance Orbiter (MRO)** | HiRISE 30cm/pixel imagery and crucial surface rover relay bridge. |
| | Orbit | **MAVEN Atmospheric Observatory** | Investigating the loss of Martian atmospheric gases to space. |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite 6, Vanilla CSS (Design tokens, NMS typography)
- **3D Engine**: Three.js (`three@0.187.0`), WebGL, PBR Shader Materials
- **Asset Pipeline**: Draco WASM Decoders (`/public/draco/`), WebP texture compression via `@gltf-transform/cli`
- **Audio**: Web Audio API (procedural oscillators, noise buffers, biquad filters, gain nodes)
- **State & Progression**: `localStorage` state machine + custom event bus (`storyProgressionUpdated`, `gameAudioCue`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or later recommended)
- npm or yarn

### Installation
```bash
# Clone repository
git clone https://github.com/MoamenHandak/AbandonedButNotForgoten-Beta.git
cd "NASA hackton"

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open `http://localhost:3000` in your web browser.

### Production Build
```bash
npm run build
npm run preview
```

### 3D Model Optimization Pipeline
To optimize raw source models from `models/` into runtime Draco/WebP assets in `public/models/`:
```bash
npm run optimize:models
```

---

## 📚 Complete Technical Documentation

For in-depth architectural specifications, camera auto-framing math, part hotspot coordinates, and procedural audio schemas, see the complete [PROJECT_DOCUMENTATION.md](file:///c:/Users/pc/OneDrive/Desktop/NASA%20hackton/PROJECT_DOCUMENTATION.md).

---

## 🏆 Credits & Digital Archives

- **NASA 3D Resources**: Science Visualization Studio, Jet Propulsion Laboratory (JPL), Ames Research Center, Langley Research Center, and Goddard Space Flight Center.
- **Sketchfab 3D Community**: Historical spacecraft reconstructions and planetary open-source telemetry models.
- **Original Soundtracks via YouTube**: Space ambient tracks, story prologue scores, and planetary exploration music.
- **NASA Space Apps Hackathon Team**: Dedicated to every machine left among the stars.
