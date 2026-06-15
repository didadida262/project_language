import { useReducedMotion } from 'framer-motion';

/** 轰炸页静态氛围底（光晕在 BombardCardAuras 中沿卡牌区边缘游走） */
export function BombardBackdrop() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-zinc-950" />

      <div
        className="absolute inset-0 opacity-[0.2] bg-[radial-gradient(circle_2px_at_center,rgba(251,191,36,0.09)_1px,transparent_1px)] bg-[length:22px_22px] [mask-image:radial-gradient(ellipse_85%_75%_at_50%_45%,black_15%,transparent_72%)]"
      />

      {!reduceMotion && (
        <>
          <div
            className="absolute inset-0 bg-grid-dark bg-[length:48px_48px] opacity-[0.08] [mask-image:radial-gradient(ellipse_90%_70%_at_50%_50%,black_10%,transparent_78%)]"
          />
          <div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/25 to-transparent animate-scan opacity-45"
          />
        </>
      )}

      <div className="ambient-noise absolute inset-0 opacity-[0.12]" />
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
