import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: 'cyan' | 'violet';
}

const COLORS = {
  cyan: { r: 34, g: 211, b: 238 },
  violet: { r: 167, g: 139, b: 250 },
} as const;

const LINK_DISTANCE = 130;
const LINK_DISTANCE_SQ = LINK_DISTANCE * LINK_DISTANCE;

function particleCount(width: number, height: number): number {
  return Math.min(110, Math.max(48, Math.floor((width * height) / 14_000)));
}

function createParticles(width: number, height: number): Particle[] {
  const count = particleCount(width, height);
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.55,
    vy: (Math.random() - 0.5) * 0.55,
    radius: Math.random() * 1.6 + 0.6,
    hue: Math.random() > 0.45 ? 'cyan' : 'violet',
  }));
}

function wrapParticle(p: Particle, width: number, height: number): void {
  if (p.x < 0) p.x = width;
  if (p.x > width) p.x = 0;
  if (p.y < 0) p.y = height;
  if (p.y > height) p.y = 0;
}

/** 登录页全屏粒子连线背景 — 与首页青紫主题一致 */
export function ParticleBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = createParticles(width, height);
      if (reduceMotion) {
        drawFrame(ctx, particlesRef.current, width, height, false);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (reduceMotion) {
      return () => ro.disconnect();
    }

    let running = true;

    const tick = () => {
      if (!running) return;
      if (!document.hidden) {
        const particles = particlesRef.current;
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          wrapParticle(p, width, height);
        }
        drawFrame(ctx, particles, width, height, true);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [reduceMotion]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#050508]" />
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/35 via-zinc-950 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_0%,rgba(139,92,246,0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_85%_90%,rgba(6,182,212,0.1),transparent_50%)]" />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="ambient-noise absolute inset-0 opacity-[0.18]" />
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  width: number,
  height: number,
  animate: boolean
): void {
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i]!;
      const b = particles[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > LINK_DISTANCE_SQ) continue;

      const t = 1 - distSq / LINK_DISTANCE_SQ;
      const alpha = t * 0.22;
      const c = COLORS[a.hue];
      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  for (const p of particles) {
    const c = COLORS[p.hue];
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
    glow.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${animate ? 0.85 : 0.65})`);
    glow.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.95)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
