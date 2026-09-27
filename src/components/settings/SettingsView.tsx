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
  Download,
  Upload,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';

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
  const [savedSuccess, setSavedSuccess] = useState(false);

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
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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
            Settings &amp; Database
          </h1>
        </div>
        <p className="text-xs text-stone-400 mt-0.5">
          Configure Google Sheets sync, activity thresholds, and data backup.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Google Sheets Connection */}
        <div className="p-5 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] shadow-md space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-[#fef08a]" />
              <div>
                <h2 className="font-fantasy font-bold text-base text-[#fef08a]">
                  Google Sheets Backend
                </h2>
                <p className="text-xs text-stone-400">
                  Connect your live Google Sheet to save members, events, and attendance.
                </p>
              </div>
            </div>

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
          </div>

          {/* Database Mode Switch */}
          <div className="p-3.5 rounded-xl bg-[#120c08] border border-[#3e2716] flex items-center justify-between">
            <div>
              <div className="text-xs font-fantasy font-bold text-stone-200 uppercase">
                Database Mode
              </div>
              <div className="text-xs text-stone-400">
                {demoMode
                  ? 'Local Demo Mode (Fast offline roster without Google account)'
                  : 'Live Google Sheets Mode (Synchronized with Google Apps Script)'}
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
            <label className="block text-xs font-fantasy font-bold text-stone-300 uppercase mb-1">
              Google Apps Script Web App URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={gasUrl}
                onChange={e => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3 py-2 rounded-xl bg-[#120c08] border border-[#3e2716] text-stone-200 text-xs sm:text-sm focus:outline-none focus:border-[#ca8a04] font-mono"
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
          </div>

          {/* Connection Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
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

          {/* Quick Setup Instructions */}
          <div className="p-3.5 rounded-xl bg-[#120c08]/80 border border-[#3e2716] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-fantasy font-bold text-[#fef08a] uppercase">
                Quick Google Sheet Setup (3 Steps)
              </span>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="text-[#ca8a04] hover:text-[#fef08a] flex items-center gap-1 text-[11px] font-bold"
              >
                <span>New Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-stone-300 text-xs leading-relaxed">
              <li>Open your Google Sheet &gt; Click <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Paste the code from <code className="text-[#fef08a]">google-apps-script/Code.gs</code> and run <strong>`setupDatabase`</strong>.</li>
              <li>Click <strong>Deploy &gt; New deployment &gt; Web app</strong> (Access: Anyone) &gt; Paste the URL above.</li>
            </ol>
          </div>
        </div>

        {/* Inactivity Thresholds */}
        <div className="p-5 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] shadow-md space-y-4">
          <div>
            <h2 className="font-fantasy font-bold text-base text-[#fef08a]">
              Inactivity Alert Days
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Set how many days without vote or attendance triggers inactive warnings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#120c08] border border-[#3e2716]">
              <label className="block text-xs font-fantasy font-bold text-yellow-300 uppercase mb-1">
                Warning (Days)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                required
                value={warningDays}
                onChange={e => setWarningDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#1a1410] border border-[#3e2716] text-stone-200 text-sm font-mono focus:outline-none focus:border-[#ca8a04]"
              />
              <p className="text-[11px] text-stone-500 mt-1">Default: 3 days</p>
            </div>

            <div className="p-3 rounded-xl bg-[#120c08] border border-[#3e2716]">
              <label className="block text-xs font-fantasy font-bold text-amber-300 uppercase mb-1">
                Inactive (Days)
              </label>
              <input
                type="number"
                min={2}
                max={60}
                required
                value={inactiveDays}
                onChange={e => setInactiveDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#1a1410] border border-[#3e2716] text-stone-200 text-sm font-mono focus:outline-none focus:border-[#ca8a04]"
              />
              <p className="text-[11px] text-stone-500 mt-1">Default: 7 days</p>
            </div>

            <div className="p-3 rounded-xl bg-[#120c08] border border-[#3e2716]">
              <label className="block text-xs font-fantasy font-bold text-red-400 uppercase mb-1">
                Critical (Days)
              </label>
              <input
                type="number"
                min={3}
                max={90}
                required
                value={criticalDays}
                onChange={e => setCriticalDays(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#1a1410] border border-[#3e2716] text-stone-200 text-sm font-mono focus:outline-none focus:border-[#ca8a04]"
              />
              <p className="text-[11px] text-stone-500 mt-1">Default: 14 days</p>
            </div>
          </div>
        </div>

        {/* Sound & Audio */}
        <div className="p-4 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] flex items-center justify-between">
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

      {/* Backup & Recovery */}
      <div className="p-5 rounded-2xl bg-[#1a1410] border-2 border-[#3e2716] shadow-md space-y-4">
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
        message="Are you sure you want to reset to the default 92-member HOT Alliance roster and event ledger? Any unsaved edits will be replaced with fresh starter data."
        confirmLabel="Confirm Reset"
        variant="crimson"
      />
    </div>
  );
};
