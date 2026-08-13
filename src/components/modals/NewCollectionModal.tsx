import React, { useState } from 'react';
import { X, FolderPlus, Layers, Smartphone, Globe, ShieldAlert, Briefcase } from 'lucide-react';
import { Collection } from '../../types';

interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCollection: (collection: Collection) => void;
}

export const NewCollectionModal: React.FC<NewCollectionModalProps> = ({
  isOpen,
  onClose,
  onCreateCollection,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('FolderKanban');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name,
      description,
      color: '#DC2626',
      iconName,
      createdAt: new Date().toISOString(),
    };

    onCreateCollection(newCol);
    setName('');
    setDescription('');
    onClose();
  };

  const icons = [
    { name: 'FolderKanban', icon: FolderPlus, label: 'Folder' },
    { name: 'Layers', icon: Layers, label: 'Layers' },
    { name: 'Smartphone', icon: Smartphone, label: 'Mobile' },
    { name: 'Globe', icon: Globe, label: 'Web' },
    { name: 'ShieldAlert', icon: ShieldAlert, label: 'Security' },
    { name: 'Briefcase', icon: Briefcase, label: 'Work' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Buat Collection / Folder Baru
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Collection / Folder
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Next.js 15, CyberSec, Project Client..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Penjelasan isi folder ini..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pilih Icon
            </label>
            <div className="flex items-center gap-2">
              {icons.map((item) => {
                const IconComp = item.icon;
                const isSelected = iconName === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIconName(item.name)}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
            >
              Simpan Collection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
