import React, { useState } from 'react';
import { X, Download, Upload, Check, AlertCircle } from 'lucide-react';
import { PromptItem, Collection } from '../../types';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptItem[];
  collections: Collection[];
  onImportWorkspace: (importedPrompts: PromptItem[], importedCollections: Collection[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  prompts,
  collections,
  onImportWorkspace,
}) => {
  const [importStatus, setImportStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const payload = {
      appName: 'PromptForge AI Workspace Backup',
      exportDate: new Date().toISOString(),
      prompts,
      collections,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptforge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.prompts) || Array.isArray(json)) {
          const newPrompts: PromptItem[] = Array.isArray(json.prompts) ? json.prompts : json;
          const newCollections: Collection[] = Array.isArray(json.collections) ? json.collections : [];
          onImportWorkspace(newPrompts, newCollections);
          setImportStatus(`Berhasil mengimpor ${newPrompts.length} prompt!`);
          setErrorMsg('');
        } else {
          setErrorMsg('Format file JSON backup tidak valid.');
        }
      } catch (err) {
        setErrorMsg('Gagal membaca file JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Export / Import Workspace JSON
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs">
          {/* Export Box */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Download className="w-4 h-4 text-red-600" />
              <span>Ekspor Backup Workspace</span>
            </h4>
            <p className="text-slate-500 dark:text-slate-400">
              Unduh cadangan seluruh {prompts.length} prompt dan {collections.length} folder collection dalam satu file JSON.
            </p>
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Backup JSON</span>
            </button>
          </div>

          {/* Import Box */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>Impor Workspace dari JSON</span>
            </h4>
            <p className="text-slate-500 dark:text-slate-400">
              Pilih file `.json` cadangan untuk memulihkan koleksi prompt.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white dark:file:bg-slate-100 dark:file:text-slate-900 cursor-pointer"
            />
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{importStatus}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
