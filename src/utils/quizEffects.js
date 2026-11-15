/**
 * Lightweight canvas particle confetti and edge flash effects for quiz rewards.
 * 0 external dependencies, respects prefers-reduced-motion, self-cleans on complete.
 */

export function triggerConfettiBurst(isGold = false) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'quiz-confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const colors = isGold
    ? ['#ffd700', '#ffb703', '#fff3b0', '#e0a96d', '#ffffff']
    : ['#00e5ff', '#00ffaa', '#38bdf8', '#a7f3d0', '#ffffff', '#ffd166'];

  const count = isGold ? 80 : 50;
  const particles = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: window.innerWidth * (0.3 + Math.random() * 0.4),
      y: window.innerHeight * 0.5,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      decay: Math.random() * 0.015 + 0.012,
    });
  }

  let animId;
  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = 0;

    for (const p of particles) {
      if (p.alpha <= 0) continue;
      active++;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravity
      p.vx *= 0.98; // Air resistance
      p.rotation += p.rotationSpeed;
      p.alpha = Math.max(0, p.alpha - p.decay);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    if (active > 0) {
      animId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animId);
      canvas.remove();
    }
  };

  animId = requestAnimationFrame(render);
}

export function triggerEdgeFlash(kind = 'correct') {
  if (typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const flash = document.createElement('div');
  flash.className = `screen-edge-flash is-${kind}`;
  document.body.appendChild(flash);

  setTimeout(() => {
    flash.remove();
  }, 800);
}
