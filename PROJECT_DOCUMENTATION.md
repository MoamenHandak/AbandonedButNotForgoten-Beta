# "Abandoned But Not Forgotten" — Project Documentation & Architectural Reference

**NASA Space Apps Hackathon Web Application**  
*An interactive narrative and 3D exploration experience documenting historic spacecraft abandoned across the solar system.*

---

## 1. Executive Summary & Tech Stack

"Abandoned But Not Forgotten" is a high-fidelity web application that honors human robotic pioneers left behind across the Moon and Mars. Combining visual-novel storytelling with an interactive Three.js 3D planetary and orbital showroom, the application allows users to explore 12 historic spacecraft across ground-level landscapes and circumplanetary orbits.

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework & UI** | React 18, Vite 6 | Component lifecycle, route/view lazy code splitting (`React.lazy`), fast HMR bundling |
| **3D Graphics & Cel-Shading Engine** | Three.js (`three@0.187.0`), Custom Toon Pipeline (`toonify.js`) | Surface terrains, seamless planetary globes, orbital mechanics layer (`orbitLayer.js`), responsive camera auto-framing (`cameraAutoFit.js`), stepped cel-shading (`MeshToonMaterial`), inverted-hull hero outlines, specular sparkle, and vehicle shadow camera auto-fitting |
| **Graphics Quality Profiles** | Custom Presets (`Ultra`, `Quality`, `Balanced`, `Performance`) | Dynamic pixel ratio caps (up to 2.0x), 4096px/2048px/1024px PCFSoft shadows, wide terrain shadow frustum, cel-shading across ground & spacecraft, cel-shaded crescent Earth with glowing atmospheric halo, dynamic rim lighting, and live settings update (`settings.js`) |
| **Full-Stack Preload & Asset Pipeline** | Multi-Phase Loader (`modelCache.js`), `DRACOLoader` (`/draco/`), WebP textures | Multi-phase boot sequence preloading fonts (`document.fonts.ready`), code chunks, Draco decoders, audio soundtracks, visual novel art, and 3D models with streaming progress and bounded LRU buffer cache |
| **Audio Engine** | Web Audio API Synthesizer | 100% procedural sound synthesis: cold-gas thrusters, mechanical camera servos, Martian winds, Lunar vacuum hum, and polyphonic space ambient music |
| **Progression Engine** | Custom LocalStorage State Machine | Persistent campaign progression (`abnf_story_progression_v1`), destination lock/unlock, sequential craft discovery, and custom event dispatches |
| **Responsive Viewport** | Dynamic `100dvh` + `--vh` Engine | Viewport engine (`viewport.js`) handling dynamic iOS Safari toolbars, notch safe-areas (`env(safe-area-inset-*)`), and mobile collapsible bottom sheets |
| **Design Language** | Vanilla CSS + Lucide React | Unified HUD template: rounded black cards (`rgba(0, 0, 0, 0.95)`), 1px solid white borders, high-contrast typography (white text, bold keywords, zero multi-color clutter), and authentic NASA styling |
| **Localization** | Custom Multilingual Dictionary | Bilingual English and Arabic (`en`, `ar`) with logical CSS properties (`padding-inline`, `margin-inline`) ensuring seamless RTL layout stabilization |

---

## 2. Complete Architecture & Feature Catalog

```mermaid
flowchart TD
    Boot["Full-Stack Boot Loader (Fonts, Code Chunks, Audio, 2D Art, Draco & 3D Assets)"] --> A["Main Menu Splash (Instant Interactive Entry)"]
    A --> B["Main Menu (3D Preview Tiles & Cosmic Background)"]
    B --> C["Story Mode (Visual Novel Prologue & Character Dialogue)"]
    B --> D["Arcade Mode (Direct Spacecraft Archive Showroom)"]
    B --> S["Settings Modal (Audio Volumes, Languages & Graphics Quality Presets)"]
    
    C --> E["Prologue Cutscenes: Bedroom -> Attic -> NASA Logbook Light -> Cosmic Drift"]
    E --> F["Destination Choice Screen (Sector 01 Moon vs. Sector 02 Mars)"]
    F -->|Progression Locked| G["Planetary Showroom (Chosen Sector)"]
    D -->|All Unlocked| G
    
    G --> H{"View Mode Selection"}
    H -->|Surface View| I["Planetary Surface Vista (Cel-Shaded Soil, Terrains & Rovers/Landers)"]
    H -->|Orbit View| J["Cinematic Orbit Overview Phase (Planet Globe & Orbital Paths)"]
    
    I --> K["360° Ground Vehicle Inspection (LRV, Falcon, Opportunity, Ingenuity, Viking, InSight)"]
    J --> L["Orbital Spacecraft Inspection (LRO, LADEE, MGS, Odyssey, MRO, MAVEN)"]
    
    K --> M["Dynamic SVG Leader Lines & Calibrated Part Hotspots"]
    L --> M
    M --> N["Technical Instrument Dossier & Telemetry Readout"]
    N --> O["Knowledge Check Quiz & Educational Verification"]
    O --> P["Luna Reaction Toast (Telemetry Synced Feedback)"]
    P --> Q["Story Progression Engine (Unlocks Next Spacecraft)"]
    Q --> R["All 12 Solved -> Grand Campaign Completion"]
```

---

## 3. Narrative Story Mode & Character Systems

### 3.1 Visual Novel Story Mode Rebuild (`src/components/StoryGame.jsx`, `story.css`)
- **Full-Screen Immersive Canvas**: Replaced legacy 16:9 framed stages with borderless `100vw x 100dvh` cinematic background art (`object-fit: cover`, `object-position: center`) featuring Ken Burns subtle ambient zoom, cross-fades between shots, and soft vignetting.
- **Character Cut-out (Luna)**:
  - Standing character cut-out positioned bottom-left at 75–85vh height with subtle idle breathing animation and entry slide/fade.
  - Dynamically switches expressions (`neutral`, `thinking`, `happy`, `surprised`) synchronized with story dialogue.
