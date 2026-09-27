/**
 * Safe date parsing and formatting utility.
 * Handles ISO strings, timestamps, DD/MM/YYYY, MM/DD/YYYY, and raw date strings.
 * Never outputs "Invalid Date" or "NaN".
 */
export function safeFormatDate(
  dateInput: string | number | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '—';
  const str = String(dateInput).trim();
  if (!str) return '—';

  // 1. Try standard JS Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // 2. Handle DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const [, day, month, year, hour, minute] = dmyMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hour ? Number(hour) : 0,
      minute ? Number(minute) : 0
    );
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  // 3. Fallback: clean any unwanted time suffix and return clean raw string
  const cleaned = str.replace(/T\d{2}:\d{2}.*/, '').trim();
  return cleaned || '—';
}

export function safeFormatDateTime(
  dateInput: string | number | Date | undefined | null
): string {
  if (!dateInput) return '—';
  const str = String(dateInput).trim();
  if (!str) return '—';

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${time} • ${date}`;
  }

  return safeFormatDate(dateInput);
}
