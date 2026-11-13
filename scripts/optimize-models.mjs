/**
 * Offline 3D Asset Optimization Pipeline — Abandoned But Not Forgotten
 *
 * Reads original source models from `models/` (never modifies originals) and
 * emits compressed derivatives (`*-opt.glb`) into `public/models/` using
 * Draco geometry compression (`KHR_draco_mesh_compression`) and WebP textures
 * (`EXT_texture_webp`), while preserving bounding boxes, origins, UV tiling,
 * and named materials required by PlanetaryShowroom.jsx.
 *
 * Usage: node scripts/optimize-models.mjs [filter...]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT_DIR, 'models');
const OUT_DIR = path.join(ROOT_DIR, 'public', 'models');
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

/**
 * Pipeline manifest: exact source-to-derivative provenance and safe flags.
 * - Craft & terrain models disable `--palette`, `--join`, and `--prune-solid-textures`
 *   so named PBR materials (e.g. 'Wheels', 'Antenne') and diffuse/normal maps stay intact.
 * - Distant backdrop (`realistic_earth`) and small menu/card globes (`moon`) allow
 *   bounded mesh simplification (`simplify`) since camera distance/viewport pixels cannot resolve
 *   500k+ micro-triangles.
 */
const PIPELINE = [
  {
    src: 'astronaut_helmet.glb',
    out: 'astronaut_helmet-opt.glb',
    flags: [
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--simplify', 'false',
      '--join', 'false',
      '--palette', 'false',
      '--prune-solid-textures', 'false',
      '--prune', 'false',
    ],
  },
  {
    src: '24883_MER_static.glb',
    out: 'mer_rover-opt.glb',
    flags: [
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--simplify', 'false',
      '--join', 'false',
      '--palette', 'false',
      '--prune-solid-textures', 'false',
      '--prune', 'false',
    ],
  },
  {
    src: 'Ingenuity Mars Helicopter.glb',
    out: 'ingenuity-opt.glb',
    flags: [
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--simplify', 'false',
      '--join', 'false',
      '--palette', 'false',
      '--prune-solid-textures', 'false',
      '--prune', 'true',
    ],
  },
  {
    src: 'Viking Lander.glb',
    out: 'viking_lander-opt.glb',
    flags: [
      '--compress', 'draco',
      '--simplify', 'false',
      '--join', 'false',
      '--palette', 'false',
    ],
  },
  {
    src: 'mondfahrzeug_lunar_rover.glb',
    out: 'lunar_rover-opt.glb',
    flags: [
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--simplify', 'false',
      '--join', 'false',
      '--palette', 'false',
      '--prune-solid-textures', 'false',
      '--prune', 'false',
    ],
  },
  {
    src: 'moon.glb',
    out: 'moon-opt.glb',
    flags: [
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--simplify', 'true',
      '--simplify-ratio', '0.25',
      '--simplify-error', '0.001',
    ],
  },
  {
    src: 'mars.glb',
    out: 'mars-opt.glb',
    flags: [
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--simplify', 'false',
    ],
  },
  {
    src: 'realistic_earth.glb',
    out: 'realistic_earth-opt.glb',
    flags: [
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', '1024',
      '--simplify', 'true',
      '--simplify-ratio', '0.04',
      '--simplify-error', '0.003',
    ],
  },
  {
    src: 'moon_surface.glb',
    out: 'moon_surface-opt.glb',
    // Join and weld tile edges before scene-volume Draco quantization so
    // adjacent terrain chunks share boundary vertices without seam cracks.
    steps: [
      ['join'],
      ['weld'],
      ['webp', '--quality', '90'],
      [
        'draco',
        '--quantization-volume', 'scene',
        '--quantize-position', '16',
        '--quantize-normal', '12',
        '--quantize-texcoord', '14',
      ],
    ],
  },
  {
    src: 'mud_of_mars.glb',
    out: 'mud_of_mars-opt.glb',
    flags: [
      '--compress', 'draco',
      '--texture-compress', 'webp',
      '--texture-size', '2048',
      '--simplify', 'false',
      '--join', 'false',
      '--palette', 'false',
      '--prune-solid-textures', 'false',
      '--prune', 'false',
    ],
  },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const quote = (v) => (/\s/.test(v) ? `"${v}"` : v);
const runTransform = (args) => {
  execFileSync(
    NPX,
    ['--yes', '@gltf-transform/cli', ...args],
    {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }
  );
};

const filters = process.argv.slice(2).map((s) => s.toLowerCase());
const jobs = filters.length
  ? PIPELINE.filter((job) => filters.some((f) => job.src.toLowerCase().includes(f) || job.out.toLowerCase().includes(f)))
  : PIPELINE;

if (filters.length && jobs.length === 0) {
  throw new Error(`No pipeline entries matched filters: ${filters.join(', ')}`);
}

for (const job of jobs) {
  const inputRel = path.join('models', job.src);
  const outputRel = path.join('public', 'models', job.out);
  const inputPath = path.join(ROOT_DIR, inputRel);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing original model: ${inputPath}`);
  }
  console.log(`\nOptimizing ${job.src} -> public/models/${job.out}...`);
  if (Array.isArray(job.steps)) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gltf-opt-'));
    try {
      let currentInput = inputRel;
      job.steps.forEach(([cmd, ...flags], idx) => {
        const isLast = idx === job.steps.length - 1;
        const stepOut = isLast ? outputRel : path.join(tmpDir, `step_${idx}.glb`);
        runTransform([cmd, quote(currentInput), quote(stepOut), ...flags]);
        currentInput = stepOut;
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  } else {
    runTransform(['optimize', quote(inputRel), quote(outputRel), ...job.flags]);
  }
}