- **Grandpa's NASA Logbook Mode**:
  - When the Mission Logbook speaks, Luna dims subtly while a glowing vintage NASA Logbook illustration (`nasa_book_open.webp`) materializes opposite her on the right side of the screen with a warm amber ambient glow.
- **HUD Dialogue Box Template**:
  - Centered at the bottom (85–92% viewport width, max 960px).
  - Dark semi-transparent card (`rgba(0, 0, 0, 0.95)` with 1px light border, `border-radius: 12px`, and backdrop blur).
  - Speaker identification banner sits directly inside the top header of the card in high-contrast cyan/amber.
  - Body text uses clean typography with `**bold**` keyword highlights, strictly eliminating distracting multi-color spans.
  - Keyboard/touch navigation: `Space`, `Enter`, or screen tap advances lines; includes "LOG X / Y" progress counter and instant skip button.
- **Cinematic 5-Shot Sequence**:
  1. *Shot 1*: Luna at her window gazing at the night sky, pondering forgotten robots.
  2. *Shot 2*: Discovering her grandfather's vintage NASA mission logbook in the attic.
  3. *Shot 3*: Opening the logbook as warm golden light erupts: *"To remember is to bring them home."*
  4. *Shot 4*: Holographic celestial projections and orbital trajectories fill the room.
  5. *Shot 5*: Floating above Earth in cosmic space, unlocking Scene 3 (The Destination Choice).

### 3.2 Luna Reaction System (`src/components/LunaReactionToast.jsx`)
- Non-blocking, visual-novel styled toast dialog appearing after successfully passing any spacecraft knowledge quiz in Story Mode.
- Features Luna's circular avatar, telemetry sync icon, and localized reassuring commentary praising the restoration of historic telemetry records.
- Automatically dismisses after 5 seconds or via tap/click.

### 3.3 Campaign Progression Engine (`src/utils/storyProgression.js`)
- **Persistent Key**: `abnf_story_progression_v1` in `localStorage`.
- **Linear Moon-First Progression**: In Story Mode, the Moon (Sector 01) is the mandatory starting sector. Mars (Sector 02) is strictly locked with a warning badge until the player completes all spacecraft quizzes across the Moon (`completedAreas.moon === true`). Once the Moon is conquered, Sector 02 (Mars) unlocks automatically.
- **Sequential Spacecraft Unlocks**: Within a sector, only the first craft is initially unlocked. Subsequent crafts unlock sequentially as the player passes each craft's interactive knowledge quiz.
- **Event Bus Integration**: Dispatches `window.dispatchEvent(new CustomEvent('storyProgressionUpdated'))` and `gameAudioCue` events on every progression change, allowing reactive UI updates across all components.
- **Arcade Mode**: Accessible from the Main Menu, providing unrestricted free-flight access to all 12 spacecraft without progression gating.

---

## 4. Planetary Showroom & 3D Environments

The showroom supports two distinct planetary theaters: **The Moon** and **Mars**. Each theater features both ground-level surface exploration and true 3D circumplanetary orbital flight.

### 4.1 The Complete 12-Spacecraft Fleet

| Destination | Realm | Spacecraft | Role / Historic Context | 3D Model |
| :--- | :--- | :--- | :--- | :--- |
| **The Moon** | Surface | **Apollo Lunar Roving Vehicle (LRV)** | Humanity's first electric rover; parked at Hadley Rille | `lunar_rover-opt.glb` |
| | Surface | **Apollo 15 Lunar Module (Falcon)** | Crewed lander descent stage serving as launch platform | `lunar_module-opt.glb` |
| | Orbit | **Lunar Reconnaissance Orbiter (LRO)** | Polar mapping orbiter mapping lunar topography in sub-meter detail | `lro-opt.glb` |
| | Orbit | **LADEE Atmosphere Explorer** | Tenuous exosphere & dust probe; demonstrated LLCD laser comms | `ladee-opt.glb` |
| **Mars** | Surface | **MER-B Opportunity Rover** | Marathon exploration rover; 5,111 sols in Meridiani Planum | `mer_rover-opt.glb` |
| | Surface | **Ingenuity Mars Helicopter** | First powered aerial flight on another world; 72 flights | `ingenuity-opt.glb` |
| | Surface | **Viking 1 Lander** | First long-duration robotic surface science station on Mars | `viking_lander-opt.glb` |
| | Surface | **InSight Mars Lander** | Geophysical station recording Martian seismic pulses (marsquakes) | `insight-opt.glb` |
| | Orbit | **Mars Global Surveyor (MGS)** | Global cartographer that discovered hematite water deposits | `mgs-opt.glb` |
| | Orbit | **2001 Mars Odyssey** | Longest continuously operating spacecraft at Mars; mapped water ice | `odyssey-opt.glb` |
| | Orbit | **Mars Reconnaissance Orbiter (MRO)** | HiRISE camera providing 30cm/px imaging and UHF relay | `mro-opt.glb` |
| | Orbit | **MAVEN Atmospheric Observatory** | Investigating how solar winds stripped away the Martian atmosphere | `maven-opt.glb` |

### 4.2 Surface View Environments
- **Moon Surface (`moon_surface-opt.glb`)**:
  - Welded single-mesh scene elevation offset to `y = 239.28`, placing the central crater floor at `y = 0.000`.
  - Camera `far = 8000` preserving 10km lunar mountain horizons without flat planar artifacts.
  - Linear vacuum fog (`THREE.Fog(0x020409, 3500, 7500)`) maintaining crystal-clear vacuum clarity within the crater.
  - Rotating 3D Earthrise (`realistic_earth-opt.glb`) positioned at `[-65, 38, -120]` with cool blue directional earthshine.
  - Directional sun radiance (`#fff8ea`, calibrated intensity 1.85) with `THREE.PCFSoftShadowMap`, normal bias calibration, and cool directional Earthshine fill (`#4075a6`) projecting from Earth's sky coordinates `[-65, 38, -120]`.
