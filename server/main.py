import asyncio
import os
import re
import subprocess
import tempfile
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

import torch
from fastapi import FastAPI, File, Form, Query, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI(title="Whisper ASR Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 模型路径：优先读环境变量，默认指向本地已下载的目录
MODEL_PATH = os.environ.get(
    "WHISPER_MODEL_PATH",
    str(Path.home() / "Desktop/work/whisper-large-v3-turbo"),
)

# M4 Mac 用 MPS 加速；有 CUDA 用 CUDA；否则 CPU
if torch.backends.mps.is_available():
    device = "mps"
    dtype = torch.float16
elif torch.cuda.is_available():
    device = "cuda"
    dtype = torch.float16
else:
    device = "cpu"
    dtype = torch.float32

print(f"[Whisper] 模型路径: {MODEL_PATH}")
print(f"[Whisper] 推理设备: {device}")
print("[Whisper] 加载模型中...")

pipe = pipeline(
    "automatic-speech-recognition",
    model=MODEL_PATH,
    device=device,
    dtype=dtype,
)

print("[Whisper] 模型加载完成 ✓")

# 推理放线程池，避免阻塞 asyncio 事件循环（可并行处理多段录音）
_infer_pool = ThreadPoolExecutor(max_workers=1)

# 可选：服务端默认语言；不设则依赖前端传入
DEFAULT_LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "").strip() or None


def normalize_language(lang: Optional[str]) -> Optional[str]:
    if not lang:
        return None
    key = lang.strip().lower()
    aliases = {
        "zh": "zh",
        "chinese": "zh",
        "中文": "zh",
        "en": "en",
        "english": "en",
        "英文": "en",
    }
    return aliases.get(key)


def clean_transcript_text(text: str) -> str:
    """移除 Whisper 输出中的特殊 token、替换字符与不可见字符。"""
    if not text:
        return ""

    text = re.sub(r"<\|[^|>]*\|>", "", text)
    text = re.sub(r"\|+", " ", text)
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\ufffd", "")
    text = re.sub(r"[\u200b-\u200f\u202a-\u202e\ufeff]", "", text)
    text = "".join(
        ch
        for ch in text
        if unicodedata.category(ch) not in ("Cc", "Cf") or ch in "\n\t "
    )
    return re.sub(r"\s+", " ", text).strip()


def is_meaningful_text(text: str) -> bool:
    """过滤纯标点幻觉（如 "!" "|"）。"""
    return bool(re.search(r"[\w\u4e00-\u9fff]", text, re.UNICODE))


def extract_pipeline_text(result) -> str:
    """兼容 transformers pipeline 多种返回结构。"""
    if isinstance(result, str):
        return result.strip()
    if isinstance(result, dict):
        text = result.get("text")
        if text:
            return str(text).strip()
        chunks = result.get("chunks")
        if isinstance(chunks, list) and chunks:
            parts = []
            for chunk in chunks:
                if isinstance(chunk, dict) and chunk.get("text"):
                    parts.append(str(chunk["text"]).strip())
            return " ".join(parts).strip()
    if isinstance(result, list) and result:
        return extract_pipeline_text(result[0])
    return ""


def prepare_audio_path(src_path: str, suffix: str) -> tuple[str, bool]:
    """
    将浏览器录制的 webm/ogg 转为 16kHz 单声道 wav，提升 ffmpeg 解码稳定性。
    返回 (推理用路径, 是否为临时 wav 需删除)。
    """
    if suffix in {".wav", ".wave"}:
        return src_path, False

    wav_path = src_path + ".wav"
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                src_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                wav_path,
            ],
            check=True,
            capture_output=True,
        )
        return wav_path, True
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"[Whisper] ffmpeg 转码失败: {e}")
        raise HTTPException(
            status_code=400,
            detail="音频转码失败，请安装 ffmpeg：brew install ffmpeg",
        )


class TranscribeResult(BaseModel):
    text: str
    language: str


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_PATH, "device": device}


@app.post("/transcribe", response_model=TranscribeResult)
async def transcribe(
    file: UploadFile = File(...),
    language: Optional[str] = Query(None, description="识别语言：zh 或 en"),
    language_form: Optional[str] = Form(None, alias="language"),
):
    """
    接收音频文件，返回识别文本。
    language: 通过 query 或 form 传入，支持 zh / en。
    """
    suffix = _get_suffix(file.content_type or "", file.filename or "")
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    infer_path = tmp_path
    converted = False
    try:
        infer_path, converted = prepare_audio_path(tmp_path, suffix)

        raw_lang = language_form or language or DEFAULT_LANGUAGE
        lang = normalize_language(raw_lang)
        if raw_lang and not lang:
            raise HTTPException(status_code=400, detail="language 仅支持 zh 或 en")

        generate_kwargs: dict = {"task": "transcribe"}
        if lang:
            generate_kwargs["language"] = lang

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            _infer_pool,
            lambda: pipe(
                infer_path,
                generate_kwargs=generate_kwargs,
                return_timestamps=False,
            ),
        )

        raw = extract_pipeline_text(result)
        text = clean_transcript_text(raw)
        if text and not is_meaningful_text(text):
            text = ""
        detected_lang = lang or ""
        print(f"[Whisper] raw={raw!r} -> text={text!r}")

        return TranscribeResult(text=text, language=detected_lang)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if converted and os.path.exists(infer_path):
            os.unlink(infer_path)
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _get_suffix(content_type: str, filename: str = "") -> str:
    base_type = content_type.split(";")[0].strip().lower()
    mapping = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/wav": ".wav",
        "audio/wave": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp4": ".mp4",
        "audio/x-m4a": ".m4a",
        "video/webm": ".webm",
    }
    if base_type in mapping:
        return mapping[base_type]

    if filename and "." in filename:
        ext = Path(filename).suffix.lower()
        if ext in {".webm", ".ogg", ".wav", ".mp3", ".mp4", ".m4a"}:
            return ext

    return ".webm"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
