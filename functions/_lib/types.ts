export interface ChatMessage {
  role: 'user' | 'assistant' | string;
  content: string;
}

export interface ChatRequest {
  message: string;
  api_key: string;
  model: string;
  history?: ChatMessage[];
}

export interface JudgeRequest {
  word: string;
  definition: string;
  root: string;
  root_meaning: string;
  user_explanation: string;
  api_key: string;
  model: string;
}

/** 第三方大模型补全（写死，仅 Agent 层调用） */
export const LLM_BASE_URL = 'https://aiplatform.njsrd.com/llm/v1';

/** Supabase 项目 URL（与前端 VITE_SUPABASE_URL 一致，用于 JWKS 校验） */
export const SUPABASE_PROJECT_URL = 'https://zhryubclcfityqqqdsaa.supabase.co';
