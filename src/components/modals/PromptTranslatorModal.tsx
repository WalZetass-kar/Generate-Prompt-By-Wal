import React, { useState } from 'react';
import { X, Globe, Copy, Check, RefreshCw, Languages } from 'lucide-react';
import { getCustomApiKeys } from '../../lib/storage';

interface PromptTranslatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  onApplyTranslatedPrompt: (translatedText: string) => void;
}

export const PromptTranslatorModal: React.FC<PromptTranslatorModalProps> = ({
  isOpen,
  onClose,
  promptText,
  onApplyTranslatedPrompt,
}) => {
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRunTranslate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText, targetLanguage, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.translatedPrompt) {
        setTranslatedText(data.translatedPrompt);
      }
    } catch (e) {
      console.error('Translate error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <Globe className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              AI Multi-Language Prompt Translator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Bahasa Target:
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
          >
            <option value="English">English</option>
            <option value="Indonesian">Bahasa Indonesia</option>
            <option value="Japanese">Japanese (日本語)</option>
            <option value="Chinese">Chinese (中文)</option>
            <option value="Arabic">Arabic (العربية)</option>
            <option value="German">German (Deutsch)</option>
            <option value="French">French (Français)</option>
            <option value="Spanish">Spanish (Español)</option>
          </select>

          <button
            onClick={handleRunTranslate}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 ml-auto"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
            <span>Terjemahkan</span>
          </button>
        </div>

        {/* Result Area */}
        <div className="p-5 overflow-y-auto space-y-3">
          {translatedText ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Hasil Terjemahan ({targetLanguage}):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => {
                      onApplyTranslatedPrompt(translatedText);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                  >
                    Gunakan Terjemahan Ini
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl vscode-editor-bg text-xs font-mono leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                {translatedText}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Pilih bahasa target dan klik "Terjemahkan" untuk melihat hasil prompt terjemahan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
