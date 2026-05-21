import { motion } from 'framer-motion';
import { useGameSession } from '../context/GameSessionContext';
import { cn } from '../lib/cn';

export function Scoreboard() {
  const { active, round, maxRounds, correct, wrong, lastVerdict } = useGameSession();

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400">
        第 <span className="font-mono text-cyan-300">{round}</span>/{maxRounds} 轮
      </span>
      <span className="rounded-lg border border-emerald-500/25 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
        正确 {correct}
      </span>
      <span className="rounded-lg border border-rose-500/25 bg-rose-950/40 px-2.5 py-1 text-[11px] font-medium text-rose-300">
        错误 {wrong}
      </span>
      {lastVerdict && (
        <motion.span
          key={lastVerdict}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[11px] font-bold',
            lastVerdict === '正确'
              ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40'
              : 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40'
          )}
        >
          上轮·{lastVerdict}
        </motion.span>
      )}
    </motion.div>
  );
}
