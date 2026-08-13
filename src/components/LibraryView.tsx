import React, { useState } from 'react';
import {
  Search,
  Grid,
  List,
  Star,
  Copy,
  Check,
  Zap,
  Globe,
  Trash2,
  Folder,
  Tag,
  Code2,
  Filter,
  Layers,
} from 'lucide-react';
import { PromptItem, Collection } from '../types';

interface LibraryViewProps {
  prompts: PromptItem[];
  collections: Collection[];
  onSelectPrompt: (prompt: PromptItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeletePrompt: (id: string) => void;
  onOpenOptimizerModal: (promptText: string) => void;
  onOpenTranslatorModal: (promptText: string) => void;
  onClearAllPrompts?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  prompts,
  collections,
  onSelectPrompt,
  onToggleFavorite,
  onDeletePrompt,
  onOpenOptimizerModal,
  onOpenTranslatorModal,
  onClearAllPrompts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCollection, setSelectedCollection] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    'All',
    'Development',
    'Content',
    'Academic',
    'Design',
    'AI Agent',
    'Data Science',
    'CyberSec',
    'Business',
    'Productivity',
    'Legal',
    'Game Dev',
    'Custom',
  ];

  const filteredPrompts = prompts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesCollection =
      selectedCollection === 'All' || p.collectionId === selectedCollection;

    return matchesSearch && matchesCategory && matchesCollection;
  });

  const handleCopy = (id: string, content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
            Prompt Library
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola dan cari seluruh koleksi prompt AI tersimpan dalam satu tempat.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {prompts.length > 0 && onClearAllPrompts && (
            <button
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin menghapus SELURUH PROMPT dari Library dan Database Firestore?')) {
                  onClearAllPrompts();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Hapus Semua Prompt dari Library"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua Library</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search Field */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan judul, kata kunci, atau isi..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Collection Dropdown */}
        <div className="shrink-0">
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="w-full md:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
          >
            <option value="All">Semua Collections</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Prompts Display */}
      {filteredPrompts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Code2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Belum ada prompt dalam kategori ini.
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Coba ubah kata kunci pencarian atau buat prompt baru dari tab Generate.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => onSelectPrompt(prompt)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {prompt.category}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(prompt.id);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-500"
                      title="Favorite"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          prompt.isFavorite ? 'fill-amber-500 text-amber-500' : ''
                        }`}
                      />
                    </button>
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
                <span className="font-mono bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {prompt.aiModel}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOptimizerModal(prompt.content);
                    }}
                    className="hover:text-amber-500"
                    title="Optimize"
                  >
                    <Zap className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTranslatorModal(prompt.content);
                    }}
                    className="hover:text-blue-500"
                    title="Translate"
                  >
                    <Globe className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePrompt(prompt.id);
                    }}
                    className="hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/60 shadow-2xs">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => onSelectPrompt(prompt)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {prompt.category}
                  </span>
                  <span className="text-[10px] text-slate-400">• {prompt.aiModel}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {prompt.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleCopy(prompt.id, prompt.content, e)}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
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
                  className="p-1.5 text-slate-400 hover:text-amber-500"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      prompt.isFavorite ? 'fill-amber-500 text-amber-500' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
