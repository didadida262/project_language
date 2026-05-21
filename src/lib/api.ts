import type { LlmSettings } from '../context/LlmSettingsContext';

const API_BASE = '/api';

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export async function fetchModels(apiKey: string): Promise<string[]> {
  const params = new URLSearchParams({ api_key: apiKey });
  const res = await fetch(`${API_BASE}/models?${params}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `获取模型列表失败 (${res.status})`);
  }
  const data = (await res.json()) as { models?: string[] };
  return data.models ?? [];
}

export async function sendChat(
  message: string,
  history: ChatMessagePayload[],
  settings: LlmSettings
): Promise<string> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history,
      base_url: settings.baseUrl,
      api_key: settings.apiKey,
      model: settings.model,
    }),
  });

  if (!res.ok) {
    let detail = await res.text().catch(() => '');
    try {
      const json = JSON.parse(detail) as { detail?: string };
      detail = json.detail ?? detail;
    } catch {
      /* use raw text */
    }
    throw new Error(detail || `对话请求失败 (${res.status})`);
  }

  const data = (await res.json()) as { reply: string };
  return data.reply ?? '';
}
