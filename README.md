# 英文词根斩

基于 **React + TypeScript + Vite + Tailwind CSS + Framer Motion** 的英语词根学习应用，右下角集成 ChatGPT 风格 AI 对话面板。

## 架构

```
前端 (React)  →  后端 (FastAPI)  →  AI Agent (LangGraph)  →  大模型 (OpenAI 兼容 API)
```

- **前端**：聊天面板、大模型设置（Base URL / API Key / 模型）
- **后端**：`/chat` 对话、`/models` 代理模型列表
- **Agent**：参考 `Week1/`，使用 LangGraph + LangChain 调用大模型

## 启动方式

需分别在两个终端启动后端与前端。

### 终端 1 — Python 后端

```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

就绪后：`INFO: Uvicorn running on http://0.0.0.0:8000`

### 终端 2 — 前端

```bash
yarn dev
```

浏览器打开 `http://localhost:5173`：

1. 点击顶部 **齿轮** 打开设置，填写 API Key，点击「获取模型列表」并选择模型
2. 右下角 **AI 助手** 面板输入问题，Enter 发送（Shift+Enter 换行）

### 默认配置

| 项 | 默认值 |
|----|--------|
| Base URL | `https://aiplatform.njsrd.com/llm/v1` |
| 模型列表接口 | `https://aiplatform.njsrd.com/nexus/api/api-keys/models` |

## 目录结构

```
├── src/
│   ├── components/
│   │   ├── ChatPanel.tsx       # ChatGPT 风格对话面板
│   │   ├── SettingsModal.tsx   # 大模型设置弹窗
│   │   └── SettingsButton.tsx
│   ├── context/                # 语言、LLM 设置、设置弹窗状态
│   └── lib/api.ts              # 前端 API 封装
├── server/
│   ├── main.py                 # FastAPI 路由
│   └── agent/                  # LangGraph Agent（参考 Week1）
├── Week1/                      # Agent 参考实现
└── docker-compose.yml
```

## 构建

```bash
yarn build
yarn build:check
```