- **Mars Surface (`mud_of_mars-opt.glb`)**:
  - Scaled horizontally to `140.0` (280m span) and vertically to `35.0` (elevation offset `y = 0.319`).
  - Circular perimeter taper smoothly tapering vertices beyond radius 84m down to the ground skirt (`y = -0.21`).
  - Warm directional solar amber (`#ffdfb8`, intensity 1.80) with consistent 45° sun azimuth, rich terracotta ground bounce fill, and dusty atmospheric fog (`#1e0b07`, density 0.012).
  - Spatial separation of surface fleet: Opportunity at origin `[0, 0, 0]`, Ingenuity at `[-14, 0.02, -7]`, Viking 1 at `[16, -0.08, -8]`, and InSight at `[0, 0, -22]`.

### 4.3 Orbital Mechanics & Orbit Overview Phase (`src/scene/orbitLayer.js`, `cameraAutoFit.js`)
- **Interactive Orbit Layer (`orbitLayer.js`)**:
  - Central 3D planetary globe with PBR surface textures, terminator shadowing, and physical axial spin (`spinSpeed = 0.012–0.014`).
  - Real-time orbital propagation along true 3D elliptical orbits with realistic inclination angles and flight tangents.
  - Martian moons: Phobos and Deimos modeled with elliptical orbits encircling the Red Planet.
  - Glowing HUD orbit trajectories with radial tick markers wrapped directly around the planet sphere.
  - Interactive orbital beacon tags and labels (`LRO`, `LADEE`, `MGS`, `ODY`, `MRO`, `MAVEN`).
- **Cinematic Orbit Overview Phase**:
  - When entering Orbit View (or upon clicking "ORBIT OVERVIEW" in the top HUD), a dedicated overview phase activates.
  - Camera pulls back dynamically to frame the entire planetary globe, all orbital paths, and the natural satellites in a single breathtaking vista.
  - Clicking or scrolling forwards transitions smoothly from the global vantage down to hero inspection framing of the selected orbiter.
- **Camera Auto-Fit Engine (`cameraAutoFit.js`)**:
  - Calculates dynamic camera distance based on the object's 3D bounding sphere and the viewport's limiting field of view (limiting vertical FOV in landscape, horizontal FOV in portrait):
    $$d = \frac{r}{\sin(\min(\theta_v, \theta_h) / 2)} \times \text{margin}$$
  - Ensures orbiters never clip, appear oversized, or get obscured by interface panels.

### 4.4 Stylized Cel-Shaded (Toon) Graphics Pipeline (`src/scene/toonify.js`)

To provide an artistic, retro-futuristic aesthetic while maintaining high rendering performance, the application implements a dedicated cel-shading pipeline:

- **1D Ramp DataTexture (`getSharedGradientMap`)**:
  - Uses a singleton 4-tone discrete ramp (`tones: [55, 125, 198, 255]`) mapped onto a 4x1 `DataTexture` with `THREE.NearestFilter` and `THREE.ClampToEdgeWrapping`.
  - Disables mipmap generation (`generateMipmaps = false`) to guarantee razor-sharp, zero-blur tonal bands without fragment overhead while raising the shadow floor (55) to prevent muddy black clipping.
- **Mesh Conversion Engine (`convertMaterialToToon`)**:
  - Converts incoming `MeshStandardMaterial` and `MeshPhysicalMaterial` instances into `MeshToonMaterial`.
  - Preserves original diffuse maps, normal maps, bump maps, emissive maps, transparency, and alpha tests.
  - Automatically caches converted materials by UUID to prevent redundant shader program generation and GPU memory thrashing.
- **Inverted-Hull Hero Spacecraft Outlines (`attachHeroOutline`)**:
  - Outlines are applied selectively to the hero spacecraft currently in focus with atmospheric ink tinting (slate `#080c16` on Moon, warm espresso `#1a0c09` on Mars).
  - Utilizes a shared inverted-hull `ShaderMaterial` (`side: THREE.BackSide`, `depthTest: true`, `depthWrite: true`).
  - Extrudes vertices along normal vectors in view space with distance attenuation factor:
    $$\text{factor} = \text{clamp}(-mvPos.z \times 0.22, 0.35, 3.2)$$
  - Dynamically adjusts thickness based on craft scale: $t = \max(0.0018, \min(0.0045, \frac{0.0030}{\sqrt{\text{scale}}}))$.
  - Ensures background terrain, celestial globes, and unfocused rovers do not suffer outline draw overhead.
- **Metallic Specular & Rim Sparkle**:
  - High-tier Quality mode injects a Fresnel-based metallic rim boost via `onBeforeCompile` on reflective spacecraft surfaces (gold insulation foil, high-gain dishes, and solar cell backing).
- **Tight Vehicle Shadow Camera Auto-Fitting (`fitShadowCameraToVehicle`)**:
  - Replaces broad-frustum shadow maps with a tightly framed bounding frustum focused directly on the inspected craft and its ground contact point.
  - Automatically calibrates `camera.left`, `right`, `top`, `bottom` between 2.0m (Ingenuity) and 6.5m (Falcon LM), eliminating shadow acne and peter-panning while maximizing shadow-map texel density.
- **Atmospheric Contact Shadows & Accurate Terrain Raycasting**:
  - Dual-tier radial ambient occlusion disks with polygon offset (`polygonOffsetFactor: -1.0`, `polygonOffsetUnits: -2.0`) eliminating Z-fighting and hover artifacts.
  - Soil-tinted occlusion core (terracotta on Mars, deep slate on Moon) beneath all surface vehicles.
  - Exact real-time terrain normal/elevation raycasting for all 6 surface exploration crafts.

### 4.5 User-Configurable Graphics Quality Modes (`src/constants/settings.js`)

