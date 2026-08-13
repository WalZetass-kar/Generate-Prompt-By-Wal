import React, { useState } from 'react';
import { Settings, Moon, Sun, Key, Download, Upload, Shield, Command, Save, Check } from 'lucide-react';
import { UserSettings } from '../types';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onOpenExportImportModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenExportImportModal,
}) => {
  const [local, setLocal] = useState<UserSettings>(settings);
  const [savedMsg, setSavedMsg] = useState('');

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
          Konfigurasi tampilan, preferensi editor, shortcut keyboard, dan skema backup.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="space-y-4">
        {/* Tampilan & Tema */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Tampilan & Tema
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
                <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                <option value="Gemini 3.6 Flash">Gemini 3.6 Flash</option>
                <option value="GPT-4o">GPT-4o</option>
              </select>
            </div>
          </div>
        </div>

        {/* API Key Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-500" />
              <span>Status Kunci API AI Studio</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
              Injected Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            API Key Gemini diinjeksikan secara otomatis di tingkat server oleh AI Studio. Seluruh endpoint aman tanpa perlu ekspos kredensial ke browser.
          </p>
        </div>

        {/* Backup & Restore */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Backup & Restore Data
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ekspor seluruh prompt dan folder ke dalam file JSON cadangan atau pulihkan dari file sebelumnya.
          </p>
          <button
            onClick={onOpenExportImportModal}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Kelola Export / Import Backup</span>
          </button>
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
