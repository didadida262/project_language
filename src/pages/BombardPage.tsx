import { faPlay, faStop } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { UNIT_1_ROOTS } from '../data/unit1Roots';
import type { RootGroup, RootWord } from '../data/unit1Roots';

/* ── 统一背面设计 token ── */
const BACK_CLASSES = {
  outer:
    'rounded-xl border border-zinc-600/50 bg-gradient-to-br from-zinc-800/98 via-zinc-900 to-black shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_16px_-4px_rgba(0,0,0,0.6)]',
  pattern: 'bg-[radial-gradient(circle_1px_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:12px_12px]',
  emblem: 'text-zinc-500/60',
};

/* ── 常量 ── */
const FLIP_OPEN_MS = 480;
const FLIP_CLOSE_MS = 380;
const REVEAL_SECONDS = 10;

/* ── 全量 word 索引（用于随机抽取） ── */
interface FlatCard {
  rootIdx: number;
  wordIdx: number;
  root: RootGroup;
  word: RootWord;
}
const ALL_CARDS: FlatCard[] = UNIT_1_ROOTS.flatMap((root, ri) =>
  root.words.map((word, wi) => ({ rootIdx: ri, wordIdx: wi, root, word })),
);

/* ── 工具 ── */
function pickRandom(exclude?: { rootIdx: number; wordIdx: number }): FlatCard {
  let card: FlatCard;
  do {
    card = ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)];
  } while (
    exclude &&
    card.rootIdx === exclude.rootIdx &&
    card.wordIdx === exclude.wordIdx
  );
  return card;
}

/* ════════════════════════════════════════
   页面主体
   ════════════════════════════════════════ */
