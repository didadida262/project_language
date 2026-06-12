import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface AuthThemeCardProps {
  children: ReactNode;
  className?: string;
}

/** 与首页 UnitCard 同系的青紫玻璃卡片 */
export function AuthThemeCard({ children, className }: AuthThemeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        boxShadow: [
          '0 0 28px -8px rgba(34,211,238,0.28), 0 0 64px -18px rgba(139,92,246,0.32), inset 0 1px 0 rgba(255,255,255,0.12)',
          '0 0 36px -6px rgba(34,211,238,0.38), 0 0 72px -14px rgba(139,92,246,0.42), inset 0 1px 0 rgba(255,255,255,0.14)',
          '0 0 28px -8px rgba(34,211,238,0.28), 0 0 64px -18px rgba(139,92,246,0.32), inset 0 1px 0 rgba(255,255,255,0.12)',
        ],
      }}
      transition={{
        opacity: { duration: 0.4 },
        y: { duration: 0.4 },
        scale: { duration: 0.4 },
        boxShadow: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
      }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-cyan-400/45',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-800/45 via-zinc-900/95 to-cyan-900/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,rgba(255,255,255,0.1)_0%,transparent_38%,transparent_62%,rgba(34,211,238,0.1)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-cyan-400/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-violet-500/45 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-grid-dark bg-[length:48px_48px] opacity-[0.12]"
        aria-hidden
      />
      <div className="ambient-noise pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden />

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
