import { motion, useReducedMotion } from 'framer-motion';
import { useLayoutEffect, useRef, useState } from 'react';

type WanderMode = 'perimeter' | 'free' | 'lane';

type AuraSpec = {
  className: string;
  duration: number;
  delay: number;
  mode: WanderMode;
  phase: number;
  /** lane 模式：在卡片行附近不规则游走 */
  yRatio?: number;
};

/** 不规则光晕形态（border-radius 有机 blob） */
const BLOB_RADII: string[][] = [
  [
    '68% 32% 58% 42% / 42% 58% 38% 62%',
    '32% 68% 62% 38% / 58% 42% 68% 32%',
    '55% 45% 35% 65% / 65% 35% 55% 45%',
    '68% 32% 58% 42% / 42% 58% 38% 62%',
  ],
  [
    '42% 58% 38% 62% / 68% 32% 58% 42%',
    '70% 30% 50% 50% / 30% 50% 70% 60%',
    '38% 62% 68% 32% / 55% 45% 35% 65%',
    '42% 58% 38% 62% / 68% 32% 58% 42%',
  ],
  [
    '30% 70% 70% 30% / 30% 30% 70% 70%',
    '60% 40% 30% 70% / 70% 60% 40% 30%',
    '45% 55% 65% 35% / 35% 65% 45% 55%',
    '30% 70% 70% 30% / 30% 30% 70% 70%',
  ],
  [
    '63% 37% 45% 55% / 48% 52% 62% 38%',
    '37% 63% 55% 45% / 62% 38% 48% 52%',
    '52% 48% 38% 62% / 35% 65% 55% 45%',
    '63% 37% 45% 55% / 48% 52% 62% 38%',
  ],
];

const BLOB_SIZES: { w: number; h: number }[] = [
  { w: 168, h: 118 },
  { w: 148, h: 132 },
  { w: 176, h: 108 },
  { w: 156, h: 140 },
  { w: 162, h: 112 },
  { w: 140, h: 128 },
  { w: 172, h: 122 },
  { w: 150, h: 136 },
  { w: 164, h: 110 },
  { w: 152, h: 126 },
  { w: 170, h: 114 },
  { w: 146, h: 130 },
  { w: 158, h: 120 },
];

const AURA_SPECS: AuraSpec[] = [
  { className: 'bg-amber-400/55', duration: 22, delay: 0, mode: 'perimeter', phase: 0 },
  { className: 'bg-rose-500/50', duration: 26, delay: 3, mode: 'perimeter', phase: 0.38 },
  { className: 'bg-orange-400/48', duration: 24, delay: 1.5, mode: 'free', phase: 0.12 },
  { className: 'bg-emerald-400/42', duration: 28, delay: 5, mode: 'free', phase: 0.58 },
  { className: 'bg-rose-400/48', duration: 25, delay: 2, mode: 'perimeter', phase: 0.72 },
  { className: 'bg-amber-300/50', duration: 27, delay: 6, mode: 'free', phase: 0.31 },
  { className: 'bg-orange-500/45', duration: 23, delay: 4, mode: 'perimeter', phase: 0.19 },
  { className: 'bg-rose-300/44', duration: 29, delay: 7, mode: 'free', phase: 0.84 },
  { className: 'bg-amber-400/45', duration: 20, delay: 0.5, mode: 'lane', phase: 0, yRatio: 0.2 },
  { className: 'bg-rose-400/42', duration: 23, delay: 2.5, mode: 'lane', phase: 0.4, yRatio: 0.38 },
  { className: 'bg-orange-400/40', duration: 21, delay: 4.5, mode: 'lane', phase: 0.75, yRatio: 0.56 },
  { className: 'bg-rose-300/38', duration: 24, delay: 6.5, mode: 'lane', phase: 0.25, yRatio: 0.74 },
  { className: 'bg-amber-300/38', duration: 22, delay: 1.5, mode: 'lane', phase: 0.6, yRatio: 0.9 },
];

const MARGIN = 28;
const LANE_BELOW = 20;
const PATH_STEPS = 22;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function pointOnPerimeter(t: number, w: number, h: number): { x: number; y: number } {
  const perimeter = 2 * (w + h);
  const d = ((t % 1) + 1) % 1 * perimeter;

  if (d <= w) {
    return { x: d, y: -MARGIN };
  }
  if (d <= w + h) {
    return { x: w + MARGIN, y: d - w };
  }
  if (d <= 2 * w + h) {
    return { x: w - (d - w - h), y: h + MARGIN };
  }
  return { x: -MARGIN, y: h - (d - 2 * w - h) };
}

/** 沿外缘不规则抖动游走 */
function buildPerimeterJitterPath(
  w: number,
  h: number,
  index: number,
  phase: number
): { x: number[]; y: number[] } {
  const seed = index * 2.17 + 0.5;
  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < PATH_STEPS; i++) {
    const t = (i / (PATH_STEPS - 1) + phase) % 1;
    const p = pointOnPerimeter(t, w, h);
    const jitterX =
      Math.sin(t * 11.3 + seed) * 52 +
      Math.cos(t * 7.7 + seed * 1.4) * 34 +
      Math.sin(t * 19.1 + seed * 0.6) * 18;
    const jitterY =
      Math.cos(t * 9.1 + seed * 0.8) * 42 +
      Math.sin(t * 13.2 + seed) * 26 +
      Math.cos(t * 16.4 + seed * 1.1) * 16;

    xs.push(clamp(p.x + jitterX, -MARGIN, w + MARGIN));
    ys.push(clamp(p.y + jitterY, -MARGIN, h + MARGIN));
  }

  return { x: xs, y: ys };
}

