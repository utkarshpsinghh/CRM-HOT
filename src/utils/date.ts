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

/**
 * Automatically computes whether an event is 'Upcoming' or 'Completed' based on its date & time.
 * Never returns 'Live' (only Upcoming and Completed per user requirement).
 */
export function getComputedEventStatus(
  dateInput: string | number | Date | undefined | null
): 'Upcoming' | 'Completed' {
  if (!dateInput) return 'Completed';
  const str = String(dateInput).trim();
  const d = new Date(str);
  if (isNaN(d.getTime())) return 'Completed';
  return d.getTime() > Date.now() ? 'Upcoming' : 'Completed';
}

/**
 * Returns a human-friendly relative time label (e.g. "Starts in 2h 30m", "In 3 days", "Yesterday")
 */
export function getEventRelativeTime(
  dateInput: string | number | Date | undefined | null
): string {
  if (!dateInput) return '';
  const d = new Date(String(dateInput));
  const time = d.getTime();
  if (isNaN(time)) return '';

  const diffMs = time - Date.now();
  const isFuture = diffMs > 0;
  const absSec = Math.floor(Math.abs(diffMs) / 1000);
  const absMin = Math.floor(absSec / 60);
  const absHours = Math.floor(absMin / 60);
  const absDays = Math.floor(absHours / 24);

  if (isFuture) {
    if (absMin < 1) return 'Starting shortly';
    if (absMin < 60) return `Starts in ${absMin}m`;
    if (absHours < 24) {
      const remainingMin = absMin % 60;
      return `Starts in ${absHours}h${remainingMin > 0 ? ` ${remainingMin}m` : ''}`;
    }
    if (absDays === 1) return 'Tomorrow';
    return `In ${absDays} days`;
  } else {
    if (absHours < 1) return 'Ended just now';
    if (absHours < 24) return `Ended ${absHours}h ago`;
    if (absDays === 1) return 'Yesterday';
    return `${absDays} days ago`;
  }
}
