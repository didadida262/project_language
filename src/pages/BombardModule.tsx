import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { AmbientBackdrop } from '../components/AmbientBackdrop';
import unite1Data from '../data/unite1.json';

interface WordItem {
  word: string;
  definition: string;
  root?: string;
}

interface BombardModuleProps {
  unitId: number;
  words: WordItem[];
  onBack: () => void;
}

const TRANSLATIONS = {
  zh: {
    title: (unit: number) => `Unit ${unit} 词根轰炸`,
    back: '返回',
    allWords: '全部单词',
    startBtn: '开始轰炸',
    lang: 'EN',
  },
  en: {
    title: (unit: number) => `Unit ${unit} Root Bombard`,
    back: 'Back',
    allWords: 'All Words',
    startBtn: 'Start Bombard',
    lang: '中',
  },
} as const;

export function BombardModule({ unitId, words, onBack }: BombardModuleProps) {
  const [lang, setLang] = useState<'zh' | 'en'>('en');
  const t = TRANSLATIONS[lang];

  return (
    <div className="relative flex h-screen min-h-0 flex-col bg-zinc-950 text-zinc-100">
      <AmbientBackdrop />

      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-zinc-950/20 px-6 py-4 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-cyan-500/30 hover:bg-white/10 hover:text-white"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-cyan-400" />
          <span>{t.back}</span>
        </button>

        <h1 className="font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
          {t.title(unitId)}
        </h1>

        <button
          type="button"
          onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-cyan-500/30 hover:bg-white/10 hover:text-white"
        >
          <span>{t.lang}</span>
        </button>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 md:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                {t.allWords}
              </h2>
              <p className="text-sm text-zinc-400">Total {words.length} words found in this unit</p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-8 py-3 text-base font-bold text-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all hover:bg-cyan-500/20"
            >
              {t.startBtn}
            </motion.button>
          </div>

          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            {words.map((item) => (
              <motion.div
                key={item.word}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="group relative flex flex-col rounded-2xl border border-white/10 bg-zinc-900/50 p-5 transition-all hover:border-cyan-500/30 hover:bg-zinc-800/50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-xl font-bold text-white group-hover:text-cyan-400">
                    {item.word}
                  </span>
                  {item.root && (
                    <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                      {item.root.split(/[:：]/)[0]}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-zinc-400 group-hover:text-zinc-200">
                  {item.definition}
                </p>
                {item.root && (
                  <div className="mt-3 border-t border-white/5 pt-2">
                    <span className="text-[10px] italic text-zinc-600 group-hover:text-zinc-500">
                      Root: {item.root}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export function getMockWords(unitId: number): WordItem[] {
  if (unitId === 1) {
    return unite1Data as WordItem[];
  }
  return [];
}