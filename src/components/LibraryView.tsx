import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Grid,
  List,
  Star,
  Copy,
  Check,
  Minus,
  Zap,
  Globe,
  Trash2,
  Folder,
  FolderInput,
  FolderPlus,
  Download,
  FileJson,
  FileText,
  Code2,
  X,
  ChevronDown,
} from 'lucide-react';
import { PromptItem, Collection, HistoryLog } from '../types';
import { PromptUsageSparkline } from './PromptUsageSparkline';

interface LibraryViewProps {
  prompts: PromptItem[];
  collections: Collection[];
  history?: HistoryLog[];
  onSelectPrompt: (prompt: PromptItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeletePrompt: (id: string) => void;
  onBatchDeletePrompts?: (ids: string[]) => void | Promise<void>;
  onBatchMoveToCollection?: (ids: string[], collectionId: string | null) => void | Promise<void>;
  onRecordPromptUsage?: (
    prompt: PromptItem,
    action: HistoryLog['action'],
    details: string
  ) => void;
  onOpenNewCollectionModal?: () => void;
  onOpenOptimizerModal: (promptText: string) => void;
  onOpenTranslatorModal: (promptText: string) => void;
  onClearAllPrompts?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  prompts,
  collections,
  history = [],
  onSelectPrompt,
  onToggleFavorite,
  onDeletePrompt,
  onBatchDeletePrompts,
  onBatchMoveToCollection,
  onRecordPromptUsage,
  onOpenNewCollectionModal,
  onOpenOptimizerModal,
  onOpenTranslatorModal,
  onClearAllPrompts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCollection, setSelectedCollection] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Multi-select & Batch Action State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [openMenu, setOpenMenu] = useState<'move' | 'export' | null>(null);
  const [confirmingBatchDelete, setConfirmingBatchDelete] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);
  const batchBarRef = useRef<HTMLDivElement | null>(null);

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

  // Keep selectedIds synchronized if prompts are deleted externally
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(prompts.map((p) => p.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [prompts]);

  // Close open dropdown menus when clicking outside the batch bar
  useEffect(() => {
    if (!openMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (batchBarRef.current && !batchBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openMenu]);

  const collectionMap = useMemo(() => {
    const map = new Map<string, Collection>();
    collections.forEach((col) => map.set(col.id, col));
    return map;
  }, [collections]);

  const filteredPrompts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return prompts.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesCollection =
        selectedCollection === 'All' ||
        (selectedCollection === 'Unassigned'
          ? !p.collectionId
          : p.collectionId === selectedCollection);

      return matchesSearch && matchesCategory && matchesCollection;
    });
  }, [prompts, searchQuery, selectedCategory, selectedCollection]);

  const selectedPrompts = useMemo(
    () => prompts.filter((p) => selectedIds.has(p.id)),
    [prompts, selectedIds]
  );

  const selectedInFilteredCount = useMemo(
    () => filteredPrompts.filter((p) => selectedIds.has(p.id)).length,
    [filteredPrompts, selectedIds]
  );

  const allFilteredSelected =
    filteredPrompts.length > 0 && selectedInFilteredCount === filteredPrompts.length;
  const someFilteredSelected =
    selectedInFilteredCount > 0 && selectedInFilteredCount < filteredPrompts.length;

  const showTempFeedback = (msg: string) => {
    setBatchFeedback(msg);
    setTimeout(() => setBatchFeedback((prev) => (prev === msg ? null : prev)), 2500);
  };

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmingBatchDelete(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setConfirmingBatchDelete(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredPrompts.forEach((p) => next.delete(p.id));
      } else {
        filteredPrompts.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setOpenMenu(null);
    setConfirmingBatchDelete(false);
  };

  const handleCopy = (prompt: PromptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
    onRecordPromptUsage?.(prompt, 'update', 'Prompt disalin untuk digunakan');
  };

  const handleExecuteBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (onBatchDeletePrompts) {
      await onBatchDeletePrompts(ids);
    } else {
      ids.forEach((id) => onDeletePrompt(id));
    }
    clearSelection();
  };

  const handleExecuteMoveToCollection = async (collectionId: string | null) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !onBatchMoveToCollection) return;

    await onBatchMoveToCollection(ids, collectionId);
    setOpenMenu(null);
    clearSelection();
  };

  const triggerDownload = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportSelected = (format: 'json' | 'markdown') => {
    if (selectedPrompts.length === 0) return;
    const dateStamp = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const referencedColIds = new Set(
        selectedPrompts.map((p) => p.collectionId).filter((c): c is string => Boolean(c))
      );
      const relatedCollections = collections.filter((c) => referencedColIds.has(c.id));
      const payload = {
        exportedAt: new Date().toISOString(),
        count: selectedPrompts.length,
        prompts: selectedPrompts,
        collections: relatedCollections,
      };
      triggerDownload(
        `promptforge-selected-${selectedPrompts.length}-${dateStamp}.json`,
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8'
      );
      showTempFeedback(`${selectedPrompts.length} prompt diekspor ke JSON`);
    } else {
      const mdSections = selectedPrompts.map((p, idx) => {
        const colName = p.collectionId ? collectionMap.get(p.collectionId)?.name : null;
        const metaLines = [
          `- **Category**: ${p.category}`,
          `- **AI Model**: ${p.aiModel}`,
          colName ? `- **Collection**: ${colName}` : null,
          p.tags.length > 0 ? `- **Tags**: ${p.tags.join(', ')}` : null,
        ].filter(Boolean);

        return [
          `## ${idx + 1}. ${p.title}`,
          '',
          ...metaLines,
          p.description ? `\n> ${p.description}` : '',
          '',
          '```text',
          p.content,
          '```',
        ].join('\n');
      });

      const fullMarkdown = [
        `# PromptForge — Exported Prompts (${selectedPrompts.length})`,
        `_Exported on ${new Date().toLocaleString()}_`,
        '',
        '---',
        '',
        mdSections.join('\n\n---\n\n'),
      ].join('\n');

      triggerDownload(
        `promptforge-selected-${selectedPrompts.length}-${dateStamp}.md`,
        fullMarkdown,
        'text/markdown;charset=utf-8'
      );
      showTempFeedback(`${selectedPrompts.length} prompt diekspor ke Markdown`);
    }

    setOpenMenu(null);
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
            Kelola, pilih beberapa prompt sekaligus, pindahkan ke koleksi, atau ekspor dengan cepat.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {prompts.length > 0 && onClearAllPrompts && (
            confirmingClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllPrompts();
                    clearSelection();
                    setConfirmingClear(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Ya, Hapus Semua
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Hapus Semua Prompt dari Library"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Library</span>
              </button>
            )
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
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
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
            <option value="Unassigned">Tanpa Collection</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selection Bar & Contextual Batch Action Toolbar */}
      {filteredPrompts.length > 0 && (
        <div
          ref={batchBarRef}
          className={`rounded-2xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 transition-colors ${
            selectedIds.size > 0
              ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/80'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          {/* Left: Select All Checkbox + Selection Counter */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={
                allFilteredSelected ? 'true' : someFilteredSelected ? 'mixed' : 'false'
              }
              onClick={toggleSelectAllFiltered}
              className="inline-flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  allFilteredSelected || someFilteredSelected
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                }`}
              >
                {allFilteredSelected ? (
                  <Check className="w-3 h-3 stroke-[2.5]" />
                ) : someFilteredSelected ? (
                  <Minus className="w-3 h-3 stroke-[2.5]" />
                ) : null}
              </span>
              <span>
                {allFilteredSelected
                  ? `Batal pilih semua (${filteredPrompts.length})`
                  : `Pilih semua (${filteredPrompts.length})`}
              </span>
            </button>

            {selectedIds.size > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                  ·
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {selectedIds.size} dipilih
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </>
            )}

            {batchFeedback && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {batchFeedback}
              </span>
            )}
          </div>

          {/* Right: Batch Actions (only when >= 1 prompt selected) */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Move to Collection */}
              {onBatchMoveToCollection && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingBatchDelete(false);
                      setOpenMenu((prev) => (prev === 'move' ? null : 'move'));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Move to Collection</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {openMenu === 'move' && (
                    <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-30">
                      <p className="px-3 py-1 text-[11px] font-medium text-slate-400">
                        Pindahkan {selectedIds.size} prompt ke:
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleExecuteMoveToCollection(null)}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 text-slate-400" />
                        <span>Tanpa Collection (Lepas)</span>
                      </button>

                      {collections.length > 0 && (
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
                          {collections.map((col) => (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => void handleExecuteMoveToCollection(col.id)}
                              className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                            >
                              <Folder
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: col.color || '#10B981' }}
                              />
                              <span className="truncate">{col.name}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {onOpenNewCollectionModal && (
                        <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              onOpenNewCollectionModal();
                            }}
                            className="w-full px-3 py-2 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 cursor-pointer"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>Buat Collection Baru</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Export Selected */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingBatchDelete(false);
                    setOpenMenu((prev) => (prev === 'export' ? null : 'export'));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                  <span>Export Selected</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {openMenu === 'export' && (
                  <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-30">
                    <button
                      type="button"
                      onClick={() => handleExportSelected('json')}
                      className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <FileJson className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Export JSON (.json)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportSelected('markdown')}
                      className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Export Markdown (.md)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Selected (2-Step Inline Confirm) */}
              {confirmingBatchDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleExecuteBatchDelete()}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Ya, Hapus ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingBatchDelete(false)}
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    setConfirmingBatchDelete(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

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
          {filteredPrompts.map((prompt) => {
            const isSelected = selectedIds.has(prompt.id);
            const assignedCol = prompt.collectionId
              ? collectionMap.get(prompt.collectionId)
              : undefined;

            return (
              <div
                key={prompt.id}
                onClick={() => onSelectPrompt(prompt)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-label={`Pilih prompt ${prompt.title}`}
                        onClick={(e) => toggleSelectOne(prompt.id, e)}
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </button>

                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate">
                        {prompt.category}
                      </span>

                      {assignedCol && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 truncate">
                          <Folder
                            className="w-3 h-3 shrink-0"
                            style={{ color: assignedCol.color || '#10B981' }}
                          />
                          <span className="truncate">{assignedCol.name}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(prompt.id);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-500 cursor-pointer"
                        title="Favorite"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            prompt.isFavorite ? 'fill-amber-500 text-amber-500' : ''
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(prompt, e)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
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

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1 min-w-0">
                      {prompt.title}
                    </h3>
                    <PromptUsageSparkline prompt={prompt} history={history} />
                  </div>
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
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRecordPromptUsage?.(prompt, 'optimize', 'Prompt dioptimasi dari Library');
                        onOpenOptimizerModal(prompt.content);
                      }}
                      className="hover:text-amber-500 cursor-pointer"
                      title="Optimize"
                    >
                      <Zap className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRecordPromptUsage?.(prompt, 'translate', 'Prompt diterjemahkan dari Library');
                        onOpenTranslatorModal(prompt.content);
                      }}
                      className="hover:text-blue-500 cursor-pointer"
                      title="Translate"
                    >
                      <Globe className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePrompt(prompt.id);
                      }}
                      className="hover:text-red-500 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/60 shadow-2xs overflow-hidden">
          {filteredPrompts.map((prompt) => {
            const isSelected = selectedIds.has(prompt.id);
            const assignedCol = prompt.collectionId
              ? collectionMap.get(prompt.collectionId)
              : undefined;

            return (
              <div
                key={prompt.id}
                onClick={() => onSelectPrompt(prompt)}
                className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/25'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={`Pilih prompt ${prompt.title}`}
                    onClick={(e) => toggleSelectOne(prompt.id, e)}
                    className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {prompt.category}
                      </span>
                      <span className="text-[10px] text-slate-400">· {prompt.aiModel}</span>
                      {assignedCol && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                          <Folder
                            className="w-3 h-3 shrink-0"
                            style={{ color: assignedCol.color || '#10B981' }}
                          />
                          <span>{assignedCol.name}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate min-w-0">
                        {prompt.title}
                      </h3>
                      <PromptUsageSparkline prompt={prompt} history={history} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(prompt, e)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    title="Copy"
                  >
                    {copiedId === prompt.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(prompt.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-amber-500 cursor-pointer"
                    title="Favorite"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        prompt.isFavorite ? 'fill-amber-500 text-amber-500' : ''
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePrompt(prompt.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
