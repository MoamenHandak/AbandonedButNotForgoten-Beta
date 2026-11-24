import React, { useEffect, useRef } from 'react';

/**
 * Reusable full-screen starfield component matching the exact No Man's Sky algorithm
 * from main-menu-nms.html.
 *
 * - Depth-based streaks with warm celestial palette
 * - DPR capped at 2
 * - Pauses on document.hidden or paused prop
 * - Clean teardown of RAF and event listeners on unmount
 * - Cruise speed transitions & warp acceleration
 */
export default function Starfield({
  id = 'nms-starfield',
  className = '',
  speed: speedProp,
  targetSpeed: targetSpeedProp,
  isEntered = false,
  warp = false,
  paused = false,
}) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    speed: 1.6,
    target: 1.6,
    paused: false,
    isEntered: false,
  });

  // Keep stateRef synced with props
  useEffect(() => {
    stateRef.current.paused = paused;
  }, [paused]);

  useEffect(() => {
    const reduced = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CRUISE_TITLE = reduced ? 0.3 : 1.6;
    const CRUISE_MENU = reduced ? 0.3 : 2.4;

    if (speedProp !== undefined) {
      stateRef.current.target = speedProp;
      if (warp && !reduced) {
        stateRef.current.speed = Math.max(stateRef.current.speed, 26);
      }
      return;
    }

    if (targetSpeedProp !== undefined) {
      stateRef.current.target = targetSpeedProp;
      return;
    }

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
  }, [isEntered, speedProp, targetSpeedProp, warp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CRUISE_TITLE = reduced ? 0.3 : 1.6;
    const CRUISE_MENU = reduced ? 0.3 : 2.4;

    const initialSpeed = speedProp !== undefined ? speedProp : (isEntered ? CRUISE_MENU : CRUISE_TITLE);
    stateRef.current.speed = initialSpeed;
    stateRef.current.target = targetSpeedProp !== undefined ? targetSpeedProp : initialSpeed;

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

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      R = Math.max(W, H);
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(220, Math.min(520, Math.round((W * H) / 4500)));
      while (stars.length < count) {
        const s = {};
        spawn(s, true);
        stars.push(s);
      }
      stars.length = count;
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

      const target = stateRef.current.target;
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

    function checkLoop() {
      if (document.hidden || stateRef.current.paused) {
        if (animId !== null) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      } else if (animId === null) {
        last = performance.now();
        animId = requestAnimationFrame(frame);
      }
    }

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', checkLoop);

    animId = requestAnimationFrame(frame);

    return () => {
      document.removeEventListener('visibilitychange', checkLoop);
      window.removeEventListener('resize', resize);
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };
  }, []);

  return <canvas ref={canvasRef} id={id} className={className} aria-hidden="true" />;
}
