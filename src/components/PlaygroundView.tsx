import React, { useState } from 'react';
import { FlaskConical, Play, Trophy, Copy, Check, Plus, Trash2, Sparkles, RefreshCw } from 'lucide-react';
import { PlaygroundItem } from '../types';

export const PlaygroundView: React.FC = () => {
  const [sampleInput, setSampleInput] = useState(
    'Buatkan modul login user dengan email dan password.'
  );

  const [items, setItems] = useState<PlaygroundItem[]>([
    {
      id: 'p-1',
      title: 'Prompt Variant A (Direct Instruction)',
      model: 'Gemini 3.6 Flash',
      promptText:
        'Buatkan fungsi login user untuk Laravel 11. Return JSON response dan validasi input.',
      sampleInput: '',
      output: '',
      loading: false,
      executionTimeMs: null,
      tokens: null,
      isWinner: false,
    },
    {
      id: 'p-2',
      title: 'Prompt Variant B (Structured Persona & Security)',
      model: 'Gemini 3.6 Flash',
      promptText:
        'Anda adalah Senior Laravel Architect. Buatkan Sanctum Auth Controller lengkap dengan Rate Limiting, Hash Password Check, DTO, dan JSON Resource.',
      sampleInput: '',
      output: '',
      loading: false,
      executionTimeMs: null,
      tokens: null,
      isWinner: true,
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    const newVariant: PlaygroundItem = {
      id: `p-${Date.now()}`,
      title: `Prompt Variant ${String.fromCharCode(65 + items.length)}`,
      model: 'Gemini 3.6 Flash',
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
            <span>AI Playground & Prompt Comparator</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Uji dan bandingkan variasi prompt secara langsung untuk menemukan formula hasil terbaik.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {items.length < 3 && (
            <button
              onClick={handleAddVariant}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Varian</span>
            </button>
          )}

          <button
            onClick={handleRunAll}
            id="playground-run-all-btn"
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
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
                  className={`p-1 rounded-md transition-colors ${
                    item.isWinner ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                  }`}
                  title="Tandai sebagai Versi Pemenang"
                >
                  <Trophy className="w-4 h-4 fill-current" />
                </button>

                {items.length > 1 && (
                  <button
                    onClick={() => handleDeleteVariant(item.id)}
                    className="p-1 text-slate-300 hover:text-red-500"
                    title="Hapus Varian"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
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
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
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
                <span>AI Response Output</span>
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
                      className="absolute top-2 right-2 p-1 rounded bg-slate-800 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <pre className="whitespace-pre-wrap">{item.output}</pre>
                  </>
                ) : (
                  <span className="text-slate-500 italic">
                    Belum ada hasil uji coba. Klik "Uji Varian Ini" di atas.
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
