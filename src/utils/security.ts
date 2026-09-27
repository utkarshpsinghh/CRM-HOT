import { SecurityAuditLog } from '../types/crm';

const SECURITY_STORAGE_KEYS = {
  ATTEMPTS: 'crm_hot_security_attempts_v1',
  LOCKOUT: 'crm_hot_security_lockout_v1',
  LOGS: 'crm_hot_security_logs_v1',
  SESSION: 'crm_hot_security_session_v1',
};

const MAX_FAILED_ATTEMPTS = 50;
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 minute lockout
const ALLIANCE_SALT = 'HOT_KINGSHOT_CRM_2026_SECURE_SALT_99';

/**
 * SHA-256 Password Hashing with Salt
 */
export async function hashPasswordSha256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ALLIANCE_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Rate Limiting & Brute-Force Protection
 */
export interface LoginAttemptState {
  attempts: number;
  lockedUntil: number | null;
  isLocked: boolean;
  remainingSeconds: number;
}

export function getLoginAttemptState(): LoginAttemptState {
  try {
    const lockoutStr = localStorage.getItem(SECURITY_STORAGE_KEYS.LOCKOUT);
    const attemptsStr = localStorage.getItem(SECURITY_STORAGE_KEYS.ATTEMPTS);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    const lockedUntil = lockoutStr ? parseInt(lockoutStr, 10) : null;

    if (lockedUntil && Date.now() < lockedUntil) {
      const remainingSeconds = Math.ceil((lockedUntil - Date.now()) / 1000);
      return {
        attempts,
        lockedUntil,
        isLocked: true,
        remainingSeconds,
      };
    }

    // Lock expired
    if (lockedUntil && Date.now() >= lockedUntil) {
      localStorage.removeItem(SECURITY_STORAGE_KEYS.LOCKOUT);
      localStorage.removeItem(SECURITY_STORAGE_KEYS.ATTEMPTS);
      return {
        attempts: 0,
        lockedUntil: null,
        isLocked: false,
        remainingSeconds: 0,
      };
    }

    return {
      attempts,
      lockedUntil: null,
      isLocked: false,
      remainingSeconds: 0,
    };
  } catch {
    return { attempts: 0, lockedUntil: null, isLocked: false, remainingSeconds: 0 };
  }
}

export function recordFailedAttempt(username: string): LoginAttemptState {
  const currentState = getLoginAttemptState();
  const nextAttempts = currentState.attempts + 1;
  localStorage.setItem(SECURITY_STORAGE_KEYS.ATTEMPTS, nextAttempts.toString());

  if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockExpiry = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(SECURITY_STORAGE_KEYS.LOCKOUT, lockExpiry.toString());
    addSecurityLog({
      type: 'ACCOUNT_LOCKED',
      username,
      details: `Multiple failed attempts (${nextAttempts}). Lockout triggered for 1 minute.`,
    });
    return {
      attempts: nextAttempts,
      lockedUntil: lockExpiry,
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  addSecurityLog({
    type: 'LOGIN_FAILED',
    username,
    details: `Failed sign-in attempt (${nextAttempts}/${MAX_FAILED_ATTEMPTS}).`,
  });

  return {
    attempts: nextAttempts,
    lockedUntil: null,
    isLocked: false,
    remainingSeconds: 0,
  };
}

export function resetLoginAttempts(username = 'admin'): void {
  localStorage.removeItem(SECURITY_STORAGE_KEYS.ATTEMPTS);
  localStorage.removeItem(SECURITY_STORAGE_KEYS.LOCKOUT);
  addSecurityLog({
    type: 'LOGIN_SUCCESS',
    username,
    details: 'Authorized officer access verified.',
  });
}

/**
 * Security Audit Logging
 */
export function getSecurityLogs(): SecurityAuditLog[] {
  try {
    const raw = localStorage.getItem(SECURITY_STORAGE_KEYS.LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSecurityLog(log: Omit<SecurityAuditLog, 'id' | 'timestamp'>): void {
  try {
    const logs = getSecurityLogs();
    const entry: SecurityAuditLog = {
      ...log,
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(entry);
    // Keep last 100 logs
    const trimmed = logs.slice(0, 100);
    localStorage.setItem(SECURITY_STORAGE_KEYS.LOGS, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to write security log:', err);
  }
}

/**
 * Front-end Anti-Leak & Anti-Copy Protection Hook/Initializer
 */
export function setupClientProtection(): () => void {
  // 1. Console Security Watermark
  if (typeof window !== 'undefined') {
    const stylesTitle = 'color: #ca8a04; font-size: 16px; font-weight: bold; background: #1c140e; padding: 4px 8px; border-radius: 4px; border: 1px solid #78350f;';
    const stylesBody = 'color: #fef08a; font-size: 12px; font-family: monospace;';
    console.log('%c⚔️ [HOT ALLIANCE COMMAND CENTER] SECURITY PROTOCOL ACTIVE', stylesTitle);
    console.log(
      '%cUnauthorized code tampering, reverse engineering, scraping, or token hijacking is strictly audited and logged.\nSource protection active.',
      stylesBody
    );
  }

  // 2. Prevent Context Menu (Right Click)
  const handleContextMenu = (e: MouseEvent) => {
    // Only allow if clicking inside a standard input or textarea where paste is needed
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
  };

  // 3. Prevent DevTools shortcuts and inspect keys
  const handleKeyDown = (e: KeyboardEvent) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (Inspect Element)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      return;
    }

    // Ctrl+U (View Page Source)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      return;
    }

    // Ctrl+S (Save Page HTML)
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return;
    }
  };

  // 4. Prevent Dragging content
  const handleDragStart = (e: DragEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.tagName !== 'INPUT') {
      e.preventDefault();
    }
  };

  window.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('dragstart', handleDragStart);

  return () => {
    window.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('dragstart', handleDragStart);
  };
}
