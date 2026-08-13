import React, { useState } from 'react';
import { Star, Copy, Check, Trash2, Code2 } from 'lucide-react';
import { PromptItem } from '../types';

interface FavoritesViewProps {
  prompts: PromptItem[];
  onSelectPrompt: (prompt: PromptItem) => void;
  onToggleFavorite: (id: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  prompts,
  onSelectPrompt,
  onToggleFavorite,
}) => {
  const favoritePrompts = prompts.filter((p) => p.isFavorite);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span>Prompt Favorit Tersimpan</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Koleksi prompt utama yang disematkan untuk akses secepat kilat.
        </p>
      </div>

      {favoritePrompts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Star className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Belum ada prompt favorit.
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Klik ikon bintang pada prompt apa pun di Library untuk menambahkannya ke sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoritePrompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => onSelectPrompt(prompt)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    Pinned
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleCopy(prompt.id, prompt.content, e)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title="Copy"
                    >
                      {copiedId === prompt.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(prompt.id);
                      }}
                      className="p-1 text-amber-500 hover:text-slate-400"
                      title="Remove Favorite"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-600 transition-colors line-clamp-1">
                  {prompt.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  {prompt.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>{prompt.category}</span>
                <span className="font-mono bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {prompt.aiModel}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
