<div align="center">

# 🛰️ Abandoned But Not Forgotten

**An interactive narrative and 3D exploration experience honoring the historic spacecraft left behind on the Moon and Mars.**

*Built for the NASA Space Apps Hackathon by Team **Beyond The Dust***

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-0.187.0-000000?logo=threedotjs&logoColor=white)
![Web Audio](https://img.shields.io/badge/Web%20Audio-API-orange)
![Languages](https://img.shields.io/badge/Languages-EN%20%7C%20AR-blue)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 📖 About

**Abandoned But Not Forgotten** transforms real NASA mission telemetry and historical archives into an emotionally resonant, interactive 3D web experience. Players follow **Luna**, a young student who discovers her grandfather's vintage NASA mission logbook, and embark on an educational odyssey across the solar system to revisit **12 historic robotic spacecraft** across lunar and Martian surfaces and orbits.

> *"To remember is to bring them home."*

Inspect each craft in 3D, explore calibrated part hotspots with live telemetry leader lines, read technical dossiers, and pass knowledge-check quizzes to advance through the campaign.

---

## ✨ Features

- 🎭 **Visual-Novel Story Campaign**: Fully immersive 5-shot cinematic prologue with animated character cut-outs, glowing vintage NASA logbook, and unified HUD dialogue box.
- 🚀 **12 Historic Spacecraft Fleet**: Ground vehicles, landers, and orbiters across the Moon and Mars, each with calibrated 3D models, mission dossiers, tasks, and quizzes.
- 🌍 **Dual Surface & Orbital Showroom**:
  - **Surface View**: High-fidelity PBR terrains for the lunar crater and Martian regolith, rotating Earthrise on the Moon, and atmospheric dust fog on Mars.
  - **Orbit View**: Real-time 3D elliptical orbits with celestial propagation, natural satellites (Phobos & Deimos), and a cinematic *Orbit Overview* wide-angle camera.
- 🎯 **3D HUD Hotspots**: Calibrated part pointers with dynamic SVG leader lines projected from 3D world space with frustum culling.
- 🔊 **Comprehensive Hybrid Audio Engine**:
  - **Menu Theme (`/audio/menu_theme.mp3`)**: Seamlessly loops across the Title Splash screen and navigation menu.
  - **Story Music (`/audio/story_music.mp3`)**: Loops during the visual-novel prologue sequence.
  - **Space Music (`/audio/space_music.mp3`)**: Loops continuously across all 3D space exploration (Moon, Mars, and Arcade mode) without interrupting during travel.
  - **Procedural Sound Effects**: 100% procedural Web Audio effects for thruster bursts, servo sweeps, thin Martian winds, and lunar vacuum hum.
- 💾 **Persistent Story Progression**: Moon-first linear progression with sequential quiz unlocks, persisted in `localStorage` (`abnf_story_progression_v1`).
- 🕹️ **Arcade Mode**: Unrestricted exploration across all 12 spacecraft on the Moon and Mars.
- 🎬 **"The End" & Credits Sequence**: Concluding story sequence jumping to the rolling Credits roll honoring Team **Beyond The Dust**, robotic pioneers, model providers, and audio creators.
- 📱 **Mobile-First Viewport Engine**: Full `100dvh` support with `--vh` fallback, safe-area inset handling (`env(safe-area-inset-*)`), and swipeable mobile bottom sheets.
- 🌐 **100% Bilingual**: English and Arabic with full RTL layout support.
- ⚡ **Optimized WebGL Assets**: Draco-compressed 3D meshes, WebP textures, deduplicated singleton loader, and LRU buffer cache.

---

## 🎮 Controls

| Action | Desktop | Mobile / Touch |
| :--- | :--- | :--- |
| **Rotate 3D View** | Click & drag | One-finger swipe |
| **Zoom 3D View** | Mouse scroll wheel | Pinch to zoom |
| **Pan 3D View** | Right-click & drag | Two-finger drag |
| **Previous / Next Spacecraft** | `←` / `→` keys or UI Chevrons | Screen side arrows / swipe |
| **View Details** | `Enter` / click VIEW DETAILS | Tap VIEW DETAILS |
| **Advance Dialogue** | `Space` / `Enter` / click | Tap screen |
| **Pause / Resume Credits** | `Space` / `Esc` | Touch & hold |
| **Orbit Overview / Inspect** | HUD toggle button | HUD toggle button |

---

## 🛠️ Tech Stack

- **Framework**: React 18, Vite 6
- **3D Graphics**: Three.js (r187), Draco Loader, Meshopt Decoder
- **Audio Engine**: Web Audio API (Synthesizers) + HTML5 Audio (Soundtracks)
- **Icons**: Lucide React
- **Deployment**: GitHub Pages (`gh-pages`), Vercel

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/MoamenHandak/AbandonedButNotForgoten-Beta.git
cd AbandonedButNotForgoten-Beta

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

### Building for Production

```bash
# Build for GitHub Pages (default base path: /AbandonedButNotForgoten-Beta/)
npm run build

# Deploy to GitHub Pages
npm run deploy

# Deploy to Vercel
npx vercel --prod
```

---

## 🏆 Credits & Attribution

- **Team**: **Beyond The Dust**
  - **Project Manager & Leader**: Joudy Elgebally
  - **Developers**: Moamen Handak, Ammar
  - **Designers & Presenters**: Sara Ibrahim, Rosal Emad
  - **Researcher**: Ahmed
- **3D Model Providers**: NASA 3D Resources (Science Visualization Studio, JPL, Ames, Langley, Goddard) & Sketchfab 3D Community.
- **Soundtracks**: Atmospheric space ambient, visual-novel score, and exploration themes via YouTube creators.
- **NASA Space Apps Challenge 2026**: Dedicated to every machine left among the stars.

---

<div align="center">

*Dedicated to the robotic pioneers still resting among the stars.* 🌙🔴

</div>