Players can choose between visual fidelity and rendering performance from the in-game Settings modal. Settings update live via the `gameSettingsChange` event bus without page reloads:

| Feature / Setting | Ultra | Quality (Default) | Balanced | Performance |
| :--- | :--- | :--- | :--- | :--- |
| **Target Device** | High-end desktop & gaming GPUs | Desktop, high-end laptops, modern tablets | Laptops, mid-tier phones | Mobile phones, battery saving |
| **Max Pixel Ratio (DPR)** | `2.0x` (1.75x if constrained) | Up to `2.0x` (1.5x on constrained) | Up to `1.25x` | Capped at `1.0x` (0.75x fallback) |
| **Shadow Resolution** | `4096 x 4096` | `2048 x 2048` | `1024 x 1024` | Disabled / Contact shadow only |
| **Shadow Map Filter** | `THREE.PCFSoftShadowMap` | `THREE.PCFSoftShadowMap` | `THREE.PCFShadowMap` | `THREE.BasicShadowMap` |
| **Shadow Frustum Span** | `38.0m` (Wide Landscape Frustum) | `28.0m` (Wide Landscape Frustum) | `18.0m` (Balanced Area) | `8.0m` (Vehicle-Focused) |
| **Terrain Self-Shadowing** | Enabled (cast & receive across entire scene) | Enabled (cast & receive across entire scene) | Enabled | Disabled |
| **Terrain Cel-Shading** | Stepped Toon Ramp on all terrain meshes | Stepped Toon Ramp on all terrain meshes | Stepped Toon Ramp | Stepped Toon Ramp |
| **Earth Backdrop Shading** | Cel-Shaded Crescent Terminator + Cyan Atmospheric Halo | Cel-Shaded Crescent Terminator + Cyan Atmospheric Halo | Cel-Shaded Terminator | Smooth Globe |
| **Dynamic Rim Lighting** | Electric Cyan (Moon) / Sunset-Amber (Mars) | Electric Cyan (Moon) / Sunset-Amber (Mars) | Disabled | Disabled |
| **Shadow Auto-Update** | Continuous (`autoUpdate = true`) | Continuous (`autoUpdate = true`) | On-Demand (`autoUpdate = false`) | Disabled |
| **Hero Inverted-Hull Outlines** | Enabled on inspected craft | Enabled on inspected craft | Enabled on inspected craft | Disabled |
| **Metallic Sparkle & Rim Shader** | Enabled on foils and metals | Enabled on foils and metals | Disabled | Disabled |
| **Starfield Density Scale** | `1.25x` (`0.75x` if constrained) | `1.0x` (`0.5x` if constrained) | `0.7x` | `0.4x` |
| **Contact Ground Shadow** | `1.0` scale | `1.0` scale | `0.85` scale | `0.65` scale |
| **Device Quality Auto-Profile** | Automatically detects hardware concurrency, GPU memory tier, and mobile touch points to set safe baseline defaults |

### 4.6 Seamless Planetary Globe Meshes (`public/models/moon-opt.glb`, `mars-opt.glb`)

- **Equirectangular Texture Continuity**:
  - The interactive 3D globes for the Moon and Mars feature seamless equirectangular UV mapping, completely eliminating visible tile seams, patchwork exposure differences, and polar pinch artifacts.
- **Selective Shading Exclusion (`isGlobeModelUrl`)**:
  - Planetary globes are explicitly filtered out from stepped cel-shading (`toonify: false`) to preserve continuous physical terminator shadowing, smooth atmospheric haze, and realistic curvature.
- **Texture Sampling**:
  - Mipmapped linear filtering with 4x anisotropic sampling (`texture.anisotropy = 4`) ensures crisp craters and canyons across both grazing angles and close orbital zooms.

### 4.7 Normal Inversion Correction & Shading Repairs (`toonify.js`, `orbitLayer.js`)

- **Diagnostic Root Cause**:
  - In complex orbiter meshes such as the LADEE Lunar Dust & Atmosphere Explorer (`ladee-opt.glb`), 61,796 out of 61,800 vertex normals on the body solar array faces (`GPMcore-SolarFaces1` through `8`) were exported inverted inwards towards the interior. Under standard PBR materials this created slight shadowing, but under `MeshToonMaterial`'s stepped 1D ramp, negative $N \cdot L$ dot products stepped abruptly into the darkest tone floor, slicing solar quads into severe diagonal black triangles along triangular winding interpolations.
- **Automated Vertex Normal Recomputation**:
  - `toonify.js` and `orbitLayer.js` detect inverted normal profiles on solar panels and thin structural faces, automatically triggering `child.geometry.computeVertexNormals()` from CCW triangle winding. This immediately restored 100% of normals outward.
  - Materials are configured with `child.material.side = THREE.FrontSide` and negative polygon offset (`polygonOffsetFactor: -1.0`, `polygonOffsetUnits: -2.0`), completely eliminating back-face illumination bleed and triangular dark artifacts while rendering smooth, pristine lavender-blue solar cell arrays.

### 4.8 Uninterrupted Environment Inspection & HUD Hide System

- **Inspect Viewport Goal**:
  - Allows users to admire 360° celestial vistas, terrain craters, distant rotating Earthrise, and cel-shaded spacecraft without UI cards blocking the scene.
- **Controls & Keyboard Shortcuts**:
  - **Keyboard Shortcut**: Pressing `H` toggles HUD cards on and off.
  - **Top HUD Bar**: Dedicated `Eye` / `EyeOff` button in the header actions bar.
  - **Direct Card Minimize**: Dedicated eye toggle button in the header of `showroom-mission-panel` and `showroom-details-panel`.
- **Floating Restore Pill**:
  - When HUD cards are hidden (`isHudHidden = true`), a discreet frosted-glass floating pill (`.showroom-restore-ui-pill`) animates into the bottom center of the screen with an eye icon and localized text: *"Environment Inspection Mode — Tap to restore cards (H)"* (Arabic: *"معاينة البيئة نشطة — اضغط لإظهار المعلومات والاختبار (H)"*).
  - Clicking the pill or pressing `H` instantly restores the cards with zero loss of state.

