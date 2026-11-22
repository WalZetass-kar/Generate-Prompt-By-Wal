import React, { useState } from 'react';
import { X, Zap, ArrowRight, Check, RefreshCw, Sparkles } from 'lucide-react';
import { getCustomApiKeys } from '../../lib/storage';

interface PromptOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  onApplyOptimizedPrompt: (optimizedText: string) => void;
}

export const PromptOptimizerModal: React.FC<PromptOptimizerModalProps> = ({
  isOpen,
  onClose,
  promptText,
  onApplyOptimizedPrompt,
}) => {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    optimizedPrompt: string;
    improvementsMade: string[];
    scoreBefore: number;
    scoreAfter: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleRunOptimize = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText, goal, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setResult(data.data);
      }
    } catch (e) {
      console.error('Optimize error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              AI Prompt Optimizer
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Fokus perbaikan khusus (opsional, e.g. 'Perjelas batasan keamanan')..."
            className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
          />
          <button
            onClick={handleRunOptimize}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Optimalkan Prompt</span>
          </button>
        </div>

        {/* Comparison Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {result ? (
            <>
              {/* Score Bump Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-200">
                    Peningkatan Skor Kualitas: {result.scoreBefore}/100 → {result.scoreAfter}/100
                  </span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-300">
                    Prompt kini lebih terstruktur dan bebas ambiguitas.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onApplyOptimizedPrompt(result.optimizedPrompt);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Terapkan Hasil Ini</span>
                </button>
              </div>

              {/* Improvements List */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Perbaikan Yang Dilakukan:
                </span>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 text-[11px] space-y-0.5">
                  {result.improvementsMade.map((imp, idx) => (
                    <li key={idx}>{imp}</li>
                  ))}
                </ul>
              </div>

              {/* Side-by-side or stacked preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="block font-sans font-bold text-slate-400 mb-1">Sebelum:</span>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 max-h-60 overflow-y-auto text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {promptText}
                  </div>
                </div>

                <div>
                  <span className="block font-sans font-bold text-emerald-500 mb-1">Sesudah (Optimized):</span>
                  <div className="p-3 rounded-xl vscode-editor-bg max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {result.optimizedPrompt}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Klik "Optimalkan Prompt" untuk memulai perbaikan struktur prompt dengan AI.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
