export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  const safe = /^\s*[=+@-]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(safe)
    ? `"${safe.replace(/"/g, '""')}"`
    : safe;
}