### 4.9 Main Menu 3D Spacecrafts Portal (`MainMenu.jsx`)

- **Interactive 3D Rover Portal**:
  - The Spacecrafts navigation tile (`#btn-open-crafts`) on the No Man's Sky main menu renders a real-time 3D model of the Apollo Lunar Roving Vehicle (`lunar_rover-opt.glb`) using `<model-viewer>`.
  - Calibrated camera orbit (`40deg 75deg 105%`), target elevation (`0m 0.6m 0m`), and exposure (`1.15`) frame the rover's high-gain antenna, wire wheels, and cockpit in high contrast against the cosmic nebula background.

---

## 5. 3D HUD Pointers & Dynamic Telemetry Leader Lines

Every vehicle part has synchronized SVG leader lines projecting from 3D world space coordinates onto the 2D screen.

### 5.1 Calibrated Part Hotspots Table

| Spacecraft | Hotspot ID | Part Name | World Position `[x, y, z]` | Offset `{x, y}` |
| :--- | :--- | :--- | :--- | :--- |
| **Lunar Rover** | `lrv-tv` | Color TV Camera | `[0.68, 1.15, 0.40]` | `{ x: 80, y: -50 }` |
| | `lrv-hga` | High-Gain Umbrella Dish | `[0.99, 1.55, 0.14]` | `{ x: 85, y: -65 }` |
| | `lrv-wheel` | Woven Wire Wheels | `[0.29, 0.38, 0.75]` | `{ x: -85, y: -35 }` |
| | `lrv-battery`| 36V Dual Ag-Zn Battery | `[0.12, 0.75, 0.35]` | `{ x: 85, y: 40 }` |
| **Apollo Lunar Module** | `lm-descent` | Descent Stage & Engine | `[-18.0, 0.85, 10.0]` | `{ x: -85, y: 40 }` |
| | `lm-footpad` | Landing Gear & Footpad | `[-15.8, 0.35, 12.2]` | `{ x: 85, y: 45 }` |
| | `lm-mesa` | Modular Equipment Stowage | `[-18.8, 1.65, 8.8]` | `{ x: -85, y: -35 }` |
| | `lm-antenna` | S-Band Steerable Antenna | `[-17.3, 3.85, 11.2]` | `{ x: 85, y: -55 }` |
| **LRO Orbiter** | `lro-hga` | High-Gain Antenna (HGA) | `[16.58, -10.52, 2.95]` | `{ x: 85, y: -45 }` |
| | `lro-cam` | LROC Narrow Angle Camera | `[15.58, -11.12, 2.50]` | `{ x: -85, y: -35 }` |
| | `lro-solar` | Solar Array Wing | `[15.08, -10.92, 3.15]` | `{ x: 85, y: 35 }` |
| **LADEE Orbiter** | `ladee-laser` | LLCD Optical Laser Terminal | `[-15.27, -10.16, 16.03]` | `{ x: 85, y: -40 }` |
| | `ladee-dust` | Lunar Dust Experiment | `[-16.02, -10.76, 15.53]` | `{ x: -85, y: 35 }` |
| | `ladee-cells` | Body Solar Array Panels | `[-16.12, -10.31, 16.18]` | `{ x: -85, y: -30 }` |
| **Opportunity** | `oppy-pancam` | Pancam/Navcam Mast | `[-0.04, 1.55, 0.34]` | `{ x: 80, y: -50 }` |
| | `oppy-solar` | Solar Array Wings | `[0.92, 1.10, -0.29]` | `{ x: 85, y: -25 }` |
| | `oppy-arm` | 5-Joint Arm & RAT | `[-0.04, 0.50, 0.75]` | `{ x: -85, y: 35 }` |
| | `oppy-wheels`| Rocker-Bogie Mobility | `[0.98, 0.35, -0.11]` | `{ x: 85, y: 45 }` |
| **Ingenuity** | `ing-solar` | Top Solar Array | `[-14.00, 0.80, -7.00]` | `{ x: 85, y: -55 }` |
| | `ing-rotor-upper` | Upper Rotor Blade | `[-13.75, 0.66, -6.85]` | `{ x: -85, y: -35 }` |
| | `ing-rotor-lower` | Lower Rotor Blade | `[-14.25, 0.54, -7.15]` | `{ x: 85, y: -20 }` |
| | `ing-camera` | Nav Eye & Horizon Cam | `[-13.95, 0.34, -6.90]` | `{ x: -85, y: 40 }` |
| **Viking 1 Lander** | `viking-hga` | High-Gain S-Band Dish | `[16.05, 1.27, -8.25]` | `{ x: 85, y: -55 }` |
| | `viking-camera`| Surface Facsimile Cameras | `[15.95, 1.17, -7.85]` | `{ x: -85, y: -45 }` |
| | `viking-arm` | Soil Sampler Boom & Scoop| `[16.55, 0.37, -7.65]` | `{ x: 85, y: 35 }` |
| | `viking-rtg` | SNAP-19 RTG Power | `[15.55, 0.67, -8.15]` | `{ x: -85, y: 30 }` |
| **InSight Lander** | `insight-solar` | UltraFlex Solar Array | `[-2.10, 0.85, -22.0]` | `{ x: -85, y: -45 }` |
| | `insight-arm` | Instrument Deployment Arm | `[0.75, 0.65, -21.15]` | `{ x: 85, y: -35 }` |
| | `insight-wts` | Wind & Thermal Shield | `[0.20, 0.78, -22.2]` | `{ x: -85, y: 35 }` |
| | `insight-antenna`| UHF Relay Antenna & Mast | `[-0.05, 1.25, -22.15]` | `{ x: 85, y: 45 }` |
| **Mars Global Surveyor** | `mgs-dish` | 1.5m High-Gain Antenna | `[17.78, 0.64, 2.97]` | `{ x: 85, y: -45 }` |
| | `mgs-camera` | Mars Orbiter Camera (MOC)| `[16.73, -0.06, 2.52]` | `{ x: -85, y: -35 }` |
| | `mgs-solar` | Solar Array & Drag Flaps | `[15.88, 0.24, 2.87]` | `{ x: -85, y: 40 }` |
| **2001 Mars Odyssey** | `ody-boom` | GRS Instrument Boom | `[0.90, 6.88, 18.02]` | `{ x: 85, y: -45 }` |
| | `ody-themis` | THEMIS Thermal Imager | `[-0.30, 6.33, 17.57]` | `{ x: -85, y: -35 }` |
| | `ody-antenna`| High-Gain Parabolic Dish | `[0.35, 7.13, 17.67]` | `{ x: 85, y: 35 }` |
| **MRO Orbiter** | `mro-dish` | 3.0m High-Gain Dish | `[-16.56, 14.71, -3.78]` | `{ x: 85, y: -50 }` |
| | `mro-hirise` | HiRISE Telescope Camera | `[-17.96, 13.66, -4.38]` | `{ x: -85, y: -35 }` |
| | `mro-solar` | UltraFlex Solar Wings | `[-18.86, 14.11, -3.93]` | `{ x: -85, y: 40 }` |
| **MAVEN Orbiter** | `maven-artemis`| SWEA / Magnetometer Boom | `[11.20, -28.9, -63.5]` | `{ x: 85, y: -45 }` |
| | `maven-dish` | 2.0m High-Gain Antenna | `[10.10, -27.8, -61.2]` | `{ x: -85, y: -35 }` |
| | `maven-solar` | Aerodynamic Gulwing Wings | `[11.90, -28.1, -62.4]` | `{ x: 85, y: 40 }` |

