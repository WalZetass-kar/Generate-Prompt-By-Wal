import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  FlaskConical,
  Film,
  Star,
  ArrowRight,
  Copy,
  Check,
  Search,
  Zap,
  Globe,
  FolderPlus,
  Download,
} from 'lucide-react';
import { PromptItem, Collection, HistoryLog, ViewMode } from '../types';

interface DashboardViewProps {
  prompts: PromptItem[];
  collections: Collection[];
  history: HistoryLog[];
  onNavigateView: (view: ViewMode) => void;
  onSelectPrompt: (prompt: PromptItem) => void;
  onOpenOptimizeModal: () => void;
  onOpenTranslateModal: () => void;
  onOpenExportImportModal: () => void;
  onOpenNewCollectionModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  prompts,
  collections,
  history,
  onNavigateView,
  onSelectPrompt,
  onOpenOptimizeModal,
  onOpenTranslateModal,
  onOpenExportImportModal,
  onOpenNewCollectionModal,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPrompts = prompts
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const favoritePrompts = prompts.filter((p) => p.isFavorite).slice(0, 4);
  const favoriteCount = prompts.filter((p) => p.isFavorite).length;
  const avgScore =
    prompts.length > 0
      ? Math.round(prompts.reduce((acc, p) => acc + (p.score || 92), 0) / prompts.length)
      : 0;

  const handleCopyPrompt = (e: React.MouseEvent, prompt: PromptItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const studios = [
    {
      title: 'Generate Prompt',
      desc: 'Susun prompt siap eksekusi dengan suara atau form',
      icon: Sparkles,
      onClick: () => onNavigateView('generate'),
    },
    {
      title: 'PRD Studio',
      desc: 'Buat dokumen PRD, skema database, dan API spec',
      icon: FileText,
      onClick: () => onNavigateView('prd'),
    },
    {
      title: 'AI Playground',
      desc: 'Uji dan bandingkan hasil prompt lintas model AI',
      icon: FlaskConical,
      onClick: () => onNavigateView('playground'),
    },
    {
      title: 'Media Studio',
      desc: 'Buat gambar dan video langsung dari teks prompt',
      icon: Film,
      onClick: () => onNavigateView('media-studio'),
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-heading font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Workspace Prompt
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Rancang, simpan, dan uji prompt AI Anda di satu tempat yang rapi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigateView('prd')}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            Buka PRD Studio
          </button>
          <button
            onClick={() => onNavigateView('generate')}
            id="dashboard-hero-generate-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Buat Prompt Baru</span>
          </button>
        </div>
      </div>

      {/* Clean Single-Surface Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl">
        <div className="p-4 sm:px-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total Prompt</span>
          <div className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {prompts.length}
          </div>
        </div>
        <div className="p-4 sm:px-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Favorit</span>
          <div className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {favoriteCount}
          </div>
        </div>
        <div className="p-4 sm:px-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Collections</span>
          <div className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {collections.length}
          </div>
        </div>
        <div className="p-4 sm:px-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Rata-rata Skor</span>
          <div className="text-2xl font-heading font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {avgScore > 0 ? `${avgScore}/100` : '—'}
          </div>
        </div>
      </div>

      {/* Studio Shortcuts (Uniform Clean Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-sm font-heading font-semibold text-slate-900 dark:text-slate-100">
            Studio &amp; Alat Cepat
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <button
              onClick={onOpenOptimizeModal}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Optimizer</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenTranslateModal}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Translator</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenNewCollectionModal}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Folder Baru</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenExportImportModal}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export / Import</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {studios.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                onClick={item.onClick}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 text-left transition-colors group cursor-pointer space-y-2"
              >
                <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="text-sm font-heading font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Recent Prompts + Quiet Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Prompts (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-heading font-semibold text-slate-900 dark:text-slate-100">
              Prompt Terbaru
            </h3>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari prompt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 w-44"
                />
              </div>

              <button
                onClick={() => onNavigateView('library')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <span>Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPrompts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-3">
                <p>Belum ada prompt yang cocok.</p>
                <button
                  onClick={() => onNavigateView('generate')}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Buat Prompt Pertama</span>
                </button>
              </div>
            ) : (
              filteredPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  onClick={() => onSelectPrompt(prompt)}
                  className="px-4 py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {prompt.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                      <span>{prompt.category}</span>
                      {prompt.aiModel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{prompt.aiModel}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {new Date(prompt.updatedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleCopyPrompt(e, prompt)}
                    title="Salin Prompt"
                    className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedId === prompt.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Side Column: Favorites & Recent Activity (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-heading font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Favorit</span>
              </h3>
              <button
                onClick={() => onNavigateView('favorites')}
                className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              >
                Lihat semua
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
              {favoritePrompts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 px-4">
                  Belum ada prompt favorit.
                </p>
              ) : (
                favoritePrompts.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSelectPrompt(f)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer block"
                  >
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block truncate">
                      {f.title}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                      {f.category} · {f.aiModel}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {history.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-semibold text-slate-900 dark:text-slate-100">
                  Aktivitas Terakhir
                </h3>
                <button
                  onClick={() => onNavigateView('history')}
                  className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Riwayat
                </button>
              </div>

              <div className="space-y-2.5">
                {history.slice(0, 3).map((h) => (
                  <div key={h.id} className="text-xs">
                    <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                      {h.promptTitle}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{h.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
