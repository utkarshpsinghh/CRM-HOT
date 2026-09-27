import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { GameButton } from '../common/GameButton';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Settings,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Volume2,
  VolumeX,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { sounds } from '../../utils/sound';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    testSheetsConnection,
    resetDatabase,
    exportDatabase,
    importDatabase,
    syncStatus,
    syncMessage,
  } = useCRM();

  const [gasUrl, setGasUrl] = useState(settings.gasWebAppUrl);
  const [warningDays, setWarningDays] = useState(settings.inactivityWarningDays);
  const [inactiveDays, setInactiveDays] = useState(settings.inactivityInactiveDays);
  const [criticalDays, setCriticalDays] = useState(settings.inactivityCriticalDays);
  const [demoMode, setDemoMode] = useState(settings.demoMode);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      ...settings,
      gasWebAppUrl: gasUrl.trim(),
      inactivityWarningDays: Number(warningDays),
      inactivityInactiveDays: Number(inactiveDays),
      inactivityCriticalDays: Number(criticalDays),
      demoMode,
    });
  };

  const handleTestConnection = async () => {
    if (!gasUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter a Google Apps Script URL first.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const result = await testSheetsConnection(gasUrl.trim());
    setIsTesting(false);
    setTestResult(result);
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
            Alliance Settings &amp; Database
          </h1>
        </div>
        <p className="text-xs text-stone-400 mt-0.5">
          Configure Google Sheets backend synchronization, inactivity thresholds, and data backup.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* SECTION 1: GOOGLE SHEETS BACKEND (Sections 2, 18, 33, 34) */}
        <div className="p-5 rounded-xl bg-gradient-to-b from-[#181d2a] to-[#10131d] border-[1.5px] border-[#ca8a04] shadow-lg space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#fef08a]" />
                <h2 className="font-fantasy font-bold text-base text-[#fef08a]">
                  Google Sheets Database Source
                </h2>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Google Sheets serves as the permanent source of truth for all HOT alliance records.
              </p>
            </div>

            <div className="shrink-0">
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-bold uppercase font-fantasy ${
                  syncStatus === 'connected'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    : syncStatus === 'error'
                    ? 'bg-red-950 text-red-300 border-red-500'
                    : 'bg-amber-950 text-amber-300 border-amber-500'
                }`}
              >
                {syncMessage}
              </span>
            </div>
          </div>

          {/* Database Mode Switch */}
          <div className="p-3 rounded-lg bg-[#0c0e16] border border-[#453820] flex items-center justify-between">
            <div>
              <div className="text-xs font-fantasy font-bold text-stone-200 uppercase">
                Database Operation Mode
              </div>
              <div className="text-[11px] text-stone-400">
                {demoMode
                  ? 'Using built-in local database (instant zero-latency demo mode)'
                  : 'Connected to live Google Apps Script / Google Sheets backend'}
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!demoMode}
                onChange={e => setDemoMode(!e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ca8a04]" />
            </label>
          </div>

          {/* Google Apps Script Web App URL */}
          <div>
            <label className="block text-xs font-fantasy font-bold text-[#fef08a] uppercase mb-1">
              Google Apps Script Web App URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={gasUrl}
                onChange={e => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04] font-mono"
              />
              <GameButton
                type="button"
                variant="slate"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </GameButton>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Deployed from Google Apps Script with access set to &quot;Anyone&quot;.
            </p>
          </div>

          {/* Connection Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                  : 'bg-red-950/60 border-red-600 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Google Sheets Setup Instructions Accordion */}
          <div className="p-3.5 rounded-lg bg-[#0c0e16]/80 border border-[#3f311c] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-fantasy font-bold text-[#fef08a] uppercase flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#ca8a04]" />
                <span>How to deploy your Google Sheet in 2 minutes</span>
              </span>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="text-[#ca8a04] hover:text-[#fef08a] flex items-center gap-1 text-[11px] font-bold"
              >
                <span>Create Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-stone-300 text-[11px] leading-relaxed">
              <li>Create a new spreadsheet on Google Sheets and name it &quot;HOT Alliance CRM&quot;.</li>
              <li>Click <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Copy the complete backend code from <code className="text-[#fef08a]">google-apps-script/Code.gs</code>.</li>
              <li>Run the function <strong>`setupDatabase`</strong> once in Apps Script to generate all 7 tables.</li>
              <li>Click <strong>Deploy &gt; New deployment &gt; Web app</strong> (Who has access: Anyone).</li>
              <li>Paste the generated Web App URL above and click <strong>Test Connection</strong>!</li>
            </ol>
          </div>
        </div>

        {/* SECTION 2: INACTIVITY THRESHOLDS (Section 14 & 15) */}
        <div className="p-5 rounded-xl bg-gradient-to-b from-[#181d2a] to-[#10131d] border border-[#524126] shadow-lg space-y-4">
          <div>
            <h2 className="font-fantasy font-bold text-base text-[#fef08a]">
              Inactivity Alert Thresholds
            </h2>
            <p className="text-xs text-stone-300 mt-0.5">
              Customize how many days without vote or event attendance triggers alliance warnings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-fantasy font-bold text-yellow-300 uppercase mb-1">
                Warning Threshold (Days)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                required
                value={warningDays}
                onChange={e => setWarningDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 text-sm font-mono focus:outline-none focus:border-[#ca8a04]"
              />
              <p className="text-[10px] text-stone-500 mt-1">Default: 3 days</p>
            </div>

            <div>
              <label className="block text-xs font-fantasy font-bold text-amber-300 uppercase mb-1">
                Inactive Threshold (Days)
              </label>
              <input
                type="number"
                min={2}
                max={60}
                required
                value={inactiveDays}
                onChange={e => setInactiveDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 text-sm font-mono focus:outline-none focus:border-[#ca8a04]"
              />
              <p className="text-[10px] text-stone-500 mt-1">Default: 7 days</p>
            </div>

            <div>
              <label className="block text-xs font-fantasy font-bold text-red-400 uppercase mb-1">
                Critical Threshold (Days)
              </label>
              <input
                type="number"
                min={3}
                max={90}
                required
                value={criticalDays}
                onChange={e => setCriticalDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0c0e16] border border-[#524126] text-stone-200 text-sm font-mono focus:outline-none focus:border-[#ca8a04]"
              />
              <p className="text-[10px] text-stone-500 mt-1">Default: 14 days</p>
            </div>
          </div>
        </div>

        {/* SECTION 3: SOUND & AUDIO */}
        <div className="p-4 rounded-xl bg-[#141824] border border-[#524126] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {settings.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-[#eab308]" />
            ) : (
              <VolumeX className="w-5 h-5 text-stone-500" />
            )}
            <div>
              <div className="text-xs font-fantasy font-bold text-stone-200 uppercase">
                Synthesized Game Audio Feedback
              </div>
              <div className="text-[11px] text-stone-400">
                Medieval fanfare, click, and battle alert sound effects via Web Audio API.
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
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
        <div className="flex justify-end">
          <GameButton variant="gold" size="lg" type="submit">
            Save Settings
          </GameButton>
        </div>
      </form>

      {/* SECTION 4: BACKUP, EXPORT & RE-SEED ROSTER */}
      <div className="p-5 rounded-xl bg-gradient-to-b from-[#181d2a] to-[#10131d] border border-[#524126] shadow-lg space-y-4">
        <div>
          <h2 className="font-fantasy font-bold text-base text-[#fef08a]">
            Database Backup &amp; Recovery
          </h2>
          <p className="text-xs text-stone-300 mt-0.5">
            Export JSON snapshots, restore alliance database backups, or reset to starter roster.
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
            Export JSON Backup
          </GameButton>

          {/* Import */}
          <label className="inline-flex items-center justify-center font-bold tracking-wide uppercase transition-all duration-150 select-none cursor-pointer game-btn relative font-fantasy rounded-md shadow-md text-sm px-4 py-2 gap-2 border-[1.5px] bg-[#1e293b] text-[#f1f5f9] border-[#64748b] hover:bg-[#334155]">
            <Upload className="w-4 h-4" />
            <span>Restore JSON</span>
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
            Re-Seed HOT Roster
          </GameButton>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={resetDatabase}
        title="⚠️ Reset Alliance Database"
        message="Are you sure you want to reset to the default 92-member HOT Alliance roster and event ledger? Any unsaved edits will be replaced with fresh mock data."
        confirmLabel="Confirm Reset"
        variant="crimson"
      />
    </div>
  );
};