### 5.2 Dynamic SVG Leader Line Mechanics
- **Radar Anchor**: Sits directly on the projected 3D coordinates with a glowing dot and pulsing radar beacon.
- **Elbow Leader Path**: Dynamic SVG path connects `(partX, partY)` to an elbow point, extending horizontally into the HUD telemetry card.
- **Frustum Test**: Guarded with `toPoint.dot(camDir) > 0.05` to guarantee zero inverted or back-facing artifacts.

---

## 6. Handheld & Mobile Viewport Engine (`src/utils/viewport.js`)

To solve mobile browser URL bar and bottom toolbar obstruction issues (particularly in iOS Safari portrait), the application features a dedicated viewport and safe-area engine.

### 6.1 Viewport Configuration & Safe Areas
- **Dynamic Viewport Unit**: Replaces all `100vh` styling with `100dvh`. For browsers lacking native `dvh` support, a JS fallback `--vh` property is maintained (`window.innerHeight * 0.01`), updated continuously via `resize`, `orientationchange`, and `visualViewport` events.
- **Safe Area Padding**: Bottom-anchored elements apply `padding-bottom: max(12px, env(safe-area-inset-bottom))`. Header and lateral controls respect `env(safe-area-inset-top)`, `env(safe-area-inset-left)`, and `env(safe-area-inset-right)`.
- **App Shell Constraint**: `html, body, #root` locked at 100% height with `overflow: hidden; overscroll-behavior: none`. Internal scroll regions are explicitly isolated with `overflow-y: auto; overscroll-behavior: contain`.

### 6.2 Mobile Showroom Layout (`max-width: 640px`)
- **Header (~48px single row)**: NASA meatball logo, truncated title with ellipsis, settings button, and menu hamburger. "SURFACE VIEW" / "ORBIT VIEW" toggles are streamlined.
- **Dedicated 3D Viewport Zone (Flex: 1, >= 45% height)**: The WebGL canvas renders exclusively in this zone, preventing the 3D model from being obscured behind UI cards. Left and right navigation arrows are centered on viewport edges as 48px semi-transparent circular buttons.
- **Collapsible Bottom Info Panel (~30% height)**: Displays craft name, subtitle, status chip, and "VIEW DETAILS" button above the safe area. Can be collapsed down to a title bar via chevron.
- **Sliding Details Bottom Sheet**: Opens to `70dvh` with a drag handle and internal tabs (`INFO`, `TASK`, `QUIZ`). Swipe down, backdrop tap, or `Esc` closes the sheet.
- **Prompt Isolation**: Distinct display logic separates desktop keyboard prompts (`Space to pause`, `Esc to close`) from handheld touch hints (`Tap to pause/close`), preventing overlapping text.

### 6.3 UI Visibility Synchronization (`isShowroomUiVisible`)
- **Elimination of Loading Flashes**: During 3D scene construction and asset retrieval, all HUD interactive elements (navigation arrows, pagination tracks, bottom info panels, and orbit zoom chips) are gated behind `isShowroomUiVisible = !isLoading3D && !loadError`.
- **Seamless Loading Overlays**: Guarantees that neither mobile nor desktop users see misplaced or unstyled HUD controls bleeding behind the loading HUD screen before terrains, orbiters, and fonts are fully operational.

---

## 7. Hybrid Soundtracked & Procedural Audio Engine (`src/audio/surfaceAudio.js`)

The application features three dedicated looping soundtracks paired with real-time procedural Web Audio API synthesis for interactive sound effects and planetary environments:

- **Looping Soundtracks**:
  1. **Menu Theme (`/audio/menu_theme.mp3`)**: Seamlessly loops on the initial Title Splash screen ("PRESS ANY KEY OR CLICK TO CONTINUE") and continues uninterrupted through the Main Navigation Menu right behind it.
  2. **Story Narrative Music (`/audio/story_music.mp3`)**: Seamlessly loops during the visual-novel prologue dialogue sequence before choosing the destination, ducking automatically during typewriter speech and stopping cleanly upon reaching the Destination Choice screen.
  3. **Space Ambient Music (`/audio/space_music.mp3`)**: Loops continuously across the entirety of 3D space—covering all Moon surface and orbital missions, all Mars surface and orbital missions, and the complete Arcade Mode showroom.