/** 区域内自由不规则漫游（多谐波 Lissajous） */
function buildFreeWanderPath(
  w: number,
  h: number,
  index: number,
  phase: number
): { x: number[]; y: number[] } {
  const seed = index * 1.91 + 1.2;
  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < PATH_STEPS; i++) {
    const t = i / (PATH_STEPS - 1);
    const p = (t + phase) % 1;
    const theta = p * Math.PI * 2;

    const x =
      w * 0.5 +
      Math.sin(theta + seed) * w * 0.36 +
      Math.sin(theta * 2.4 + seed * 1.2) * w * 0.13 +
      Math.cos(theta * 3.8 + seed * 0.6) * w * 0.07 +
      Math.sin(theta * 5.6 + seed * 1.8) * w * 0.04;

    const y =
      h * 0.5 +
      Math.cos(theta * 1.15 + seed * 1.05) * h * 0.34 +
      Math.sin(theta * 2.9 + seed * 0.75) * h * 0.11 +
      Math.cos(theta * 4.5 + seed) * h * 0.06 +
      Math.sin(theta * 6.2 + seed * 1.4) * h * 0.04;

    xs.push(clamp(x, -MARGIN, w + MARGIN));
    ys.push(clamp(y, -MARGIN, h + MARGIN));
  }

  return { x: xs, y: ys };
}

/** 卡片行附近不规则游走（可拐向底部） */
function buildLaneWanderPath(
  w: number,
  h: number,
  index: number,
  phase: number,
  yRatio: number
): { x: number[]; y: number[] } {
  const seed = index * 2.33 + 0.8;
  const baseY = h * yRatio + LANE_BELOW;
  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < PATH_STEPS; i++) {
    const t = i / (PATH_STEPS - 1);
    const p = (t + phase) % 1;

    const x =
      w * p +
      Math.sin(p * 8.3 + seed) * 48 +
      Math.cos(p * 5.1 + seed * 1.3) * 32 +
      Math.sin(p * 14.7 + seed * 0.5) * 20;

    const y =
      baseY +
      Math.sin(p * 6.7 + seed) * 40 +
      Math.cos(p * 10.2 + seed * 0.9) * 24 +
      Math.sin(p * 3.4 + seed * 1.6) * 18;

    xs.push(clamp(x, -MARGIN, w + MARGIN));
    ys.push(clamp(y, baseY - 55, h + MARGIN));
  }

  return { x: xs, y: ys };
}

function buildIrregularPath(
  spec: AuraSpec,
  w: number,
  h: number,
  index: number
): { x: number[]; y: number[] } {
  if (w <= 0 || h <= 0) {
    return { x: [0], y: [0] };
  }

  switch (spec.mode) {
    case 'perimeter':
      return buildPerimeterJitterPath(w, h, index, spec.phase);
    case 'free':
      return buildFreeWanderPath(w, h, index, spec.phase);
    case 'lane':
      return buildLaneWanderPath(w, h, index, spec.phase, spec.yRatio ?? 0.5);
  }
}

function AuraOrb({
  spec,
  size,
  reduceMotion,
  index,
}: {
  spec: AuraSpec;
  size: { w: number; h: number };
  reduceMotion: boolean | null;
  index: number;
}) {
  const blob = BLOB_SIZES[index % BLOB_SIZES.length];
  const radii = BLOB_RADII[index % BLOB_RADII.length];
  const halfW = blob.w / 2;
  const halfH = blob.h / 2;

  const path = buildIrregularPath(spec, size.w, size.h, index);
  const xKeyframes = path.x.map((v) => v - halfW);
  const yKeyframes = path.y.map((v) => v - halfH);

  const pathTransition = {
    duration: spec.duration,
    delay: spec.delay,
    repeat: Infinity,
    ease: 'linear' as const,
  };

  return (
    <motion.div
      className={`absolute blur-[48px] mix-blend-screen ${spec.className}`}
      style={{
        left: 0,
        top: 0,
        width: blob.w,
        height: blob.h,
        x: xKeyframes[0],
        y: yKeyframes[0],
        borderRadius: radii[0],
      }}
      animate={
        reduceMotion
          ? undefined
          : {
              x: xKeyframes,
              y: yKeyframes,
              borderRadius: radii,
              rotate: [0, 6, -4, 3, 0],
              scale: [1, 1.08, 0.94, 1.05, 1],
            }
      }
      transition={
        reduceMotion
          ? undefined
          : {
              x: pathTransition,
              y: pathTransition,
              borderRadius: {
                duration: spec.duration * 0.85,
                delay: spec.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              rotate: {
                duration: spec.duration * 1.1,
                delay: spec.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              scale: {
                duration: spec.duration,
                delay: spec.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }
      }
    />
  );
}

/** 卡牌内容区不规则游离光晕 */
export function BombardCardAuras() {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      className="pointer-events-none absolute -inset-6 sm:-inset-8 md:-inset-10 z-0 overflow-visible"
      aria-hidden
    >
      {size.w > 0 &&
        size.h > 0 &&
        AURA_SPECS.map((spec, i) => (
          <AuraOrb
            key={i}
            index={i}
            spec={spec}
            size={size}
            reduceMotion={reduceMotion}
          />
        ))}
    </div>
  );
}
