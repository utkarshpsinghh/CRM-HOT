// Central configuration for King's Shot Alliance CRM (#1391 Kingdom HOT Alliance)
export const DEFAULT_KINGDOM_ID = '1391';
export const DEFAULT_ALLIANCE_TAG = 'HOT';
export const DEFAULT_ALLIANCE_NAME = 'HOT Alliance';

// Default Supabase project configuration (can be overridden in Settings)
export const DEFAULT_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://nlnrfoolpcdgvgwgpklx.supabase.co').trim();
export const DEFAULT_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
