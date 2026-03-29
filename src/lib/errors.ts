export function mapErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = String((err as { message?: string }).message);
    if (m === 'Network Error' || m.includes('ECONNREFUSED')) {
      return '网络异常或接口未就绪，请检查后端或开启 Mock。';
    }
    return m || '加载失败';
  }
  return '加载失败';
}
