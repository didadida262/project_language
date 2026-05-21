import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const DEFAULT_BASE_URL = 'https://aiplatform.njsrd.com/llm/v1';
const STORAGE_KEY = 'llm-settings';

export interface LlmSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  models: string[];
}

interface LlmSettingsContextValue {
  settings: LlmSettings;
  updateSettings: (patch: Partial<LlmSettings>) => void;
  saveSettings: (next: LlmSettings) => void;
}

const defaultSettings: LlmSettings = {
  baseUrl: DEFAULT_BASE_URL,
  apiKey: '',
  model: '',
  models: [],
};

function loadSettings(): LlmSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<LlmSettings>;
    return {
      baseUrl: parsed.baseUrl || DEFAULT_BASE_URL,
      apiKey: parsed.apiKey || '',
      model: parsed.model || '',
      models: Array.isArray(parsed.models) ? parsed.models : [],
    };
  } catch {
    return defaultSettings;
  }
}

const LlmSettingsContext = createContext<LlmSettingsContextValue | null>(null);

export function LlmSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LlmSettings>(loadSettings);

  const saveSettings = useCallback((next: LlmSettings) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const updateSettings = useCallback((patch: Partial<LlmSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, updateSettings, saveSettings }),
    [settings, updateSettings, saveSettings]
  );

  return (
    <LlmSettingsContext.Provider value={value}>{children}</LlmSettingsContext.Provider>
  );
}

export function useLlmSettings() {
  const ctx = useContext(LlmSettingsContext);
  if (!ctx) {
    throw new Error('useLlmSettings must be used within LlmSettingsProvider');
  }
  return ctx;
}
