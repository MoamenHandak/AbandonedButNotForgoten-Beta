# AI Prompt: Add Graphics Quality Modes to “Abandoned But Not Forgotten”

You are a senior React and Three.js engineer. Implement a user-controlled graphics quality setting for this project. The goal is to give players a simple choice between visual fidelity and rendering performance, similar in spirit to PC games’ graphics presets. This project does **not** use NVIDIA DLSS or any other AI upscaler: do not add DLSS, claim that it exists, or present ordinary resolution scaling as DLSS.

## Project context

This is a React 18 + Vite web experience with a cinematic menu, story scenes, procedural audio, animated Three.js backgrounds, and a Three.js Moon/Mars showroom. Key files include:

- `src/components/SettingsModal.jsx`: current settings UI
- `src/constants/settings.js`: default settings and language definitions (verify exact path/content)
- `src/App.jsx`: settings state, persistence, and `gameSettingsChange` event
- `src/components/PlanetaryShowroom.jsx`: showroom renderer, terrain, spacecraft, lighting, and shadows
- `src/components/FloatingCraftsCanvas.jsx`: animated 3D craft background on the menu
- `src/components/StarfieldCanvas.jsx`: 2D animated starfield
- `src/styles/menu.css` and `src/styles/spacecraft.css`: settings and scene styling

Inspect the current code before editing. The settings modal already persists settings through the app and the showroom owns a substantial Three.js rendering pipeline. Keep the implementation consistent with those existing patterns.

## User experience requirements

Add a clearly labeled **GRAPHICS QUALITY** option to Settings with three choices:

1. **Quality** — the current visual settings and appearance; this is the default for existing and new users.
2. **Balanced** — a measured middle ground that modestly reduces GPU cost while keeping the scenes visually close to Quality.
3. **Performance** — prioritizes smoother rendering and lower GPU load; communicate briefly that some visual detail may be reduced.

Use concise descriptions or a small quality/performance indicator so users understand the tradeoff. The control must be keyboard accessible, work at narrow/mobile widths, match the existing visual design, and respect the current language/direction conventions where practical. Do not break volume or language settings.

## Implementation requirements

- Store a validated graphics preset key in the existing settings object and persist it using the current `localStorage` mechanism. Old saved settings without this field must safely default to **Quality**. Handle invalid stored values safely.
- Apply changes live without requiring a page reload. Extend the existing settings event/state flow or use a clean shared mechanism; avoid duplicate sources of truth.
- Make the presets affect real Three.js costs in both relevant rendering contexts: the planetary showroom and menu floating-craft renderer. Inspect their actual renderer setup before choosing controls.
- Use a small, centralized preset configuration rather than scattering conditionals. Reasonable controls to evaluate include renderer pixel ratio/resolution cap, shadow-map resolution or shadow enablement, antialiasing at renderer creation, and expensive optional effects. Keep the 2D starfield and story artwork unchanged unless profiling shows a clear reason and the result remains visually appropriate.
- Quality must reproduce the current baseline as closely as possible. Balanced and Performance may intentionally trade some fidelity for speed because the user selected those modes, but make changes proportional and predictable. Avoid drastic drops that make the scene look broken.
- WebGL renderer options such as antialiasing are fixed at renderer construction. If a setting cannot be applied safely to an existing renderer, reconfigure that renderer cleanly or defer the change until the next open; explain the behavior in the UI if it is not immediate. Avoid leaking renderers, listeners, GPU resources, or animation loops during reconfiguration.
- Preserve model geometry, source assets, textures, story content, camera framing, layout, controls, hotspots, lighting intent, and all existing interactions. Do not add AI upscaling, DLSS branding, lossy model/texture compression, new dependencies, or automatic quality reductions that override the user’s selection.
- Consider a device capability hint only as an optional recommendation (for example, suggest Performance on a constrained device). Never silently change the selected preset or reduce quality without the user’s choice.
- Keep behavior robust when WebGL features are unavailable and preserve accessibility semantics.

## Suggested preset design

First measure the current renderer settings and map the presets to supported, meaningful controls. Keep exact numeric values evidence-based and centralized; do not assume these illustrative dimensions must all change:

| Preset | Intended result |
|---|---|
| Quality | Current pixel ratio cap, shadows, antialiasing, and effects |
| Balanced | Slightly lower pixel ratio cap and/or shadow-map cost; retain key scene lighting and recognizable shadowing |
| Performance | Further lower render resolution and shadow cost, or disable only the most expensive optional effects |

Avoid changing model detail, textures, compositions, or core lighting as the first performance lever. Prefer reducing the number of pixels and expensive shadow work, since those are runtime settings and do not damage source assets.

## Workflow and verification

1. Inspect the renderer construction, resize logic, render loops, settings persistence, and current visual baseline.
2. Record the existing renderer quality values and choose sensible preset values based on the project’s current setup. Do not invent benchmark results.
3. Implement the control and preset application in small, maintainable changes.
4. Verify the production build and existing checks. Exercise changing presets in Settings, closing/reopening the app, old or invalid saved settings, reopening the showroom, and switching between Moon/Mars and vehicles.
5. Compare the same scenes in each preset. Confirm Quality matches the existing appearance, Balanced remains close, and Performance actually reduces rendering cost. If browser/GPU profiling is available, report the device/browser and measured frame-time or GPU changes; distinguish measurements from estimates.
6. Check for duplicate render loops, WebGL context leaks, visual jumps, broken settings, accessibility issues, or console errors after changing modes.

Finish with a concise report of files changed, what each preset changes, how persistence/live application works, verification performed, and measured impact. Begin by inspecting the project; implement the feature rather than returning only a plan.
