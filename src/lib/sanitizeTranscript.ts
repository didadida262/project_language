/** 是否包含至少一个字母或汉字（过滤纯标点幻觉如 "!"、"|"） */
export function isMeaningfulTranscript(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text);
}

/** 清理 Whisper 识别结果中的乱码与不可见字符 */
export function sanitizeTranscript(text: string): string {
  if (!text) return '';

  let cleaned = text
    // Whisper 特殊 token，如 <|zh|>、<|0.00|>
    .replace(/<\|[^|>]*\|>/g, '')
    // 残留的时间戳竖线
    .replace(/\|+/g, ' ')
    // Unicode 替换字符（浏览器显示为 ）
    .replace(/\uFFFD/g, '')
    // 零宽字符、BOM 等
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    // 控制字符（保留换行、制表符）
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  cleaned = cleaned.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return cleaned;
}
