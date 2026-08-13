import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, BookOpen, FolderKanban, Sparkles, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { PromptItem, Collection, ViewMode } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptItem[];
  collections: Collection[];
  onSelectPrompt: (prompt: PromptItem) => void;
  onNavigateView: (view: ViewMode) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  prompts,
  collections,
  onSelectPrompt,
  onNavigateView,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter items
  const filteredPrompts = prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.framework.toLowerCase().includes(query.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredCollections = collections.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase())
  );

  const navigationActions = [
    { id: 'nav-generate', title: 'Generate Prompt Baru', view: 'generate' as ViewMode, icon: Sparkles },
    { id: 'nav-library', title: 'Buka Library', view: 'library' as ViewMode, icon: BookOpen },
    { id: 'nav-collections', title: 'Lihat Collections', view: 'collections' as ViewMode, icon: FolderKanban },
  ].filter((a) => a.title.toLowerCase().includes(query.toLowerCase()));

  const allItems = [
    ...navigationActions.map((a) => ({ type: 'action' as const, data: a })),
    ...filteredCollections.map((c) => ({ type: 'collection' as const, data: c })),
    ...filteredPrompts.map((p) => ({ type: 'prompt' as const, data: p })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        executeItem(allItems[selectedIndex]);
      }
    }
  };

  const executeItem = (item: (typeof allItems)[0]) => {
    if (item.type === 'action') {
      onNavigateView(item.data.view);
    } else if (item.type === 'collection') {
      onNavigateView('collections');
    } else if (item.type === 'prompt') {
      onSelectPrompt(item.data);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-6 sm:pt-20 px-3 sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Cari prompt, kategori, framework, atau perintah..."
            className="w-full bg-transparent border-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            id="command-palette-input"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tidak ada hasil yang ditemukan untuk "{query}".
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;

              if (item.type === 'action') {
                const Icon = item.data.icon;
                return (
                  <button
                    key={item.data.id}
                    onClick={() => executeItem(item)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-red-500" />
                      <span>{item.data.title}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                );
              }

              if (item.type === 'collection') {
                return (
                  <button
                    key={item.data.id}
                    onClick={() => executeItem(item)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderKanban className="w-4 h-4 text-amber-500" />
                      <div className="text-left">
                        <span className="font-medium">{item.data.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {item.data.description}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Collection
                    </span>
                  </button>
                );
              }

              if (item.type === 'prompt') {
                return (
                  <button
                    key={item.data.id}
                    onClick={() => executeItem(item)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="text-left min-w-0">
                        <span className="font-medium truncate block">{item.data.title}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span>{item.data.category}</span>
                          {item.data.framework && <span>• {item.data.framework}</span>}
                          {item.data.aiModel && <span>• {item.data.aiModel}</span>}
                        </div>
                      </div>
                    </div>
                    <CornerDownLeft className="w-3.5 h-3.5 opacity-60 shrink-0 ml-2" />
                  </button>
                );
              }

              return null;
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Pilih</span>
            <span>↵ Buka</span>
            <span>Esc Keluar</span>
          </div>
          <span>PromptForge Global Search</span>
        </div>
      </div>
    </div>
  );
};
