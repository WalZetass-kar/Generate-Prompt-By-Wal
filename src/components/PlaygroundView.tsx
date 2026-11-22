import React, { useState, useEffect } from 'react';
import { FlaskConical, Play, Trophy, Copy, Check, Plus, Trash2, RefreshCw } from 'lucide-react';
import { PlaygroundItem, UserSettings, AIProviderId } from '../types';
import { getCustomApiKeys } from '../lib/storage';

interface PlaygroundViewProps {
  settings?: UserSettings;
  initialPrompt?: string;
}

interface PlaygroundItemExtended extends PlaygroundItem {
  provider?: AIProviderId;
  providerUsed?: string;
  modelUsed?: string;
  isFallback?: boolean;
}

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({ settings, initialPrompt }) => {
  const [sampleInput, setSampleInput] = useState('');

  const [items, setItems] = useState<PlaygroundItemExtended[]>([
    {
      id: 'p-1',
      title: 'Varian A',
      model: 'gemini-4-hydrogen',
      provider: 'gemini',
      promptText: '',
      sampleInput: '',
      output: '',
      loading: false,
      executionTimeMs: null,
      tokens: null,
      isWinner: false,
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === 0
            ? {
                ...item,
                title: 'Prompt dari Workspace (Live)',
                promptText: initialPrompt,
              }
            : item
        )
      );
    }
  }, [initialPrompt]);

  const handleRunTest = async (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, loading: true } : item))
    );

    const startTime = performance.now();
    const item = items.find((i) => i.id === id);

    try {
      const res = await fetch('/api/gemini/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: item?.promptText || '',
          sampleInput,
          provider: item?.provider || 'gemini',
          model: item?.model || 'gemini-4-hydrogen',
          customKeys: getCustomApiKeys() || settings?.customKeys,
        }),
      });
      const data = await res.json();
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                loading: false,
                output: data.output || 'No output returned.',
                executionTimeMs: duration,
                tokens: Math.round((data.output?.length || 0) / 4),
                providerUsed: data.providerUsed,
                modelUsed: data.modelUsed,
                isFallback: data.isFallback,
              }
            : i
        )
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                loading: false,
                output: 'Gagal mengeksekusi test run.',
              }
            : i
        )
      );
    }
  };

  const handleRunAll = () => {
    items.forEach((item) => handleRunTest(item.id));
  };

  const handleAddVariant = () => {
    if (items.length >= 3) return;
    const newVariant: PlaygroundItemExtended = {
      id: `p-${Date.now()}`,
      title: `Prompt Variant ${String.fromCharCode(65 + items.length)}`,
      model: 'gemini-4-hydrogen',
      provider: 'gemini',
      promptText: '',
      sampleInput: '',
      output: '',
      loading: false,
      executionTimeMs: null,
      tokens: null,
      isWinner: false,
    };
    setItems([...items, newVariant]);
  };

  const handleDeleteVariant = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleSetWinner = (id: string) => {
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        isWinner: i.id === id,
      }))
    );
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-600" />
            <span>AI Playground &amp; Multi-Model Comparator</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Uji dan bandingkan variasi prompt serta model AI secara langsung dengan fallback cerdas ke Gemini.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {items.length < 3 && (
            <button
              onClick={handleAddVariant}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Varian</span>
            </button>
          )}

          <button
            onClick={handleRunAll}
            id="playground-run-all-btn"
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Jalankan Semua Variasi</span>
          </button>
        </div>
      </div>

      {/* Global Sample Input */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
          Sample Input Data (Untuk Uji Coba)
        </label>
        <textarea
          rows={2}
          value={sampleInput}
          onChange={(e) => setSampleInput(e.target.value)}
          placeholder="Tulis variabel contoh data input yang akan dimasukkan ke prompt..."
          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
        />
      </div>

      {/* Side-by-Side Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs flex flex-col space-y-3 ${
              item.isWinner
                ? 'border-amber-400 dark:border-amber-500/80 ring-2 ring-amber-400/20'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {/* Header Toolbar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={item.title}
                onChange={(e) => {
                  const val = e.target.value;
                  setItems((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, title: val } : i))
                  );
                }}
                className="font-bold text-xs text-slate-800 dark:text-slate-100 bg-transparent border-none focus:outline-none truncate"
              />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleSetWinner(item.id)}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    item.isWinner ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                  }`}
                  title="Tandai sebagai Versi Pemenang"
                >
                  <Trophy className="w-4 h-4 fill-current" />
                </button>

                {items.length > 1 && (
                  <button
                    onClick={() => handleDeleteVariant(item.id)}
                    className="p-1 text-slate-300 hover:text-red-500 cursor-pointer"
                    title="Hapus Varian"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Model & Provider Selector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wider">
                  Provider AI
                </label>
                <select
                  value={item.provider || 'gemini'}
                  onChange={(e) => {
                    const val = e.target.value as AIProviderId;
                    setItems((prev) =>
                      prev.map((i) => (i.id === item.id ? { ...i, provider: val } : i))
                    );
                  }}
                  className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="gemini">Gemini (Default)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Claude</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wider">
                  Target Model
                </label>
                <input
                  type="text"
                  value={item.model || 'gemini-4-hydrogen'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setItems((prev) =>
                      prev.map((i) => (i.id === item.id ? { ...i, model: val } : i))
                    );
                  }}
                  placeholder="Model name..."
                  className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
            </div>

            {/* Prompt Editor Textarea */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                Formula Prompt
              </label>
              <textarea
                rows={5}
                value={item.promptText}
                onChange={(e) => {
                  const val = e.target.value;
                  setItems((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, promptText: val } : i))
                  );
                }}
                placeholder="Tulis isi instruksi prompt..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>

            {/* Run Button */}
            <button
              onClick={() => handleRunTest(item.id)}
              disabled={item.loading}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {item.loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Uji Varian Ini</span>
            </button>

            {/* Output Display */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span>Output AI</span>
                  {item.isFallback && (
                    <span className="text-amber-500 font-semibold text-[9px] bg-amber-500/10 px-1 rounded">
                      Fallback Gemini
                    </span>
                  )}
                </span>
                {item.executionTimeMs && (
                  <span>
                    {item.executionTimeMs}ms • ~{item.tokens} tokens
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl vscode-editor-bg text-xs font-mono max-h-60 overflow-y-auto leading-relaxed border border-slate-800 relative group">
                {item.output ? (
                  <>
                    <button
                      onClick={() => handleCopy(item.id, item.output)}
                      className="absolute top-2 right-2 p-1 rounded bg-slate-800 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <pre className="text-slate-200 whitespace-pre-wrap font-sans text-xs">
                      {item.output}
                    </pre>
                  </>
                ) : (
                  <span className="text-slate-500 italic text-[11px]">
                    Belum ada hasil eksekusi. Klik &apos;Uji Varian Ini&apos; untuk menjalankan.
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
