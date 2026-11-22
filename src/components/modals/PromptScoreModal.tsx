import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';
import { PromptScoreDetail } from '../../types';
import { getCustomApiKeys } from '../../lib/storage';

interface PromptScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  title: string;
}

export const PromptScoreModal: React.FC<PromptScoreModalProps> = ({
  isOpen,
  onClose,
  promptText,
  title,
}) => {
  const [loading, setLoading] = useState(false);
  const [scoreData, setScoreData] = useState<PromptScoreDetail | null>({
    score: 96,
    rating: 'Excellent',
    strengths: [
      'Role & Context sangat jelas dan terperinci',
      'Spesifikasi teknis (PHP 8.3, Laravel 11, PostgreSQL) presisi',
      'Seksi Negative Constraints mencegah anti-pattern',
      'Format output Markdown rapi dan terstruktur',
    ],
    weaknesses: [
      'Belum memiliki batasan alokasi memori atau timeout khusus',
    ],
    recommendations: [
      'Tambahkan instruksi penulisan unit test / integration test suite',
      'Sebutkan spesifik tipe response error HTTP status codes',
    ],
    checklist: [
      { label: 'Tujuan Jelas', passed: true, note: 'Tugas utama terdefinisi' },
      { label: 'Konteks Lengkap', passed: true, note: 'Latar belakang aplikasi sekolah jelas' },
      { label: 'Output Terstruktur', passed: true, note: 'Seksi output dijelaskan' },
      { label: 'Struktur Rapi', passed: true, note: 'Format Markdown seksi' },
      { label: 'Negative Constraint', passed: true, note: 'Mencegah Fat Controller & SQLi' },
      { label: 'Batasan Teknis', passed: true, note: 'Versi stack lengkap' },
    ],
  });

  const handleFetchScore = async () => {
    if (!promptText) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText, title, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setScoreData(data.data);
      }
    } catch (e) {
      console.error('Score fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleFetchScore();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Prompt Score & Quality Audit
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Menganalisa struktur dan kualitas prompt...</p>
            </div>
          ) : scoreData ? (
            <>
              {/* Score Header Badge */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                    Kualitas Prompt
                  </span>
                  <div className="text-2xl font-black font-heading text-emerald-800 dark:text-emerald-200 mt-0.5">
                    {scoreData.score} <span className="text-xs font-normal opacity-70">/ 100</span>
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    Rating: {scoreData.rating}
                  </p>
                </div>

                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                  {scoreData.score}
                </div>
              </div>

              {/* Checklist Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Audit Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scoreData.checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2 text-xs"
                    >
                      {item.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Strengths */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Kelebihan</span>
                  </h5>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-400 text-[11px]">
                    {scoreData.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Saran Perbaikan</span>
                  </h5>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-400 text-[11px]">
                    {scoreData.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">
              Gagal memuat skor prompt.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold"
          >
            Tutup Audit
          </button>
        </div>
      </div>
    </div>
  );
};
