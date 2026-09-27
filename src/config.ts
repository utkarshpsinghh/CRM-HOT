// Central configuration for Google Apps Script Web App backend
const envUrl = (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '').trim();

export const DEFAULT_GAS_URL = envUrl;
