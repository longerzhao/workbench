/** ISO 串 ↔ datetime-local 输入框的值格式 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** ISO → 'YYYY-MM-DDTHH:mm'；非法或空值返回空串 */
export function toLocalInput(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 'YYYY-MM-DDTHH:mm' → ISO；空值返回 undefined */
export function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}