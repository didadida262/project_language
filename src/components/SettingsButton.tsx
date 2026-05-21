import { faGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface SettingsButtonProps {
  onClick: () => void;
  className?: string;
}

export function SettingsButton({ onClick, className = '' }: SettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="大模型设置"
      aria-label="大模型设置"
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:border-cyan-500/30 hover:bg-white/10 hover:text-cyan-300 ${className}`}
    >
      <FontAwesomeIcon icon={faGear} className="h-4 w-4" />
    </button>
  );
}
