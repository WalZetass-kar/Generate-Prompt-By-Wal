import React, { useState } from 'react';
import { FolderKanban, Plus, Layers, Smartphone, Globe, ShieldAlert, Briefcase, Code2, Trash2 } from 'lucide-react';
import { Collection, PromptItem } from '../types';

interface CollectionsViewProps {
  collections: Collection[];
  prompts: PromptItem[];
  onSelectCollection: (colId: string) => void;
  onOpenNewCollectionModal: () => void;
  onDeleteCollection: (colId: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  prompts,
  onSelectCollection,
  onOpenNewCollectionModal,
  onDeleteCollection,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Layers':
        return <Layers className="w-5 h-5 text-rose-500" />;
      case 'Smartphone':
        return <Smartphone className="w-5 h-5 text-sky-500" />;
      case 'Globe':
        return <Globe className="w-5 h-5 text-emerald-500" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-purple-500" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5 text-amber-500" />;
      default:
        return <FolderKanban className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
            Prompt Collections & Folders
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pengelompokan prompt terstruktur berdasarkan proyek, framework, atau kategori kerja.
          </p>
        </div>

        <button
          onClick={onOpenNewCollectionModal}
          id="collections-add-btn"
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors self-stretch sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Collection Baru</span>
        </button>
      </div>

      {/* Collection Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collections.map((col) => {
          const count = prompts.filter((p) => p.collectionId === col.id).length;

          return (
            <div
              key={col.id}
              onClick={() => onSelectCollection(col.id)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    {getIcon(col.iconName)}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {count} Prompts
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCollection(col.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Hapus Collection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-red-600 transition-colors">
                  {col.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {col.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>Folder Proyek</span>
                <span>
                  {new Date(col.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
