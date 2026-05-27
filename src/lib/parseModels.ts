export function parseModelsPayload(data: unknown): string[] {
  if (Array.isArray(data)) {
    const result: string[] = [];
    for (const item of data) {
      if (typeof item === 'string') {
        result.push(item);
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const name = obj.id ?? obj.name ?? obj.model;
        if (name) result.push(String(name));
      }
    }
    return result;
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'models', 'items', 'results']) {
      if (key in obj) return parseModelsPayload(obj[key]);
    }
    if (typeof obj.model === 'string') return [obj.model];
  }

  return [];
}
