import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { GameButton } from '../common/GameButton';
import { ConfirmModal } from '../common/ConfirmModal';
import { AdminAccount, AllianceSettings } from '../../types/crm';
import { normalizeSupabaseUrl } from '../../services/supabase';
import { storageService } from '../../services/storage';
import {
  Settings,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  Volume2,
  VolumeX,
  UserPlus,
  ShieldCheck,
  Trash2,
  Server,
  Zap,
  Copy,
  Check,
  Users,
  Crown,
  FileText,
  Swords,
  ClipboardCheck,
  Award,
  Wrench,
  Key,
  Clock,
  HelpCircle,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    connectSupabase,
    disconnectSupabase,
    testSupabaseConnection,
    activeDbProvider,
    refreshData,
    isSyncing,
    lastSyncTime,
    resetDatabase,
    exportDatabase,
    importDatabase,
    syncStatus,
    syncMessage,
    admins,
    createAdminUser,
    deleteAdminUser,
  } = useCRM();

  const [supaUrl, setSupaUrl] = useState(settings.supabaseUrl || '');
  const [supaKey, setSupaKey] = useState(settings.supabaseAnonKey || '');
  const [kingdomId, setKingdomId] = useState(settings.kingdomId || '1391');
  const [allianceTag, setAllianceTag] = useState(settings.allianceTag || 'HOT');
  const [showSupaKey, setShowSupaKey] = useState(false);
  const [underDevelopment, setUnderDevelopment] = useState(Boolean(settings.underDevelopment));

  // Sync state when settings update across tabs or from background fetch
  useEffect(() => {
    setUnderDevelopment(Boolean(settings.underDevelopment));
    if (settings.supabaseUrl) setSupaUrl(settings.supabaseUrl);
    if (settings.supabaseAnonKey) setSupaKey(settings.supabaseAnonKey);
  }, [settings.underDevelopment, settings.supabaseUrl, settings.supabaseAnonKey]);

  const [supaTestResult, setSupaTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConnectingSupa, setIsConnectingSupa] = useState(false);
  const [isTestingSupa, setIsTestingSupa] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sub-admin creation state
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminAccount | null>(null);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanUrl = supaUrl.trim();
    const cleanKey = supaKey.trim();
    if (cleanKey || cleanUrl) {
      storageService.saveSupabaseCredentials(cleanUrl, cleanKey);
    }
    storageService.setUnderDevelopment(underDevelopment);
    await updateSettings({
      ...settings,
      supabaseUrl: cleanUrl,
      supabaseAnonKey: cleanKey,
      kingdomId: kingdomId.trim() || '1391',
      allianceTag: allianceTag.trim() || 'HOT',
      dbProvider: cleanUrl ? 'supabase' : 'local',
      inactivityWarningDays: settings.inactivityWarningDays || 3,
      inactivityInactiveDays: settings.inactivityInactiveDays || 7,
      inactivityCriticalDays: settings.inactivityCriticalDays || 14,
      underDevelopment,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleConnectSupabase = async () => {
    const cleanUrl = normalizeSupabaseUrl(supaUrl);
    const cleanKey = supaKey.trim();
    setSupaUrl(cleanUrl);

    // Save immediately so credentials are never lost across tabs or reloads
    if (cleanKey || cleanUrl) {
      storageService.saveSupabaseCredentials(cleanUrl, cleanKey);
    }

    if (!cleanUrl) {
      setSupaTestResult({ success: false, message: 'Please enter your Supabase Project URL.' });
      return;
    }
    if (!cleanKey) {
      setSupaTestResult({ success: false, message: 'Please enter your Supabase Anon Public API Key.' });
      return;
    }
    setIsConnectingSupa(true);
    setSupaTestResult(null);
    const result = await connectSupabase(cleanUrl, cleanKey);
    setIsConnectingSupa(false);
    setSupaTestResult(result);
  };

  const handleTestSupabase = async () => {
    const cleanUrl = normalizeSupabaseUrl(supaUrl);
    setSupaUrl(cleanUrl);

    if (!cleanUrl || !supaKey.trim()) {
      setSupaTestResult({ success: false, message: 'Both Supabase Project URL and Anon API Key are required to test.' });
      return;
    }
    setIsTestingSupa(true);
    setSupaTestResult(null);
    const result = await testSupabaseConnection(cleanUrl, supaKey.trim());
    setIsTestingSupa(false);
    setSupaTestResult(result);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) return;
    setIsCreatingAdmin(true);
    const success = await createAdminUser(
      newAdminUsername.trim(),
      newAdminPassword.trim(),
      newAdminName.trim()
    );
    setIsCreatingAdmin(false);
    if (success) {
      setNewAdminUsername('');
      setNewAdminName('');
      setNewAdminPassword('');
    }
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    await deleteAdminUser(adminToDelete.id);
    setAdminToDelete(null);
  };

  const handleExport = () => {
    const jsonStr = exportDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HOT-Alliance-CRM-Backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      if (content) {
        importDatabase(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#ca8a04]" />
          <h1 className="font-fantasy font-black text-xl sm:text-2xl text-[#fef08a] tracking-wide">
            Alliance Settings &amp; Administration
          </h1>
        </div>
        <p className="text-xs text-stone-400 mt-0.5">
          Configure Supabase PostgreSQL database, Kingdom #1391 HOT alliance roster sync, and officer accounts.
        </p>
      </div>

      {/* SECTION 1: ADMIN MANAGEMENT (Main Admin Only) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] shadow-md space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ca8a04]/20 border border-[#ca8a04]/40 flex items-center justify-center text-[#fef08a] shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#ca8a04]" />
            </div>
            <div>
              <h2 className="font-fantasy font-bold text-base text-[#fef08a]">
                Admin Accounts &amp; Officer Access
              </h2>
              <p className="text-xs text-stone-400">
                Seoyoon is the Main Admin with full authority. R4 officers can manage attendance and members, but cannot access Settings.
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#120c08] border border-[#522d14] text-amber-300 font-mono font-bold">
            {admins.length} Admin{admins.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Current Admins List */}
        <div className="space-y-2">
          <div className="text-xs font-fantasy font-bold text-stone-300 uppercase">
            Active Alliance Admins
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {admins.map(adm => {
              const isMain = adm.role === 'MainAdmin' || adm.username.toLowerCase() === 'seoyoon';
              return (
                <div
                  key={adm.id}
                  className="p-3 rounded-xl bg-[#120c08] border border-[#3e2716] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#fffbeb] truncate">
                        {adm.name || adm.username}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.2 rounded-full font-bold uppercase ${
                          isMain
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
                            : 'bg-stone-800 text-stone-300 border border-stone-600/50'
                        }`}
                      >
                        {isMain ? 'Main Admin' : 'R4'}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-mono mt-0.5 truncate">
                      User: @{adm.username}
                    </div>
                  </div>

                  {!isMain && (
                    <button
                      type="button"
                      onClick={() => setAdminToDelete(adm)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer shrink-0"
                      title="Delete R4 Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add New Sub-Admin Form */}
        <form onSubmit={handleCreateAdmin} className="p-3.5 sm:p-4 rounded-xl bg-[#120c08] border border-[#3e2716] space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-fantasy font-bold text-[#fef08a] uppercase">
            <UserPlus className="w-4 h-4 text-[#ca8a04]" />
            <span>Add New R4 Officer</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={newAdminUsername}
                onChange={e => setNewAdminUsername(e.target.value)}
                placeholder="e.g. officer_alex"
                className="w-full px-3 py-1.5 rounded-lg bg-[#1a1410] border border-[#3e2716] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                Officer Name (IGN)
              </label>
              <input
                type="text"
                value={newAdminName}
                onChange={e => setNewAdminName(e.target.value)}
                placeholder="e.g. Alex_HOT"
                className="w-full px-3 py-1.5 rounded-lg bg-[#1a1410] border border-[#3e2716] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={newAdminPassword}
                onChange={e => setNewAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 rounded-lg bg-[#1a1410] border border-[#3e2716] text-stone-200 text-xs focus:outline-none focus:border-[#ca8a04]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-stone-500">
              * R4 officers cannot view Settings, cannot modify thresholds, and cannot create other admins.
            </p>
            <button
              type="submit"
              disabled={isCreatingAdmin || !newAdminUsername.trim() || !newAdminPassword.trim()}
              className="btn-kingshot-gold px-3.5 py-1.5 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0 self-end sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isCreatingAdmin ? 'Creating...' : 'Create R4 Officer'}</span>
            </button>
          </div>
        </form>
      </div>


      {/* SECTION 2: ALLIANCE CLOUD VAULT */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] shadow-md space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-fantasy font-bold text-base text-[#fef08a] flex items-center gap-2">
                  <span>Alliance Cloud Vault</span>
                  {activeDbProvider === 'supabase' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500 font-sans font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400" /> Cloud Vault Active
                    </span>
                  )}
                </h2>
                <p className="text-xs text-stone-400">
                  Permanent secure cloud storage for alliance members, battle events, attendance checks, and logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-bold uppercase font-fantasy shrink-0 ${
                  syncStatus === 'connected'
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500'
                    : syncStatus === 'error'
                    ? 'bg-red-950/70 text-red-300 border-red-500'
                    : 'bg-amber-950/70 text-amber-300 border-amber-500'
                }`}
              >
                {syncMessage}
              </span>
              {lastSyncTime && (
                <span className="text-[11px] text-stone-400 font-mono">
                  Synced: {lastSyncTime}
                </span>
              )}
            </div>
          </div>

          {/* Active Supabase Banner */}
          {activeDbProvider === 'supabase' && syncStatus === 'connected' && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Cloud Vault Live:</strong> Alliance records are synchronized live across all officers with zero delay.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => refreshData()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={disconnectSupabase}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Supabase URL and Anon Key Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-fantasy font-bold text-stone-300 uppercase">
                Alliance Cloud URL
              </label>
              <input
                type="url"
                value={supaUrl}
                onChange={e => {
                  const val = e.target.value;
                  setSupaUrl(val);
                  if (val.trim()) {
                    storageService.saveSupabaseCredentials(val.trim(), supaKey);
                  }
                }}
                onBlur={() => {
                  if (supaUrl.trim()) {
                    storageService.saveSupabaseCredentials(supaUrl.trim(), supaKey);
                  }
                }}
                placeholder="https://xxxx.supabase.co"
                className="w-full px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04] font-mono"
              />
              <p className="text-[11px] text-stone-500">
                Supabase Project URL
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-fantasy font-bold text-stone-300 uppercase">
                Alliance Cloud Access Key
              </label>
              <div className="relative">
                <input
                  type={showSupaKey ? 'text' : 'password'}
                  value={supaKey}
                  onChange={e => {
                    const val = e.target.value;
                    setSupaKey(val);
                    if (val.trim()) {
                      storageService.saveSupabaseCredentials(supaUrl, val.trim());
                    }
                  }}
                  onBlur={() => {
                    if (supaKey.trim()) {
                      storageService.saveSupabaseCredentials(supaUrl, supaKey.trim());
                    }
                  }}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSupaKey(!showSupaKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  {showSupaKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-stone-500">
                Anon API key
              </p>
            </div>
          </div>

          {/* Supabase Connect & Test Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleConnectSupabase}
              disabled={isConnectingSupa || !supaUrl.trim() || !supaKey.trim()}
              className="btn-kingshot-gold px-4 py-2 text-xs font-fantasy font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${isConnectingSupa ? 'animate-spin' : ''}`} />
              <span>{isConnectingSupa ? 'Connecting...' : 'Connect & Save Cloud Vault'}</span>
            </button>
            <GameButton
              type="button"
              variant="slate"
              size="sm"
              onClick={handleTestSupabase}
              disabled={isTestingSupa || !supaUrl.trim() || !supaKey.trim()}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isTestingSupa ? 'animate-spin' : ''}`} />}
            >
              {isTestingSupa ? 'Testing...' : 'Test Connection'}
            </GameButton>
          </div>

          {/* Supabase Test Feedback */}
          {supaTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                supaTestResult.success
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                  : 'bg-red-950/60 border-red-600 text-red-300'
              }`}
            >
              {supaTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <span>{supaTestResult.message}</span>
            </div>
          )}

        </div>

        {/* SECTION 5: SITE ACCESS & MAINTENANCE LOCK */}
        <div className="p-4 rounded-2xl bg-[#1a1410] border-2 border-amber-600/40 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Wrench className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-fantasy font-bold text-[#fef08a] uppercase flex items-center gap-2">
                <span>Alliance Maintenance Lock</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold ${
                  underDevelopment
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/60'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                }`}>
                  {underDevelopment ? 'UNDER CONSTRUCTION' : 'LIVE PUBLIC'}
                </span>
              </div>
              <div className="text-xs text-stone-400 mt-0.5">
                When locked, visitors see the Under Construction screen. Officers can sign in anytime via the Officer Portal.
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={underDevelopment}
              onChange={e => {
                const checked = e.target.checked;
                setUnderDevelopment(checked);
                storageService.setUnderDevelopment(checked);
                updateSettings({ ...settings, underDevelopment: checked });
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ca8a04]" />
          </label>
        </div>

        {/* SECTION 6: SOUND & AUDIO */}
        <div className="p-4 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {settings.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-[#ca8a04]" />
            ) : (
              <VolumeX className="w-5 h-5 text-stone-500" />
            )}
            <div>
              <div className="text-xs font-fantasy font-bold text-stone-200 uppercase">
                Sound Effects
              </div>
              <div className="text-xs text-stone-400">
                Audio cues for clicks, alerts, and actions.
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={e => updateSettings({ ...settings, soundEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ca8a04]" />
          </label>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings Saved!
            </span>
          )}
          <GameButton variant="gold" size="lg" type="submit">
            Save Settings
          </GameButton>
        </div>
      </form>

      {/* SECTION 6: BACKUP & RECOVERY */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] shadow-md space-y-4">
        <div>
          <h2 className="font-fantasy font-bold text-base text-[#fef08a]">
            Backup &amp; Recovery
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Download JSON backups of your roster, restore backups, or reset to starter data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Export */}
          <GameButton
            variant="outline"
            size="md"
            onClick={handleExport}
            icon={<Download className="w-4 h-4" />}
          >
            Export Backup
          </GameButton>

          {/* Import */}
          <label className="inline-flex items-center justify-center font-bold tracking-wide uppercase transition-all duration-150 select-none cursor-pointer game-btn relative font-fantasy rounded-md shadow-md text-sm px-4 py-2 gap-2 border-[1.5px] bg-[#221711] text-[#f1f5f9] border-[#522d14] hover:bg-[#2c1d15]">
            <Upload className="w-4 h-4" />
            <span>Restore Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          {/* Re-seed */}
          <GameButton
            variant="crimson"
            size="md"
            onClick={() => setShowResetConfirm(true)}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Reset to Demo
          </GameButton>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={resetDatabase}
        title="⚠️ Reset Alliance Database"
        message="Are you sure you want to reset to the default HOT Alliance roster and event ledger? Any unsaved edits will be replaced with fresh starter data."
        confirmLabel="Confirm Reset"
        variant="crimson"
      />

      {/* Delete Admin Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(adminToDelete)}
        onClose={() => setAdminToDelete(null)}
        onConfirm={handleConfirmDeleteAdmin}
        title="⚠️ Revoke R4 Officer Access"
        message={`Are you sure you want to remove the R4 officer account for "${adminToDelete?.username}" (${adminToDelete?.name || 'Officer'})? They will no longer be able to log in.`}
        confirmLabel="Revoke Access"
        variant="crimson"
      />
    </div>
  );
};
