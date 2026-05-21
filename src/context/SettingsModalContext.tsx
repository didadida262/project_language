import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { SettingsModal } from '../components/SettingsModal';

interface SettingsModalContextValue {
  openSettings: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSettings = useCallback(() => setOpen(true), []);
  const closeSettings = useCallback(() => setOpen(false), []);

  return (
    <SettingsModalContext.Provider value={{ openSettings }}>
      {children}
      <SettingsModal open={open} onClose={closeSettings} />
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) {
    throw new Error('useSettingsModal must be used within SettingsModalProvider');
  }
  return ctx;
}
