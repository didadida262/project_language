import { faArrowUp, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameSessionOptional } from '../context/GameSessionContext';
import { useLlmSettings } from '../context/LlmSettingsContext';
import { fetchModels, sendChatStream, sendJudge, type ChatMessagePayload } from '../lib/api';
import { cn } from '../lib/cn';

const POS_STORAGE_KEY = 'chat-panel-position';
const VIEWPORT_MARGIN = 20;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 480;
const COLLAPSED_WIDTH = 296;
const PANEL_RADIUS_EXPANDED = 16;
const PANEL_RADIUS_COLLAPSED = 11;

const panelTransition = { type: 'spring' as const, stiffness: 360, damping: 30 };

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

let idCounter = 0;

export function ChatPanel() {
  const { settings, updateSettings } = useLlmSettings();
  const game = useGameSessionOptional();
  const [collapsed, setCollapsed] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragRafRef = useRef(0);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const clampPosition = useCallback((x: number, y: number) => {
    const el = cardRef.current;
    const w = el?.offsetWidth ?? PANEL_WIDTH;
    const h = el?.offsetHeight ?? PANEL_HEIGHT;
    return {
      x: Math.max(VIEWPORT_MARGIN, Math.min(x, window.innerWidth - w - VIEWPORT_MARGIN)),
      y: Math.max(VIEWPORT_MARGIN, Math.min(y, window.innerHeight - h - VIEWPORT_MARGIN)),
    };
  }, []);

  const initPosition = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const saved = localStorage.getItem(POS_STORAGE_KEY);
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved) as { x: number; y: number };
        if (typeof x === 'number' && typeof y === 'number') {
          setPosition(clampPosition(x, y));
          return;
        }
      } catch {
        /* ignore */
      }
    }
    const { offsetWidth: w, offsetHeight: h } = el;
    setPosition(
      clampPosition(window.innerWidth - w - VIEWPORT_MARGIN, window.innerHeight - h - VIEWPORT_MARGIN)
    );
  }, [clampPosition]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => initPosition());
    const onResize = () => setPosition((p) => (p ? clampPosition(p.x, p.y) : p));
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [initPosition, clampPosition]);

  const applyDomPosition = useCallback(
    (x: number, y: number) => {
      const el = cardRef.current;
      if (!el) return clampPosition(x, y);
      const next = clampPosition(x, y);
      el.style.left = `${next.x}px`;
      el.style.top = `${next.y}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      return next;
    },
    [clampPosition]
  );

  useEffect(() => {
    if (isDraggingRef.current || !position) return;
    setPosition((p) => (p ? clampPosition(p.x, p.y) : p));
  }, [collapsed, clampPosition]);

  useEffect(() => {
    if (!position || isDraggingRef.current) return;
    applyDomPosition(position.x, position.y);
  }, [position, applyDomPosition]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  useEffect(() => {
    if (!settings.apiKey.trim() || settings.models.length > 0) return;
    let cancelled = false;
    setLoadingModels(true);
    fetchModels(settings.apiKey.trim())
      .then((list) => {
        if (cancelled || list.length === 0) return;
        updateSettings({
          models: list,
          model: settings.model && list.includes(settings.model) ? settings.model : list[0],
        });
      })
      .catch(() => {
        /* 静默失败，用户可在设置中手动获取 */
      })
      .finally(() => {
        if (!cancelled) setLoadingModels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [settings.apiKey, settings.model, settings.models.length, updateSettings]);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.touchAction = '';
      cancelAnimationFrame(dragRafRef.current);

      const next = applyDomPosition(
        clientX - dragOffsetRef.current.x,
        clientY - dragOffsetRef.current.y
      );
      setPosition(next);
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next));
      dragCleanupRef.current?.();
      dragCleanupRef.current = null;
    },
    [applyDomPosition]
  );

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (position === null || e.button !== 0 || loading) return;
    e.preventDefault();
    e.stopPropagation();

    dragOffsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    isDraggingRef.current = true;
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
    applyDomPosition(position.x, position.y);

    const onMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = requestAnimationFrame(() => {
        applyDomPosition(ev.clientX - dragOffsetRef.current.x, ev.clientY - dragOffsetRef.current.y);
      });
    };

    const onUp = (ev: PointerEvent) => endDrag(ev.clientX, ev.clientY);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  };

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!settings.apiKey.trim() || !settings.model.trim()) {
      setError('请先在顶部设置中配置 API Key 和模型');
      return;
    }

    const userMsg: ChatMessage = { id: ++idCounter, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError('');
    setLoading(true);

    const assistantId = ++idCounter;

    try {
      if (game?.canJudge && game.currentCard) {
        const card = game.currentCard;
        const result = await sendJudge(
          {
            word: card.word,
            definition: card.definition,
            root: card.root,
            rootMeaning: card.rootMeaning,
            userExplanation: text,
          },
          settings
        );
        game.recordVerdict(result.verdict);
        const verdictColor = result.verdict === '正确' ? '✅' : '❌';
        const reply = `${verdictColor} 【裁决】${result.verdict}\n\n${result.feedback}`;
        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: reply }]);
      } else {
        const history: ChatMessagePayload[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        await sendChatStream(text, history, settings, (delta) => {
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === assistantId);
            if (!existing) {
              return [...prev, { id: assistantId, role: 'assistant', content: delta }];
            }
            return prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m
            );
          });
        });
        setMessages((prev) => {
          const hasReply = prev.some((m) => m.id === assistantId && m.content.trim());
          if (hasReply) return prev;
          return [...prev, { id: assistantId, role: 'assistant', content: '（无回复内容）' }];
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '请求失败';
      setError(msg);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== assistantId),
        { id: assistantId, role: 'assistant', content: `错误：${msg}` },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }, [game, input, loading, messages, settings]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const positioned = position !== null;
  const canSend = input.trim().length > 0 && !loading;

  return (
    <motion.div
      ref={cardRef}
      layout={!isDragging}
      className="fixed z-50 flex flex-col select-none"
      style={{
        left: positioned && !isDragging ? position.x : undefined,
        top: positioned && !isDragging ? position.y : undefined,
        right: positioned ? 'auto' : VIEWPORT_MARGIN,
        bottom: positioned ? 'auto' : VIEWPORT_MARGIN,
        willChange: isDragging ? 'left, top' : 'auto',
      }}
      initial={{ opacity: 0, scale: 0.94, y: 14 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        width: collapsed ? COLLAPSED_WIDTH : PANEL_WIDTH,
        height: collapsed ? 'auto' : PANEL_HEIGHT,
      }}
      transition={isDragging ? { duration: 0 } : panelTransition}
    >
      <motion.div
        layout={!isDragging}
        className={cn(
          'flex min-h-0 w-full flex-1 flex-col overflow-hidden',
          game?.canJudge && 'ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-transparent'
        )}
        animate={{ borderRadius: collapsed ? PANEL_RADIUS_COLLAPSED : PANEL_RADIUS_EXPANDED }}
        transition={isDragging ? { duration: 0 } : panelTransition}
        style={{
          background: 'rgba(14,14,20,0.97)',
          border: game?.canJudge
            ? '1px solid rgba(34,211,238,0.35)'
            : '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(20px)',
          boxShadow: game?.canJudge
            ? '0 0 40px -8px rgba(34,211,238,0.45)'
            : '0 8px 40px rgba(0,0,0,0.45)',
        }}
      >
        <div
          className={cn(
            'flex shrink-0 items-center justify-between gap-2 transition-colors',
            collapsed
              ? 'min-w-[296px] px-5 py-1.5'
              : 'border-b border-white/[0.07] px-3 py-2'
          )}
        >
          <div
            className="flex min-w-0 flex-1 items-center gap-2.5"
            style={{ cursor: loading ? 'default' : isDragging ? 'grabbing' : 'grab' }}
            onPointerDown={handleDragStart}
            title="拖动移动"
          >
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: loading ? 'rgba(168,85,247,0.9)' : 'rgba(99,102,241,0.9)' }}
            />
            <span
              className={cn(
                'font-medium text-white/85',
                collapsed ? 'text-sm tracking-wide' : 'truncate text-xs'
              )}
            >
              判官
            </span>
          </div>
          {!collapsed && (
            <select
              value={settings.model}
              onChange={(e) => updateSettings({ model: e.target.value })}
              disabled={loading || loadingModels || settings.models.length === 0}
              title="切换模型"
              onPointerDown={(e) => e.stopPropagation()}
              className="h-7 max-w-[140px] shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] text-white/80 outline-none focus:border-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {settings.models.length === 0 ? (
                <option value="">{loadingModels ? '加载中' : '未配置'}</option>
              ) : (
                settings.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
              {settings.model &&
                settings.models.length > 0 &&
                !settings.models.includes(settings.model) && (
                  <option value={settings.model}>{settings.model}</option>
                )}
            </select>
          )}
          <motion.button
            type="button"
            className="shrink-0 px-1.5 py-1 text-white/35 hover:text-white/60"
            onClick={() => setCollapsed((v) => !v)}
            onPointerDown={(e) => e.stopPropagation()}
            whileTap={{ scale: 0.9 }}
          >
            <motion.span
              animate={{ rotate: collapsed ? 0 : 180 }}
              transition={{ duration: 0.22 }}
              className="inline-block text-[10px] leading-none"
            >
              ▴
            </motion.span>
          </motion.button>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="body"
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
              >
                {messages.length === 0 && !loading && (
                  <p className="py-6 text-center text-xs text-white/25">
                    向判官提问词根、单词或英语学习相关问题
                  </p>
                )}
                {messages.map((msg) => {
                  if (msg.role === 'assistant' && !msg.content.trim()) return null;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className="max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                        style={{
                          background:
                            msg.role === 'user'
                              ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                              : 'rgba(255,255,255,0.06)',
                          color: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.9)',
                          border:
                            msg.role === 'assistant'
                              ? '1px solid rgba(255,255,255,0.08)'
                              : 'none',
                        }}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-start">
                    <div
                      className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-white/40"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-indigo-400" />
                      {game?.canJudge ? '阅卷中...' : '思考中...'}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="shrink-0 px-3 pb-1 text-xs text-red-400/90">{error}</p>
              )}

              <div className="shrink-0 border-t border-white/[0.07] p-3">
                <div
                  className="flex items-end gap-2 rounded-xl border px-2 py-2"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      game?.canJudge && game.currentCard
                        ? `解释「${game.currentCard.word}」词根含义，发送阅卷`
                        : game?.active
                          ? '本轮已阅卷，可继续向判官提问'
                          : '输入消息，Enter 发送，Shift+Enter 换行'
                    }
                    disabled={loading}
                    className="max-h-[120px] min-h-[24px] min-w-0 flex-1 resize-none bg-transparent px-1 py-1 text-sm text-white/90 outline-none placeholder:text-white/25 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={!canSend}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity disabled:opacity-35"
                    style={{
                      background: canSend
                        ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                        : 'rgba(255,255,255,0.1)',
                    }}
                    title="发送"
                  >
                    {loading ? (
                      <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin text-white" />
                    ) : (
                      <FontAwesomeIcon icon={faArrowUp} className="h-3.5 w-3.5 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