export function BombardPage({ onBack }: { onBack: () => void }) {
  const reduceMotion = useReducedMotion();

  /* 翻转状态：rootIdx → wordIdx → true=正面 / false=背面 */
  const [flipped, setFlipped] = useState<Record<number, Record<number, boolean>>>({});

  /* 轰炸循环 */
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<FlatCard | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(0);
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  /* ── 清理定时器 ── */
  const clearTimers = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(timeoutRef.current);
  }, []);

  /* ── 翻开一张卡 ── */
  const flipOpen = useCallback((card: FlatCard) => {
    setFlipped((prev) => ({
      ...prev,
      [card.rootIdx]: { ...prev[card.rootIdx], [card.wordIdx]: true },
    }));
  }, []);

  /* ── 翻回一张卡 ── */
  const flipClose = useCallback((card: FlatCard) => {
    setFlipped((prev) => ({
      ...prev,
      [card.rootIdx]: { ...prev[card.rootIdx], [card.wordIdx]: false },
    }));
  }, []);

  /* ── 丝滑滚动到词根区 ── */
  const scrollToRoot = useCallback(
    (rootIdx: number) =>
      new Promise<void>((resolve) => {
        const el = sectionRefs.current[rootIdx];
        if (el) {
          el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
          // 等待滚动大致完成
          setTimeout(resolve, reduceMotion ? 60 : 520);
        } else {
          resolve();
        }
      }),
    [reduceMotion],
  );

  /* ── 进入下一轮 ── */
  const nextRound = useCallback(
    async (prev: FlatCard | null) => {
      // 先翻回上一张
      if (prev) flipClose(prev);

      // 短暂停顿让翻回动画播放
      await new Promise<void>((r) => setTimeout(r, FLIP_CLOSE_MS + 80));

      // 随机抽卡
      const card = pickRandom(prev ?? undefined);
      setCurrent(card);

      // 滚动到对应词根
      await scrollToRoot(card.rootIdx);

      // 翻开
      flipOpen(card);

      // 开始倒计时
      setCountdown(REVEAL_SECONDS);
      let sec = REVEAL_SECONDS;
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        sec -= 1;
        if (sec <= 0) {
          clearInterval(timerRef.current);
          setCountdown(0);
        } else {
          setCountdown(sec);
        }
      }, 1000);

      // REVEAL_SECONDS 后进入下一轮
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        nextRound(card);
      }, REVEAL_SECONDS * 1000);
    },
    [flipClose, flipOpen, scrollToRoot],
  );

  /* ── 开始 / 停止 ── */
  const toggleRunning = useCallback(() => {
    if (running) {
      clearTimers();
      setRunning(false);
      setCurrent(null);
      setCountdown(0);
    } else {
      setRunning(true);
      nextRound(null);
    }
  }, [clearTimers, nextRound, running]);

  /* ── 卸载清理 ── */
  useEffect(() => clearTimers, [clearTimers]);

  /* ── running 变化时取消正在进行的循环 ── */
  useEffect(() => {
    if (!running) clearTimers();
  }, [clearTimers, running]);

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── 顶栏 ── */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.08] bg-zinc-950/70 px-6 py-3 backdrop-blur-xl">
        <h1 className="font-display text-lg font-semibold tracking-tight text-white">
          Unit 1 · 词根轰炸
        </h1>
        <div className="flex items-center gap-4">
          {/* 返回 */}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
          >
            ← 返回
          </button>

          {/* 倒计时 */}
          <AnimatePresence mode="wait">
            {running && countdown > 0 ? (
              <motion.span
                key="cd"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex h-9 min-w-[52px] items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 font-mono text-lg font-bold tabular-nums text-cyan-300"
              >
                {countdown}s
              </motion.span>
            ) : null}
          </AnimatePresence>

          {/* 开始 / 停止按钮 */}
          <button
            type="button"
            onClick={toggleRunning}
            className={`
              inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors
              ${
                running
                  ? 'border-red-500/40 bg-red-950/50 text-red-300 hover:bg-red-900/50'
                  : 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/50'
              }
            `}
          >
            <FontAwesomeIcon icon={running ? faStop : faPlay} className="h-3.5 w-3.5" />
            {running ? '停止' : '开始'}
          </button>
        </div>
      </header>

      {/* ── 词根列表 ── */}
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 md:px-6">
        {UNIT_1_ROOTS.map((root, ri) => (
          <div
            key={root.id}
            ref={(el) => {
              sectionRefs.current[ri] = el;
            }}
            className="scroll-mt-24"
          >
            {/* 词根标题 */}
            <div className="mb-3 flex items-baseline gap-3">
              <span className="font-display text-xl font-bold text-white">
                {root.root}
              </span>
              <span className="text-sm text-zinc-500">{root.meaning}</span>
            </div>

            {/* 2×2 卡牌网格 */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {root.words.map((word, wi) => {
                const isFlipped = !!flipped[ri]?.[wi];
                const isCurrent =
                  current?.rootIdx === ri && current?.wordIdx === wi;

                return (
                  <FlipCard
                    key={wi}
                    word={word}
                    rootLabel={root.root}
                    flipped={isFlipped}
                    highlighted={isCurrent}
                    reduceMotion={!!reduceMotion}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

/* ════════════════════════════════════════
   翻转卡牌组件
   ════════════════════════════════════════ */
function FlipCard({
  word,
  rootLabel,
  flipped,
  highlighted,
  reduceMotion,
}: {
  word: RootWord;
  rootLabel: string;
  flipped: boolean;
  highlighted: boolean;
  reduceMotion: boolean;
}) {
  const openMs = reduceMotion ? 0 : FLIP_OPEN_MS;
  const closeMs = reduceMotion ? 0 : FLIP_CLOSE_MS;

  return (
    <div className="perspective-[800px]" style={{ perspective: '800px' }}>
      <motion.div
        className="relative w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{
          duration: (flipped ? openMs : closeMs) / 1000,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {/* ──── 背面（统一设计） ──── */}
        <div
          className={`${BACK_CLASSES.outer} flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* 纹理底 */}
          <div className={`absolute inset-0 ${BACK_CLASSES.pattern}`} aria-hidden />

          {/* 中心徽记 */}
          <div className={`relative flex flex-col items-center gap-1 ${BACK_CLASSES.emblem}`}>
            <span className="font-display text-2xl font-bold tracking-widest opacity-70">
              {rootLabel.toUpperCase()}
            </span>
            <div className="h-px w-10 bg-gradient-to-r from-transparent via-zinc-500/50 to-transparent" />
          </div>

          {/* 四角装饰 */}
          <span className="absolute left-2.5 top-2.5 h-2.5 w-2.5 border-l border-t border-zinc-600/50" aria-hidden />
          <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 border-r border-t border-zinc-600/50" aria-hidden />
          <span className="absolute bottom-2.5 left-2.5 h-2.5 w-2.5 border-b border-l border-zinc-600/50" aria-hidden />
          <span className="absolute bottom-2.5 right-2.5 h-2.5 w-2.5 border-b border-r border-zinc-600/50" aria-hidden />
        </div>

        {/* ──── 正面 ──── */}
        <div
          className={`absolute inset-0 flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border overflow-hidden ${
            highlighted
              ? 'border-cyan-400/50 bg-gradient-to-br from-zinc-900 via-zinc-900 to-cyan-950/50 shadow-[0_0_28px_-6px_rgba(34,211,238,0.45)]'
              : 'border-white/10 bg-gradient-to-br from-zinc-800/95 via-zinc-900 to-black'
          }`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* 单词 */}
          <span className="font-display text-xl font-bold text-white">
            {word.front}
          </span>
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
          {/* 拆解释义 */}
          <span className="max-w-[85%] text-center text-sm leading-relaxed text-zinc-300">
            {word.back}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
