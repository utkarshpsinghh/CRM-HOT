import { createClient } from '@supabase/supabase-js';

// Default connection settings
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nlnrfoolpcdgvgwgpklx.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbnJmb29scGNkZ3Znd2dwa2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTc5ODIsImV4cCI6MjEwNjc5Mzk4Mn0.P-e79LnzxmNw9hZArKr4CdI57Ba8xnBqcfB0lkW7zpI';

export function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

export function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function handleCors(req: any, res: any): boolean {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

export function extractApiKey(req: any): string | null {
  // 1. Header: x-api-key
  const headerKey = req.headers?.['x-api-key'] || req.headers?.['X-Api-Key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }

  // 2. Header: Authorization: Bearer <key>
  const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // 3. Query Param: ?api_key=... or ?apiKey=...
  if (req.query) {
    const qKey = req.query.api_key || req.query.apiKey || req.query.key;
    if (typeof qKey === 'string' && qKey.trim()) {
      return qKey.trim();
    }
  }

  return null;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
  permissions?: ('members' | 'leaderboard' | 'events' | 'attendance')[];
}

export async function validateApiKey(
  req: any,
  res: any,
  requiredPermission?: 'members' | 'leaderboard' | 'events' | 'attendance'
): Promise<boolean> {
  const key = extractApiKey(req);

  if (!key) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing API Key.',
      hint: "Provide your API Key in the 'x-api-key' header, 'Authorization: Bearer <key>' header, or query parameter '?api_key=<key>'."
    });
    return false;
  }

  // Master key bypass if configured in environment
  const masterKey = process.env.CRM_MASTER_API_KEY;
  if (masterKey && key === masterKey) {
    return true;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'api_keys')
      .limit(1);

    if (error) {
      console.warn('API key lookup warning:', error.message);
    }

    let validKeys: ApiKeyItem[] = [];
    if (data && data.length > 0 && data[0].value) {
      try {
        validKeys = JSON.parse(data[0].value);
      } catch {}
    }

    const matchedKey = validKeys.find(k => k && k.key === key);

    if (!matchedKey) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or revoked API Key.',
        hint: 'Please check your API key in CRM Settings or generate a new one.'
      });
      return false;
    }

    // Permission check if specific permission required
    if (requiredPermission && matchedKey.permissions && matchedKey.permissions.length > 0) {
      if (!matchedKey.permissions.includes(requiredPermission)) {
        res.status(403).json({
          success: false,
          error: `Forbidden: API Key does not have '${requiredPermission}' permission.`,
        });
        return false;
      }
    }

    return true;
  } catch (err: any) {
    console.error('validateApiKey error:', err);
    res.status(500).json({
      success: false,
      error: 'Authentication verification service error.',
    });
    return false;
  }
}
