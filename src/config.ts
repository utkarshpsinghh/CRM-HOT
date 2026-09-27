// Central configuration for Google Apps Script Web App backend
const ACTIVE_CRM_URL = 'https://script.google.com/macros/s/AKfycbzlHhGGQPyph6xS3H6nirq6t8ahgk35NN0ZPuKW1VHdjdb5shEvZNc2QKw_bb8kHT2b/exec';

const envUrl = (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '').trim();

export const DEFAULT_GAS_URL = envUrl || ACTIVE_CRM_URL;
