import { motion } from 'framer-motion';
import { useGameSession, MAX_ROUNDS } from '../context/GameSessionContext';
import { getScoreGrade } from '../lib/scoreGrade';
import { cn } from '../lib/cn';

const SPARKS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: (i % 6) * 16 - 40 + Math.random() * 20,
  delay: i * 0.04,
}));

export function FinaleOverlay() {
  const { showFinale, correct, wrong, dismissFinale } = useGameSession();

  if (!showFinale) return null;

  const total = MAX_ROUNDS;
  const grade = getScoreGrade(correct, total);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotateX: 12 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
        className={cn(
          'relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 p-8 text-center shadow-2xl',
          'bg-gradient-to-br',
          grade.glow
        )}
      >
        {SPARKS.map((s) => (
          <motion.span
            key={s.id}
            className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-cyan-300"
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              x: s.x,
              y: -80 - Math.random() * 60,
            }}
            transition={{ duration: 1.2, delay: 0.3 + s.delay, ease: 'easeOut' }}
          />
        ))}

        <motion.p
          className="text-xs font-medium uppercase tracking-[0.3em] text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          五轮斩词 · 终局裁定
        </motion.p>

        <motion.div
          className="relative mx-auto my-6 flex h-36 w-36 items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={326.7}
              initial={{ strokeDashoffset: 326.7 }}
              animate={{ strokeDashoffset: 326.7 * (1 - grade.score / 100) }}
              transition={{ duration: 1.4, delay: 0.35, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <motion.span
              className="font-display text-4xl font-bold text-white"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {grade.score}
            </motion.span>
            <span className="block text-xs text-white/50">得分率</span>
          </div>
        </motion.div>

        <motion.h2
          className={cn('font-display text-3xl font-bold', grade.color)}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
        >
          {grade.label}
        </motion.h2>
        <motion.p
          className="mt-2 text-sm text-zinc-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          {grade.subtitle}
        </motion.p>

        <motion.div
          className="mt-6 flex justify-center gap-6 text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
        >
          <span className="text-emerald-300">
            正确 <strong className="text-lg">{correct}</strong>
          </span>
          <span className="text-white/20">|</span>
          <span className="text-rose-300">
            错误 <strong className="text-lg">{wrong}</strong>
          </span>
        </motion.div>

        <motion.button
          type="button"
          onClick={dismissFinale}
          className="mt-8 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          继续斩词
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
