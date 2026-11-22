import React, { useState, useEffect } from 'react';
import { Settings, Download, Command, Save, Check, ShieldAlert, AlertTriangle, Trash2 } from 'lucide-react';
import { UserSettings, GeminiUsageStats } from '../types';
import { UsageTracker } from './UsageTracker';
import { MultiAiKeySettings } from './MultiAiKeySettings';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onOpenExportImportModal: () => void;
  onClearAllWorkspaceData?: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenExportImportModal,
  onClearAllWorkspaceData,
}) => {
  const [local, setLocal] = useState<UserSettings>(settings);
  const [savedMsg, setSavedMsg] = useState('');
  const [usageStats, setUsageStats] = useState<GeminiUsageStats | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Keep local state in sync when settings prop updates from external or realtime
  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const fetchUsageStats = async () => {
    try {
      const res = await fetch('/api/gemini/usage');
      const data = await res.json();
      if (data.success && data.stats) {
        setUsageStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to fetch Gemini usage stats:', e);
    }
  };

  useEffect(() => {
    fetchUsageStats();
    const interval = setInterval(fetchUsageStats, 10000); // refresh usage every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSimulateQuota = async (requestsToday: number) => {
    try {
      const res = await fetch('/api/gemini/usage/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestsToday }),
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setUsageStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to simulate quota:', e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setLocal((prev) => ({ ...prev, [name]: val }));
  };

  const handleSave = () => {
    onUpdateSettings(local);
    setSavedMsg('Pengaturan tersimpan!');
    setTimeout(() => setSavedMsg(''), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-red-600" />
          <span>Pengaturan Workspace</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Konfigurasi tampilan, preferensi editor, pelacak kuota API Gemini, dan skema backup.
        </p>
      </div>

      {/* 80% Quota Alert Banner in SettingsView */}
      {usageStats && usageStats.percentUsed >= 80 && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-slate-800 dark:text-slate-100 shadow-2xs space-y-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-600 text-white shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  PERINGATAN KUOTA API GEMINI: MENCAPAI {usageStats.percentUsed}% BATAS HARIAN
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold">
                  {usageStats.requestsToday} / {usageStats.dailyLimit} Request
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Penggunaan harian API Gemini Anda telah melampaui <strong>80%</strong> batas gratis. Sisa kuota harian Anda saat ini adalah <strong>{usageStats.remainingRequests} request</strong>.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                  Rekomendasi: Sistem otomatis mengaktifkan fallback model jika batas kuota harian tercapai.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="space-y-4">
        {/* Usage Tracker Component */}
        <UsageTracker
          usageStats={usageStats}
          onRefreshUsage={fetchUsageStats}
          onSimulateQuota={handleSimulateQuota}
        />

        {/* Tampilan & Tema */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Tampilan &amp; Tema
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mode Tema Tampilan
              </label>
              <select
                name="theme"
                value={local.theme}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              >
                <option value="light">Light Mode (Default Premium)</option>
                <option value="dark">Dark Mode (Midnight)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bahasa Interface
              </label>
              <select
                name="language"
                value={local.language}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              >
                <option value="Indonesian">Bahasa Indonesia</option>
                <option value="English">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Editor Preferences */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Editor Prompt Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ukuran Font Editor (px)
              </label>
              <input
                type="number"
                name="fontSize"
                value={local.fontSize}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default AI Model
              </label>
              <select
                name="defaultModel"
                value={local.defaultModel}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
              >
                <option value="gemini-4-hydrogen">Gemini 4 Hydrogen</option>
                <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                <option value="GPT-4o">GPT-4o</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-AI Provider API Key Integration Hub */}
        <MultiAiKeySettings settings={local} onChange={setLocal} />

        {/* Backup & Restore */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Backup &amp; Restore Data
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ekspor seluruh prompt dan folder ke dalam file JSON cadangan atau pulihkan dari file sebelumnya.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenExportImportModal}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Kelola Export / Import Backup</span>
            </button>

            {onClearAllWorkspaceData && (
              confirmReset ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={async () => {
                      setIsResetting(true);
                      try {
                        await onClearAllWorkspaceData();
                        setSavedMsg('Seluruh data workspace berhasil dikosongkan. Template bawaan tetap tersedia.');
                        setTimeout(() => setSavedMsg(''), 3500);
                      } finally {
                        setIsResetting(false);
                        setConfirmReset(false);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {isResetting ? 'Mengosongkan...' : 'Ya, Kosongkan Semua'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Kosongkan Semua Data Workspace</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Shortcuts Cheat Sheet */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Command className="w-4 h-4 text-red-600" />
            <span>Shortcut Keyboard</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Buka Command Palette</span>
              <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                Ctrl + K
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Generate Prompt</span>
              <kbd className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                Ctrl + Enter
              </kbd>
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
