/**
 * Safe UTC date parsing and formatting utility.
 * Always operates in UTC (Game Server Reset Time), never local timezone (e.g. IST).
 * Handles ISO strings, timestamps, YYYY-MM-DD HH:mm, DD/MM/YYYY, etc.
 */

export function parseDateAsUtc(dateInput: string | number | Date | undefined | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  const str = String(dateInput).trim();
  if (!str) return null;

  // 1. If string has explicit timezone offset or trailing Z (e.g. 2026-10-06T02:00:00Z)
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // 2. YYYY-MM-DD [HH:mm[:ss]] or YYYY-MM-DDTHH:mm[:ss]
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const [, y, mo, d, h, mi, sec] = isoMatch;
    return new Date(Date.UTC(+y, +mo - 1, +d, +(h || 0), +(mi || 0), +(sec || 0)));
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const [, day, month, year, hour, minute] = dmyMatch;
    return new Date(Date.UTC(+year, +month - 1, +day, +(hour || 0), +(minute || 0), 0));
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function safeFormatDate(
  dateInput: string | number | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = parseDateAsUtc(dateInput);
  if (!d) return '—';

  const hasTime = options?.hour !== undefined || options?.minute !== undefined;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: hasTime ? undefined : 'numeric',
    timeZone: 'UTC',
  };

  const formatted = d.toLocaleDateString('en-US', {
    ...defaultOptions,
    ...(options || {}),
    timeZone: 'UTC', // Strictly UTC
    hour12: false,   // 24-hour UTC military format for alliance wars
  });

  return hasTime ? `${formatted} UTC` : formatted;
}

export function safeFormatDateTime(
  dateInput: string | number | Date | undefined | null
): string {
  const d = parseDateAsUtc(dateInput);
  if (!d) return '—';

  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });

  return `${dateStr}, ${timeStr} UTC`;
}

export function formatCurrentUtcTime(): string {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes} UTC`;
}

/**
 * Automatically computes whether an event is 'Upcoming' or 'Completed' based on its date & time in UTC.
 */
export function getComputedEventStatus(
  dateInput: string | number | Date | undefined | null
): 'Upcoming' | 'Completed' {
  const d = parseDateAsUtc(dateInput);
  if (!d) return 'Completed';
  return d.getTime() > Date.now() ? 'Upcoming' : 'Completed';
}

/**
 * Returns a human-friendly relative time label (e.g. "Starts in 2h 30m", "In 3 days", "Yesterday")
 */
export function getEventRelativeTime(
  dateInput: string | number | Date | undefined | null
): string {
  const d = parseDateAsUtc(dateInput);
  if (!d) return '';
  const time = d.getTime();

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