- **Audio Controls & Synchronization**:
  - All three soundtracks are centrally managed by `SurfaceAudioEngine`, automatically syncing with the Master Volume slider, Music Volume slider, and Mute Audio toggle from the in-game Settings modal.
  - Automatically handles browser autoplay policies by registering one-time unlock handlers on first interaction (`pointerdown`, `keydown`, `touchstart`).
  - Pauses cleanly when browser tabs are hidden (`document.hidden`) and resumes upon return.
- **Procedural Synthesizers & Sound Effects**:
  - `playThruster`: Cold-gas and hydrazine bursts synthesized using filtered white noise buffers routed through resonant bandpass filters with exponential gain envelope decay.
  - `playServo`: Dual-oscillator pitch-gliding frequency sweeps simulating robotic camera servos.
  - `playLock` / `playUnlock`: Two-tone harmonic frequency pings for part inspection lock and release.
  - `startSurfaceAmbience`: Dual pink-noise wind generators for Mars, deep 58Hz vacuum electrical hum for the Moon, layering with `space_music.mp3`.
  - **Interaction Auto-Unlock**: Automatically initializes and resumes the audio context upon the first user interaction (`pointerdown`, `touchstart`, `keydown`).

---

## 8. Credits, 3D Providers & "The End" Screen Sequence

### 8.1 Cinematic "The End" Screen (`TheEndScreen.jsx`)
- **Trigger**: Appears automatically upon completing all 12 spacecraft across the Moon and Mars campaign in Story Mode, or via the `THE END & CREDITS` action in the Campaign Victory modal.
- **Cinematic Presentation**: Displays the grand title `THE END` (Arabic: `النـهـايـة`), project subtitle `ABANDONED BUT NOT FORGOTTEN`, the poetic tribute quote (`"To every machine that reached beyond the dust..."`), and the team signature `BY BEYOND THE DUST`.
- **Immediate Jump to Credits**: Holds gracefully for 3.8 seconds with an active prompt and countdown before automatically jumping right away into the rolling credits, or immediately upon user click / spacebar / enter.

### 8.2 Rolling Credits Modal (`CreditsModal.jsx`)
The rolling credits modal pays tribute to both human creators, open archives, and the robotic pioneers left among the stars:

- **Team Attribution**: Features `<div className="cr-block cr-team team" id="team">` directly preceding the project leader, celebrating the team name: **`Beyond The Dust`**.
- **Cinematic Roll Timing**: Paced at 85 seconds (`animation: creditsRoll 85s linear 0.6s forwards`) for comfortable, reflective reading.
- **Interactive Controls**: `Space` pauses and resumes the roll; `Esc` or clicking/tapping anywhere closes the modal.
- **Dedicated 3D Model Providers Section**:
  - **NASA 3D Resources**: Science Visualization Studio, Jet Propulsion Laboratory (JPL), Ames Research Center, Langley Research Center, and Goddard Space Flight Center.
  - **Sketchfab 3D Community**: Historical spacecraft reconstructions and planetary open-source telemetry models.
- **Soundtrack & Music Attribution**:
  - Original space ambient music, prologue narrative score, and exploration themes sourced from YouTube creators.
- **Complete 12-Spacecraft Roster**: Every spacecraft is listed alongside its mission dates, planetary landing/orbit coordinates, and historical contribution.

---

## 9. 3D Asset Pipeline & Repository Structure

### 9.1 Optimization & Full-Stack Preload Pipeline (`scripts/optimize-models.mjs`, `src/utils/modelCache.js`)
- **Offline Optimization Pipeline**:
  - Executed via `npm run optimize:models` using `@gltf-transform/cli`.
  - Untouched raw `.glb` source assets are archived intact in `models/` (never overwritten).
  - Optimized runtime derivatives in `public/models/` apply Draco mesh compression (`KHR_draco_mesh_compression`) and WebP textures (`EXT_texture_webp`) while preserving named PBR materials (`'Chassis'`, `'Wheels'`, `'Antenne'`).
  - Decoders are served locally from `public/draco/` with Web Worker concurrency control.
- **Seamless Equirectangular Globes**:
  - Interactive planetary globes (`moon-opt.glb`, `mars-opt.glb`) feature seamless equirectangular texturing, eliminating grid tile seams, exposure discontinuities, and polar distortions.
- **Runtime Preload & Concurrency Engine (`modelCache.js`)**:
  - `preloadMainMenuAssets`: Multi-phase boot loader running on initial launch; concurrently settles web fonts (`document.fonts.ready`), code chunk prefetching, Draco decoder warm-up, core audio tracks, visual novel character poses/cutscenes, and 3D preview models while broadcasting progress percentages and localized phase labels.
  - `preloadAllCoreAssets`: Preloads visual-novel story paintings, audio soundtracks, and primary celestial models before Story Mode exploration starts.
  - `preloadShowroomExtras`: Non-3D essentials loader (fonts, decoders, ambient soundscapes, Luna portraits) ensuring zero pop-in on showroom entry.
  - In-flight request deduplication via `inFlightRequests` Map preventing duplicate network fetches across components.
  - Bounded LRU buffer cache (5MB per asset cap, 18MB total cache cap) preventing memory pressure on mobile devices.

### 9.2 File Structure & Asset Inventory

