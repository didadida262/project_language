export interface ScoreGrade {
  score: number;
  label: string;
  subtitle: string;
  color: string;
  glow: string;
}

export function calcScoreRate(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function getScoreGrade(correct: number, total: number): ScoreGrade {
  const score = calcScoreRate(correct, total);

  if (score >= 90) {
    return {
      score,
      label: '优秀',
      subtitle: '词根洞察如神助，判官盖章通过',
      color: 'text-emerald-300',
      glow: 'from-emerald-500/40 via-cyan-500/30 to-violet-500/40',
    };
  }
  if (score >= 80) {
    return {
      score,
      label: '良好',
      subtitle: '根基扎实，再斩几轮可冲击满分',
      color: 'text-cyan-300',
      glow: 'from-cyan-500/35 via-indigo-500/25 to-emerald-500/30',
    };
  }
  if (score >= 60) {
    return {
      score,
      label: '及格',
      subtitle: '已入门，继续强化词根联想',
      color: 'text-amber-300',
      glow: 'from-amber-500/30 via-orange-500/20 to-yellow-500/25',
    };
  }
  return {
    score,
    label: '不及格',
    subtitle: '别灰心，回炉再斩几组词根',
    color: 'text-rose-300',
    glow: 'from-rose-500/35 via-red-500/25 to-orange-500/20',
  };
}
