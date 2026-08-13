import React, { useState } from 'react';
import { History as HistoryIcon, Clock, RotateCcw, Zap, Globe, Sparkles, Filter, Trash2 } from 'lucide-react';
import { HistoryLog } from '../types';

interface HistoryViewProps {
  history: HistoryLog[];
  onRestoreVersion: (log: HistoryLog) => void;
  onClearAllHistory?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onRestoreVersion, onClearAllHistory }) => {
  const [filterAction, setFilterAction] = useState<string>('all');

  const getBadgeColor = (action: HistoryLog['action']) => {
    switch (action) {
      case 'create':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'optimize':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
      case 'translate':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
      case 'restore':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const handleClearHistoryConfirm = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat aktivitas dari collection/database?')) {
      onClearAllHistory?.();
    }
  };

  const filteredHistory = history.filter(
    (h) => filterAction === 'all' || h.action === filterAction
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-red-600" />
            <span>Riwayat & Audit Log Workspace</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lacak seluruh histori modifikasi, pembuatan, dan pemulihan versi prompt AI.
          </p>
        </div>

        {/* Action Controls & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {history.length > 0 && onClearAllHistory && (
            <button
              onClick={handleClearHistoryConfirm}
              className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Hapus Semua History dari Collection"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua History</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {['all', 'create', 'optimize', 'translate', 'restore'].map((act) => (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                  filterAction === act
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {act === 'all' ? 'Semua Aksi' : act}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada catatan riwayat untuk filter ini.
          </div>
        ) : (
          <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
            {filteredHistory.map((h) => (
              <div key={h.id} className="relative pl-9 flex flex-col sm:flex-row sm:items-center justify-between gap-2 group">
                <span className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold ring-4 ring-white dark:ring-slate-900">
                  •
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${getBadgeColor(h.action)}`}>
                      {h.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(h.timestamp).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {h.promptTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {h.details}
                  </p>
                </div>

                <button
                  onClick={() => onRestoreVersion(h)}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1.5 transition-colors shrink-0"
                  title="Kembalikan Versi Ini"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Versi</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