```
NASA hackton/
├── models/                           # Untouched original raw GLB sources & provenance models
├── public/
│   ├── assets/story/                 # Narrative cutscenes & illustrations (shot1-5, nasa_book_open.webp)
│   ├── audio/                        # Looping audio soundtracks
│   │   ├── menu_theme.mp3            # Title splash & main navigation menu theme
│   │   ├── story_music.mp3           # Visual-novel prologue dialogue narrative score
│   │   └── space_music.mp3           # Universal 3D space theme (Moon, Mars, Arcade)
│   ├── draco/                        # Local Three.js glTF Draco WASM/JS decoders
│   ├── manifest.webmanifest          # PWA web application manifest
│   └── models/                       # Draco + WebP optimized runtime *-opt.glb models
│       ├── lunar_rover-opt.glb       # Apollo Lunar Roving Vehicle (2.65 MiB)
│       ├── lunar_module-opt.glb      # Apollo Lunar Module Falcon (558 KiB)
│       ├── lro-opt.glb               # Lunar Reconnaissance Orbiter (279 KiB)
│       ├── ladee-opt.glb             # LADEE Lunar Atmosphere Explorer (227 KiB)
│       ├── mer_rover-opt.glb         # Mars Exploration Rover Opportunity (715 KiB)
│       ├── ingenuity-opt.glb         # Mars Helicopter Ingenuity (344 KiB)
│       ├── viking_lander-opt.glb     # Viking 1 Lander (243 KiB)
│       ├── insight-opt.glb           # InSight Mars Lander (1.28 MiB)
│       ├── mgs-opt.glb               # Mars Global Surveyor (269 KiB)
│       ├── odyssey-opt.glb           # 2001 Mars Odyssey (702 KiB)
│       ├── mro-opt.glb               # Mars Reconnaissance Orbiter (766 KiB)
│       ├── maven-opt.glb             # MAVEN Atmospheric Observatory (475 KiB)
│       ├── moon_surface-opt.glb      # Welded Moon crater terrain (7.37 MiB)
│       ├── mud_of_mars-opt.glb       # Martian mud & rock regolith terrain (537 KiB)
│       ├── realistic_earth-opt.glb   # 3D Earth backdrop globe (1.04 MiB)
│       ├── moon-opt.glb              # Seamless Moon globe (1.04 MiB)
│       └── mars-opt.glb              # Seamless Mars globe (213 KiB)
├── scripts/
│   ├── optimize-models.mjs           # GLTF-transform Draco + WebP pipeline
│   └── process_character.py          # Character cutout extraction & sprite processor
├── src/
│   ├── audio/
│   │   └── surfaceAudio.js           # Web Audio API procedural synthesis engine
│   ├── components/
│   │   ├── CosmicBackground.jsx      # Starfield + floating crafts host
│   │   ├── CreditsModal.jsx          # Cinematic rolling credits with 3D provider attributions
│   │   ├── FloatingCraftsCanvas.jsx  # Staggered lazy 3D menu craft flybys
│   │   ├── LunaReactionToast.jsx     # Visual novel feedback toast upon quiz completion
│   │   ├── MainMenu.jsx              # Instant title splash & mode selection
│   │   ├── MissionBriefingDialog.jsx # Mission Control typewriter briefing dialog
│   │   ├── ModelPreviewCanvas.jsx    # Shared Three.js preview canvas component
│   │   ├── MoreEquipmentModal.jsx    # 2D archive modal (ALSEP, Pathfinder, Deep Space)
│   │   ├── PlanetaryShowroom.jsx     # Unified surface & orbit showroom orchestrator
│   │   ├── SettingsModal.jsx         # Audio, Graphics Quality & language settings
│   │   ├── ShowroomStoryPanel.jsx    # Collapsible story sections, quiz & heritage HUD
│   │   ├── SourcesModal.jsx          # Verification & primary source index modal
│   │   ├── StarfieldCanvas.jsx       # Preset-scaled 2D starfield canvas
│   │   ├── StatusBadge.jsx           # Reusable HUD craft status badge + date chip
│   │   ├── StoryGame.jsx             # Visual novel prologue & destination choice flow
│   │   ├── TheEndScreen.jsx          # Cinematic "The End" sequence jumping to credits
│   │   └── TypewriterText.jsx        # Smooth typewriter dialogue renderer
│   ├── constants/
│   │   ├── settings.js               # Settings defaults & graphics quality profiles
│   │   └── translations.js           # Complete bilingual {en, ar} dictionary
│   ├── data/
│   │   ├── arabicVehicles.js         # Authentic Arabic spacecraft dossiers, telemetry & task specs
│   │   └── craftStories.js           # Archival stories, technical dossiers & quizzes
│   ├── scene/
│   │   ├── cameraAutoFit.js          # Responsive bounding-sphere camera framing engine
│   │   ├── orbitLayer.js             # Three.js circumplanetary orbital simulation
│   │   └── toonify.js                # Cel-shading, inverted-hull hero outlines & shadow auto-fit
│   ├── styles/
│   │   ├── menu.css                  # Main menu, HUD tokens, splash & modal styles
│   │   ├── spacecraft.css            # Showroom, dossier, bottom sheet & orbit HUD styles
│   │   └── story.css                 # Visual novel cutscenes, dialogue box & Luna styles
│   ├── utils/
│   │   ├── modelCache.js             # Singleton GLTF/DRACO loader, LRU buffer cache
│   │   ├── storyProgression.js       # Persistent progression engine & custom event bus
│   │   └── viewport.js               # Viewport engine, iOS Safari safe area & haptics
│   ├── App.jsx                       # Top-level route & modal orchestration
│   └── main.jsx                      # React 18 root mount
├── index.html                        # Viewport-fit meta & PWA headers
├── package.json
└── vite.config.js                    # Vite 6 config with vendor manualChunks splitting
```

---

## 10. Operational Verification & Build

- **Development Server**: Run `npm run dev` to launch Vite on `http://localhost:3000/`.
- **Production Build**: Run `npm run build` to verify clean chunk compilation and zero syntax errors.
- **Model Optimization**: Run `npm run optimize:models` whenever new 3D assets are introduced.
- **Browser Compatibility**: Validated on Google Chrome, Mozilla Firefox, Apple Safari (desktop & iOS portrait/landscape), and Android Chromium.
