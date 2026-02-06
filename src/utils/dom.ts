export function generateId(prefix: string = 'thek'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
