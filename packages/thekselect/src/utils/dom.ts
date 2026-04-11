export function generateId(prefix: string = 'thek'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}
