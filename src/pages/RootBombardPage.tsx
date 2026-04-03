import { faLock, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { ROOT_UNITS } from '../data/rootUnits';
import { cn } from '../lib/cn';
import type { RootUnit } from '../types/rootUnit';

export function RootBombardPage() {
  const [selectedId, setSelectedId] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const canStart = selectedId === 1;

  const handleStart = useCallback(() => {
    if (!canStart) return;
    setToast('Unit 1 轰炸流程即将接入，当前为占位反馈。');
    window.setTimeout(() => setToast(null), 3200);
  }, [canStart]);

  return (
    <div className="relative flex h-screen min-h-0 flex-col bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.22),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-grid-dark bg-[length:48px_48px] opacity-40 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
        aria-hidden
      />

      <header className="relative z-10 shrink-0 border-b border-white/5 px-6 py-4 backdrop-blur-sm">
        <h1 className="font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
          韦林英文词根轰炸
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          三十单元 · 当前开放 Unit 1
        </p>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <motion.ul
            className="mx-auto grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.03 } },
            }}
          >
            {ROOT_UNITS.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                selected={selectedId === unit.id}
                onSelect={() => {
                  if (!unit.locked) setSelectedId(unit.id);
                }}
              />
            ))}
          </motion.ul>
        </div>

        <footer className="relative z-10 flex h-24 shrink-0 items-center justify-center border-t border-white/5 bg-zinc-950/80 px-4 backdrop-blur-md">
          <motion.button
            type="button"
            disabled={!canStart}
            onClick={handleStart}
            whileHover={canStart ? { scale: 1.02 } : undefined}
            whileTap={canStart ? { scale: 0.98 } : undefined}
            className={cn(
              'rounded-xl px-10 py-3.5 text-sm font-semibold tracking-wide transition-shadow',
              canStart
                ? 'bg-gradient-to-r from-violet-500/90 to-cyan-500/80 text-white shadow-[0_0_32px_-4px_rgba(139,92,246,0.55)] hover:shadow-[0_0_40px_-2px_rgba(34,211,238,0.35)]'
                : 'cursor-not-allowed bg-zinc-800 text-zinc-500',
            )}
          >
            开始轰炸
          </motion.button>
        </footer>
      </main>

      <AnimatePresence>
        {toast ? (
          <motion.div
            key={toast}
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-28 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900/95 px-4 py-3 text-center text-sm text-zinc-200 shadow-xl backdrop-blur"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function UnitCard({
  unit,
  selected,
  onSelect,
}: {
  unit: RootUnit;
  selected: boolean;
  onSelect: () => void;
}) {
  const locked = unit.locked;

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      <button
        type="button"
        disabled={locked}
        onClick={onSelect}
        className={cn(
          'group relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors md:py-5',
          locked
            ? 'cursor-not-allowed border-white/5 bg-zinc-900/40 opacity-55'
            : selected
              ? 'border-cyan-400/40 bg-zinc-900/90 shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)]'
              : 'border-white/10 bg-zinc-900/70 hover:border-violet-400/30 hover:bg-zinc-900',
        )}
      >
        {!locked ? (
          <FontAwesomeIcon
            icon={faWandMagicSparkles}
            className={cn(
              'h-5 w-5 transition-colors',
              selected ? 'text-cyan-300' : 'text-zinc-500 group-hover:text-violet-300',
            )}
          />
        ) : (
          <FontAwesomeIcon
            icon={faLock}
            className="h-5 w-5 text-zinc-600"
            title="未解锁"
          />
        )}
        <span
          className={cn(
            'font-display text-sm font-medium',
            locked ? 'text-zinc-600' : 'text-zinc-200',
          )}
        >
          {unit.label}
        </span>
        {locked ? (
          <span className="text-[10px] uppercase tracking-wider text-zinc-700">
            锁定
          </span>
        ) : null}
      </button>
    </motion.li>
  );
}
