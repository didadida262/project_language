import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppLanguage } from '../context/AppLanguageContext';
import { blobToWav16k } from '../lib/encodeWav';
import { isMeaningfulTranscript, sanitizeTranscript } from '../lib/sanitizeTranscript';

const METER_BAR_COUNT = 12;
const MIN_RECORD_MS = 400;
const MIN_AUDIO_BYTES = 1200;
const MAX_RECORD_MS = 120000;

const API_BASE = '/api';
const MAX_HISTORY = 8;

const POS_STORAGE_KEY = 'voice-card-position';
const VIEWPORT_MARGIN = 20;

interface Transcript {
  id: number;
  text: string;
  ts: number;
}

type CardStatus = 'starting' | 'ready' | 'recording' | 'processing' | 'error';

let idCounter = 0;

export function VoiceCard() {
  const { lang } = useAppLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [cardStatus, setCardStatus] = useState<CardStatus>('starting');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [meterBars, setMeterBars] = useState<number[]>(() =>
    Array(METER_BAR_COUNT).fill(0.06)
  );
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterRafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordMimeRef = useRef('audio/webm');
  const recordStartRef = useRef(0);
  const isRecordingRef = useRef(false);
  const maxRecordTimerRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const isRecording = cardStatus === 'recording';

  const clampPosition = useCallback((x: number, y: number) => {
    const el = cardRef.current;
    const w = el?.offsetWidth ?? 300;
    const h = el?.offsetHeight ?? 160;
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
  }, [transcripts]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => initPosition());
    const onResize = () => setPosition((p) => (p ? clampPosition(p.x, p.y) : p));
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [initPosition, clampPosition]);

  useEffect(() => {
    if (position) setPosition((p) => (p ? clampPosition(p.x, p.y) : p));
  }, [collapsed, clampPosition]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      setPosition(
        clampPosition(e.clientX - dragOffsetRef.current.x, e.clientY - dragOffsetRef.current.y)
      );
    };

    const onUp = () => {
      setIsDragging(false);
      setPosition((p) => {
        if (p) localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(p));
        return p;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDragging, clampPosition]);

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (position === null || e.button !== 0 || isRecording) return;
    e.preventDefault();
    dragOffsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setPosition((p) => {
      if (p) localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(p));
      return p;
    });
  };

  const stopVolumeMeter = useCallback(() => {
    cancelAnimationFrame(meterRafRef.current);
    setMeterBars(Array(METER_BAR_COUNT).fill(0.06));
  }, []);

  const startVolumeMeter = useCallback((analyser: AnalyserNode) => {
    analyser.smoothingTimeConstant = 0.65;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);
    const speechBinEnd = Math.max(8, Math.floor(analyser.frequencyBinCount * 0.6));

    const tick = () => {
      if (!isRecordingRef.current) return;

      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      let sumSq = 0;
      for (let i = 0; i < timeData.length; i++) {
        const n = (timeData[i] - 128) / 128;
        sumSq += n * n;
      }
      const rms = Math.sqrt(sumSq / timeData.length);

      const nextBars = Array.from({ length: METER_BAR_COUNT }, (_, i) => {
        const start = Math.floor((i / METER_BAR_COUNT) * speechBinEnd);
        const end = Math.max(start + 1, Math.floor(((i + 1) / METER_BAR_COUNT) * speechBinEnd));
        let peak = 0;
        for (let j = start; j < end; j++) peak = Math.max(peak, freqData[j]);
        const band = peak / 255;
        const raw = band * 0.75 + rms * 0.85;
        const boosted = 1 - Math.exp(-raw * 6);
        return Math.max(0.06, Math.min(1, boosted));
      });

      setMeterBars(nextBars);
      meterRafRef.current = requestAnimationFrame(tick);
    };

    cancelAnimationFrame(meterRafRef.current);
    meterRafRef.current = requestAnimationFrame(tick);
  }, []);

  const sendToBackend = useCallback(async (blob: Blob, mimeType: string) => {
    const wav = await blobToWav16k(blob);
    const uploadBlob = wav ?? blob;
    const uploadMime = wav ? 'audio/wav' : mimeType;
    const form = new FormData();
    form.append('file', uploadBlob, `audio${mimeTypeToExt(uploadMime)}`);
    form.append('language', lang);
    setIsProcessing(true);
    setCardStatus('processing');

    fetch(`${API_BASE}/transcribe`, { method: 'POST', body: form })
      .then(async (res) => {
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(detail || `HTTP ${res.status}`);
        }
        return res.json() as Promise<{ text: string; language: string }>;
      })
      .then(({ text }) => {
        const cleaned = sanitizeTranscript(text ?? '');
        if (cleaned && isMeaningfulTranscript(cleaned)) {
          setTranscripts((prev) =>
            [...prev, { id: ++idCounter, text: cleaned, ts: Date.now() }].slice(-MAX_HISTORY)
          );
          setErrorMsg('');
        } else {
          console.warn('[Whisper] 识别结果为空:', text);
          setErrorMsg('未识别到内容，请清晰说话后重试');
          window.setTimeout(() => setErrorMsg(''), 3000);
        }
      })
      .catch((err) => {
        console.warn('[Whisper] 转录失败:', err);
        setErrorMsg('识别失败，请确认后端已启动');
        setCardStatus('error');
        window.setTimeout(() => {
          setErrorMsg('');
          setCardStatus('ready');
        }, 3000);
      })
      .finally(() => {
        setIsProcessing(false);
        setCardStatus((s) => (s === 'error' ? s : 'ready'));
      });
  }, [lang]);

  const ensureMic = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) {
      if (audioCtxRef.current?.state === 'suspended') {
        try {
          await audioCtxRef.current.resume();
        } catch {
          /* ignore */
        }
      }
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);
      await ctx.resume();

      setCardStatus('ready');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg('无法访问麦克风：' + msg);
      setCardStatus('error');
      return false;
    }
  }, []);

  const finishRecording = useCallback(() => {
    window.clearTimeout(maxRecordTimerRef.current);
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    if (typeof recorder.requestData === 'function') recorder.requestData();
    recorder.stop();
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    const analyser = analyserRef.current;
    if (!stream || !analyser) return;

    let recorder: MediaRecorder;
    let mimeType: string;
    try {
      ({ recorder, mimeType } = createMediaRecorder(stream));
    } catch (err) {
      console.error('[VoiceCard] MediaRecorder 创建失败:', err);
      setErrorMsg('浏览器不支持录音');
      setCardStatus('error');
      return;
    }

    recordChunksRef.current = [];
    recordMimeRef.current = mimeType;
    recorderRef.current = recorder;
    recordStartRef.current = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      isRecordingRef.current = false;
      stopVolumeMeter();
      recorderRef.current = null;

      const duration = Date.now() - recordStartRef.current;
      const totalSize = recordChunksRef.current.reduce((sum, c) => sum + c.size, 0);

      if (duration < MIN_RECORD_MS || totalSize < MIN_AUDIO_BYTES) {
        setErrorMsg('录音太短，请再说一次');
        setCardStatus('ready');
        window.setTimeout(() => setErrorMsg(''), 2500);
        return;
      }

      const blob = new Blob(recordChunksRef.current, { type: mimeType });
      void sendToBackend(blob, mimeType);
    };

    recorder.onerror = () => {
      isRecordingRef.current = false;
      stopVolumeMeter();
      recorderRef.current = null;
      setCardStatus('ready');
    };

    try {
      recorder.start(200);
    } catch (err) {
      console.error('[VoiceCard] MediaRecorder.start 失败:', err);
      setErrorMsg('无法开始录音');
      setCardStatus('ready');
      return;
    }

    isRecordingRef.current = true;
    setCardStatus('recording');
    startVolumeMeter(analyser);

    maxRecordTimerRef.current = window.setTimeout(() => {
      finishRecording();
    }, MAX_RECORD_MS);
  }, [finishRecording, sendToBackend, startVolumeMeter, stopVolumeMeter]);

  const toggleRecording = useCallback(async () => {
    if (cardStatus === 'processing' || cardStatus === 'starting') return;

    if (cardStatus === 'recording') {
      finishRecording();
      return;
    }

    const ok = await ensureMic();
    if (!ok) return;

    if (cardStatus === 'error') setErrorMsg('');
    startRecording();
  }, [cardStatus, ensureMic, finishRecording, startRecording]);

  useEffect(() => {
    setCardStatus('ready');
    return () => {
      window.clearTimeout(maxRecordTimerRef.current);
      cancelAnimationFrame(meterRafRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      void audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const showProcessing = isProcessing;
  const latestText = transcripts[transcripts.length - 1]?.text ?? '';
  const historyTexts = transcripts.slice(0, -1).reverse().slice(0, 3);
  const positioned = position !== null;

  const statusLabel =
    cardStatus === 'starting'
      ? '准备中...'
      : cardStatus === 'recording'
      ? '录音中...'
      : showProcessing
      ? '识别中...'
      : cardStatus === 'error'
      ? '出错'
      : '点击麦克风录音';

  return (
    <motion.div
      ref={cardRef}
      className="fixed z-50 select-none"
      style={{
        left: positioned ? position.x : undefined,
        top: positioned ? position.y : undefined,
        right: positioned ? 'auto' : VIEWPORT_MARGIN,
        bottom: positioned ? 'auto' : VIEWPORT_MARGIN,
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div
        style={{
          width: collapsed ? 'auto' : 300,
          background: 'rgba(14,14,20,0.95)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 16,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="flex items-center gap-2 min-w-0 flex-1 px-3 py-2.5"
            style={{ cursor: isRecording ? 'default' : isDragging ? 'grabbing' : 'grab' }}
            onPointerDown={handleDragStart}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            title="拖动移动"
          >
            <PulseDot status={cardStatus} processing={showProcessing} />
            <span className="text-xs font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.7)' }}>
              语音识别
            </span>
            <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.28)' }}>
              {statusLabel}
            </span>
          </div>
          <button
            className="shrink-0 px-2 py-2.5"
            onClick={() => setCollapsed((v) => !v)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, lineHeight: 1 }}
          >
            {collapsed ? '▴' : '▾'}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <>
                  <div className="flex items-end gap-0.5 px-3 pt-3" style={{ height: 32 }}>
                    {meterBars.map((h, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${(isRecording ? h : 0.06) * 100}%`,
                          minHeight: 2,
                          borderRadius: 2,
                          transition: 'height 0.06s ease-out, background 0.15s',
                          background: isRecording
                            ? `rgba(99,102,241,${0.35 + h * 0.65})`
                            : 'rgba(255,255,255,0.1)',
                        }}
                      />
                    ))}
                  </div>

                  <div ref={scrollRef} className="px-3 pt-2" style={{ minHeight: 56 }}>
                    {latestText ? (
                      <motion.p
                        key={transcripts[transcripts.length - 1]?.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.92)' }}
                      >
                        {latestText}
                      </motion.p>
                    ) : showProcessing ? (
                      <div className="flex items-center gap-1.5 py-2">
                        <LoadingDots />
                      </div>
                    ) : (
                      <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        {isRecording
                          ? '正在录音，再次点击结束并识别'
                          : '点击下方麦克风开始录音'}
                      </p>
                    )}

                    {errorMsg && (
                      <p className="text-xs mt-1" style={{ color: 'rgba(248,113,113,0.75)' }}>
                        {errorMsg}
                      </p>
                    )}

                    {historyTexts.length > 0 && (
                      <div
                        className="mt-2 pt-1.5 space-y-1"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {historyTexts.map((t) => (
                          <p
                            key={t.id}
                            className="text-xs truncate"
                            style={{ color: 'rgba(255,255,255,0.25)' }}
                            title={t.text}
                          >
                            {t.text}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center px-3 pb-3 pt-1">
                    <MicButton
                      active={isRecording}
                      disabled={showProcessing || cardStatus === 'starting'}
                      onClick={() => void toggleRecording()}
                    />
                  </div>
              </>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MicButton({
  active,
  disabled,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      whileTap={{ scale: 0.94 }}
      animate={
        active
          ? {
              boxShadow: [
                '0 0 0 0 rgba(239,68,68,0.5)',
                '0 0 0 10px rgba(239,68,68,0)',
              ],
            }
          : {}
      }
      transition={active ? { repeat: Infinity, duration: 1.2 } : {}}
      className="flex items-center justify-center rounded-full"
      style={{
        width: 52,
        height: 52,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        background: active
          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
          : 'linear-gradient(135deg, #6366f1, #4f46e5)',
      }}
      title={active ? '点击结束录音' : '点击开始录音'}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        {active ? (
          <rect x="7" y="7" width="10" height="10" rx="1.5" fill="white" />
        ) : (
          <>
            <rect x="9" y="3" width="6" height="11" rx="3" fill="white" />
            <path
              d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </motion.button>
  );
}

function PulseDot({ status, processing }: { status: CardStatus; processing?: boolean }) {
  const color =
    status === 'error'
      ? 'rgba(248,113,113,0.9)'
      : processing
      ? 'rgba(168,85,247,0.95)'
      : status === 'recording'
      ? 'rgba(239,68,68,0.9)'
      : status === 'ready'
      ? 'rgba(99,102,241,0.9)'
      : 'rgba(251,191,36,0.8)';

  return (
    <motion.span
      animate={status === 'recording' || processing ? { opacity: [1, 0.4, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
      style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color }}
    />
  );
}

function LoadingDots() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.25 }}
          style={{ display: 'block', width: 4, height: 4, borderRadius: '50%', background: 'rgba(99,102,241,0.7)' }}
        />
      ))}
      <span className="text-xs ml-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
        识别中...
      </span>
    </>
  );
}

function getSupportedMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

function createMediaRecorder(stream: MediaStream): { recorder: MediaRecorder; mimeType: string } {
  const preferred = getSupportedMimeType();
  if (preferred) {
    try {
      return { recorder: new MediaRecorder(stream, { mimeType: preferred }), mimeType: preferred };
    } catch {
      /* fallback */
    }
  }
  const recorder = new MediaRecorder(stream);
  return { recorder, mimeType: recorder.mimeType || 'audio/webm' };
}

function mimeTypeToExt(mimeType: string): string {
  if (mimeType.includes('wav')) return '.wav';
  if (mimeType.includes('webm')) return '.webm';
  if (mimeType.includes('ogg')) return '.ogg';
  if (mimeType.includes('mp4')) return '.mp4';
  return '.webm';
}
