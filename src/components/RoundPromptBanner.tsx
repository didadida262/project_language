import { AnimatePresence, motion } from 'framer-motion';
import { useGameSession } from '../context/GameSessionContext';

interface RoundPromptBannerProps {
  countdown: number;
}

export function RoundPromptBanner({ countdown }: RoundPromptBannerProps) {
  const { active, currentCard, judgedThisRound } = useGameSession();

  const show = active && currentCard && countdown > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="pointer-events-none sticky top-[52px] z-30 mx-auto max-w-6xl px-3 sm:px-4 md:px-6"
        >
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/80 via-indigo-950/70 to-violet-950/80 px-4 py-3 shadow-[0_0_30px_-8px_rgba(34,211,238,0.45)] backdrop-blur-md">
            <p className="text-sm font-medium text-cyan-100">
              {judgedThisRound ? (
                <>已阅卷 · 正在切换下一词…</>
              ) : (
                <>
                  请在判官输入框写下对{' '}
                  <span className="font-bold text-white">{currentCard.word}</span>（词根{' '}
                  <span className="text-cyan-300">{currentCard.root}</span>）的理解并发送
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {countdown <= 10
                ? '最后 10 秒将揭晓卡片释义，在此之前提交你的解释'
                : `剩余 ${countdown}s · 判官将判定「正确」或「错误」`}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
