import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export const MAX_ROUNDS = 5;

export interface ActiveCard {
  word: string;
  definition: string;
  root: string;
  rootMeaning: string;
}

export type Verdict = '正确' | '错误';

interface GameSessionContextValue {
  active: boolean;
  round: number;
  maxRounds: number;
  correct: number;
  wrong: number;
  judgedThisRound: boolean;
  /** 正在调用阅卷 API，轰炸页应暂停倒计时 */
  isJudging: boolean;
  currentCard: ActiveCard | null;
  showFinale: boolean;
  lastVerdict: Verdict | null;
  startSession: () => void;
  stopSession: () => void;
  beginRound: (card: ActiveCard, round: number) => void;
  setJudging: (judging: boolean) => void;
  recordVerdict: (verdict: Verdict) => void;
  registerAdvanceRound: (handler: () => void) => void;
  unregisterAdvanceRound: () => void;
  completeSession: () => void;
  dismissFinale: () => void;
  canJudge: boolean;
}

const GameSessionContext = createContext<GameSessionContextValue | null>(null);

export function GameSessionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [judgedThisRound, setJudgedThisRound] = useState(false);
  const [isJudging, setIsJudging] = useState(false);
  const [currentCard, setCurrentCard] = useState<ActiveCard | null>(null);
  const [showFinale, setShowFinale] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<Verdict | null>(null);
  const advanceRoundRef = useRef<(() => void) | null>(null);

  const startSession = useCallback(() => {
    setActive(true);
    setRound(0);
    setCorrect(0);
    setWrong(0);
    setJudgedThisRound(false);
    setIsJudging(false);
    setCurrentCard(null);
    setShowFinale(false);
    setLastVerdict(null);
  }, []);

  const stopSession = useCallback(() => {
    setActive(false);
    setRound(0);
    setJudgedThisRound(false);
    setIsJudging(false);
    setCurrentCard(null);
    setShowFinale(false);
    setLastVerdict(null);
  }, []);

  const beginRound = useCallback((card: ActiveCard, roundNum: number) => {
    setRound(roundNum);
    setCurrentCard(card);
    setJudgedThisRound(false);
    setIsJudging(false);
    setLastVerdict(null);
  }, []);

  const setJudging = useCallback((judging: boolean) => {
    setIsJudging(judging);
  }, []);

  const registerAdvanceRound = useCallback((handler: () => void) => {
    advanceRoundRef.current = handler;
  }, []);

  const unregisterAdvanceRound = useCallback(() => {
    advanceRoundRef.current = null;
  }, []);

  const recordVerdict = useCallback((verdict: Verdict) => {
    if (verdict === '正确') {
      setCorrect((c) => c + 1);
    } else {
      setWrong((w) => w + 1);
    }
    setJudgedThisRound(true);
    setLastVerdict(verdict);
    advanceRoundRef.current?.();
  }, []);

  const completeSession = useCallback(() => {
    setActive(false);
    setCurrentCard(null);
    setShowFinale(true);
  }, []);

  const dismissFinale = useCallback(() => {
    setShowFinale(false);
    setRound(0);
    setCorrect(0);
    setWrong(0);
    setJudgedThisRound(false);
    setCurrentCard(null);
    setLastVerdict(null);
  }, []);

  const canJudge = active && !!currentCard && !judgedThisRound && !showFinale;

  const value = useMemo(
    () => ({
      active,
      round,
      maxRounds: MAX_ROUNDS,
      correct,
      wrong,
      judgedThisRound,
      isJudging,
      currentCard,
      showFinale,
      lastVerdict,
      startSession,
      stopSession,
      beginRound,
      setJudging,
      recordVerdict,
      registerAdvanceRound,
      unregisterAdvanceRound,
      completeSession,
      dismissFinale,
      canJudge,
    }),
    [
      active,
      round,
      correct,
      wrong,
      judgedThisRound,
      isJudging,
      currentCard,
      showFinale,
      lastVerdict,
      startSession,
      stopSession,
      beginRound,
      setJudging,
      recordVerdict,
      registerAdvanceRound,
      unregisterAdvanceRound,
      completeSession,
      dismissFinale,
      canJudge,
    ]
  );

  return (
    <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>
  );
}

export function useGameSession() {
  const ctx = useContext(GameSessionContext);
  if (!ctx) {
    throw new Error('useGameSession must be used within GameSessionProvider');
  }
  return ctx;
}

export function useGameSessionOptional() {
  return useContext(GameSessionContext);
}
