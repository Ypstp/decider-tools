interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  alpha: number;
}

const PALETTE = ['#0077FF', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];

export function launchConfetti(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const originX = window.innerWidth / 2;
  const originY = window.innerHeight * 0.42;

  const particles: Particle[] = Array.from({ length: 56 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
    const speed = 5 + Math.random() * 9;
    return {
      x: originX + (Math.random() - 0.5) * 80,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 5 + Math.random() * 5,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.22,
      alpha: 1,
    };
  });

  const start = performance.now();
  const duration = 1700;

  function frame(now: number) {
    const elapsed = now - start;
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28;
      p.vx *= 0.99;
      p.rotation += p.vRot;
      if (elapsed > 900) {
        p.alpha = Math.max(0, 1 - (elapsed - 900) / (duration - 900));
      }
      if (p.alpha > 0.01 && p.y < window.innerHeight + 30) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.65);
        ctx.restore();
      }
    }

    if (alive && elapsed < duration) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}
