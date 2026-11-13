import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion, getDeviceQualityProfile } from '../utils/modelCache';
import {
  readStoredSettings,
  resolveGraphicsProfile,
  getEffectivePixelRatio,
} from '../constants/settings';

export default function StarfieldCanvas({ isEntered = false, paused = false }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    speed: 1.6,
    target: 1.6,
    isEntered: false,
    paused: false,
  });
  const syncLoopRef = useRef(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const CRUISE_TITLE = reduced ? 0 : 1.6;
    const CRUISE_MENU = reduced ? 0 : 2.4;

    if (isEntered && !stateRef.current.isEntered) {
      stateRef.current.isEntered = true;
      stateRef.current.target = CRUISE_MENU;
      if (!reduced) {
        stateRef.current.speed = 26; // warp burst on enter
      }
    } else if (!isEntered) {
      stateRef.current.isEntered = false;
      stateRef.current.target = CRUISE_TITLE;
    }
  }, [isEntered]);

  useEffect(() => {
    stateRef.current.paused = paused;
    syncLoopRef.current?.();
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const CRUISE_TITLE = reduced ? 0 : 1.6;
    const CRUISE_MENU = reduced ? 0 : 2.4;

    stateRef.current.speed = isEntered ? CRUISE_MENU : CRUISE_TITLE;
    stateRef.current.target = isEntered ? CRUISE_MENU : CRUISE_TITLE;

    const DEPTH = 1000;
    let W = 0;
    let H = 0;
    let R = 0;
    const stars = [];
    const COLORS = [
      '255,255,255',
      '255,255,255',
      '255,255,255',
      '255,214,184',
      '255,176,140',
      '190,220,255',
    ];

    function spawn(s, anywhere) {
      s.x = (Math.random() - 0.5) * 2 * R;
      s.y = (Math.random() - 0.5) * 2 * R;
      s.z = anywhere ? 1 + Math.random() * (DEPTH - 1) : DEPTH * (0.85 + Math.random() * 0.15);
      s.c = COLORS[(Math.random() * COLORS.length) | 0];
      s.w = 0.6 + Math.random() * 1.1;
    }

    function drawStaticStars() {
      const cx = W / 2;
      const cy = H / 2;
      const F = DEPTH * 0.6;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const k = F / s.z;
        const x = cx + s.x * k;
        const y = cy + s.y * k;
        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
        const near = 1 - s.z / DEPTH;
        ctx.fillStyle = `rgba(${s.c},${Math.min(1, near * 1.5 + 0.18).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, s.w * (0.5 + near * 1.1), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    let activeQuality = resolveGraphicsProfile(
      readStoredSettings().graphicsQuality,
      getDeviceQualityProfile()
    );

    function resize() {
      const dpr = getEffectivePixelRatio(activeQuality);
      W = window.innerWidth;
      H = window.innerHeight;
      R = Math.max(W, H);
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const baseCount = Math.max(180, Math.min(460, Math.round((W * H) / 4800)));
      const count = Math.max(80, Math.round(baseCount * activeQuality.starScale));
      while (stars.length < count) {
        const s = {};
        spawn(s, true);
        stars.push(s);
      }
      stars.length = count;
      if (reduced) drawStaticStars();
    }

    const onSettingsChange = (e) => {
      const nextQuality = resolveGraphicsProfile(
        e?.detail?.graphicsQuality,
        getDeviceQualityProfile()
      );
      if (
        nextQuality.maxDpr === activeQuality.maxDpr &&
        nextQuality.starScale === activeQuality.starScale
      ) {
        return;
      }
      activeQuality = nextQuality;
      resize();
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('gameSettingsChange', onSettingsChange);

    if (reduced) {
      // Static crisp starfield when user prefers reduced motion
      return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('gameSettingsChange', onSettingsChange);
      };
    }

    const F = DEPTH * 0.6;
    let last = performance.now();
    let animId = null;

    function frame(now) {
      if (document.hidden || stateRef.current.paused) {
        animId = null;
        return;
      }

      animId = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;

      const { target } = stateRef.current;
      stateRef.current.speed += (target - stateRef.current.speed) * Math.min(0.035 * dt, 1);
      const cx = W / 2;
      const cy = H / 2;
      const step = stateRef.current.speed * dt;

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const zPrev = s.z;
        s.z -= step;
        if (s.z < 1) {
          spawn(s, false);
          continue;
        }
        const k = F / s.z;
        const kp = F / (zPrev < DEPTH * 1.2 ? zPrev : s.z);
        const x = cx + s.x * k;
        const y = cy + s.y * k;
        if (x < -50 || x > W + 50 || y < -50 || y > H + 50) {
          spawn(s, false);
          continue;
        }
        const xp = cx + s.x * kp;
        const yp = cy + s.y * kp;
        const near = 1 - s.z / DEPTH;
        ctx.strokeStyle = `rgba(${s.c},${Math.min(1, near * 1.5 + 0.12).toFixed(2)})`;
        ctx.lineWidth = s.w * (0.5 + near * 1.6);
        ctx.beginPath();
        ctx.moveTo(xp, yp);
        ctx.lineTo(x + 0.01, y + 0.01);
        ctx.stroke();
      }
    }

    const syncLoop = () => {
      if (document.hidden || stateRef.current.paused) {
        if (animId !== null) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      } else if (animId === null) {
        last = performance.now();
        animId = requestAnimationFrame(frame);
      }
    };
    syncLoopRef.current = syncLoop;
    document.addEventListener('visibilitychange', syncLoop);
    syncLoop();

    return () => {
      syncLoopRef.current = null;
      document.removeEventListener('visibilitychange', syncLoop);
      window.removeEventListener('resize', resize);
      window.removeEventListener('gameSettingsChange', onSettingsChange);
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} id="nms-starfield" aria-hidden="true" />;
}
