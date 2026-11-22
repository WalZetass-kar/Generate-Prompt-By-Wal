import React, { useState } from 'react';
import {
  Home,
  Sparkles,
  FileText,
  Film,
  BookOpen,
  FolderKanban,
  FlaskConical,
  History,
  Star,
  BarChart3,
  Settings,
  Search,
  X,
  ChevronRight,
  Zap,
  Layers,
} from 'lucide-react';
import { ViewMode } from '../types';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  promptCount: number;
  favoriteCount: number;
  collectionCount: number;
  onOpenCommandPalette: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  promptCount,
  favoriteCount,
  collectionCount,
  onOpenCommandPalette,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const mainTabs = [
    {
      id: 'dashboard' as ViewMode,
      label: 'Home',
      icon: Home,
    },
    {
      id: 'generate' as ViewMode,
      label: 'Generate',
      icon: Sparkles,
      highlight: true,
    },
    {
      id: 'media-studio' as ViewMode,
      label: 'AI Media',
      icon: Film,
      badge: 'New',
    },
    {
      id: 'library' as ViewMode,
      label: 'Library',
      icon: BookOpen,
      count: promptCount > 0 ? promptCount : undefined,
    },
  ];

  const moreMenuItems = [
    {
      id: 'prd' as ViewMode,
      label: 'PRD Studio',
      desc: 'Product Requirement Document & Spec AI',
      icon: FileText,
      badge: 'Spec AI',
      color: 'text-teal-600 bg-teal-500/10',
    },
    {
      id: 'collections' as ViewMode,
      label: 'Collections & Folders',
      desc: 'Kelola kategori & folder prompt tersimpan',
      icon: FolderKanban,
      count: collectionCount,
      color: 'text-indigo-500 bg-indigo-500/10',
    },
    {
      id: 'playground' as ViewMode,
      label: 'AI Playground',
      desc: 'Uji coba multi-model LLM langsung',
      icon: FlaskConical,
      color: 'text-purple-500 bg-purple-500/10',
    },
    {
      id: 'history' as ViewMode,
      label: 'Riwayat Prompt',
      desc: 'Log generasi & snapshot versi draft',
      icon: History,
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      id: 'favorites' as ViewMode,
      label: 'Prompt Favorit',
      desc: 'Koleksi prompt berbintang',
      icon: Star,
      count: favoriteCount,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      id: 'analytics' as ViewMode,
      label: 'Analitik & Skor Kualitas',
      desc: 'Statistik prompt, token & kuota harian',
      icon: BarChart3,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      id: 'settings' as ViewMode,
      label: 'Pengaturan & API Key',
      desc: 'Konfigurasi Gemini & preferensi sistem',
      icon: Settings,
      color: 'text-slate-500 bg-slate-500/10',
    },
  ];

  const isMoreActive = [
    'collections',
    'playground',
    'history',
    'favorites',
    'analytics',
    'settings',
  ].includes(currentView);

  const handleTabClick = (viewId: ViewMode) => {
    setIsMoreMenuOpen(false);
    onNavigate(viewId);
  };

  return (
    <>
      {/* Slide-Up "More" Sheet Overlay & Drawer */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsMoreMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer Sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-250">
            {/* Sheet Handle & Header */}
            <div className="pt-3 pb-2 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center">
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mb-3" />
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-slate-800 dark:text-slate-100">
                      Menu Navigasi Lengkap
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Akses cepat seluruh modul PromptForge AI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Command Search Button inside sheet */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenCommandPalette();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between shadow-xs active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>Cari prompt, fitur, atau aksi...</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  Cmd+K
                </span>
              </button>
            </div>

            {/* Sheet Menu List */}
            <div className="p-3 overflow-y-auto space-y-1.5 pb-8 max-h-[55vh]">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-xs truncate ${
                              isActive
                                ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.count !== undefined && item.count > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                              {item.count}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Sticky Bottom Navigation Bar for Mobile Web */}
      <nav
        id="mobile-bottom-navigation-bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-2 py-1.5 pb-safe"
      >
        <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all select-none active:scale-95 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {/* Active Indicator Top Glow */}
                {isActive && (
                  <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                )}

                <div className="relative">
                  {tab.highlight ? (
                    <div
                      className={`p-1.5 rounded-xl ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  ) : (
                    <Icon
                      className={`w-5 h-5 transition-transform ${
                        isActive ? 'scale-110' : ''
                      }`}
                    />
                  )}

                  {/* Badge Counter */}
                  {tab.count !== undefined && (
                    <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-mono text-[9px] font-bold shadow-xs">
                      {tab.count}
                    </span>
                  )}

                  {/* Small 'New' label */}
                  {tab.badge && !tab.count && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-amber-500 text-white font-bold text-[8px] tracking-tight">
                      {tab.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] ${
                    isActive ? 'font-bold' : 'font-medium'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* 5th Tab: "Lainnya" / Menu Sheet Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all select-none active:scale-95 ${
              isMoreActive || isMoreMenuOpen
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {(isMoreActive || isMoreMenuOpen) && (
              <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            )}

            <div className="relative">
              <Layers
                className={`w-5 h-5 transition-transform ${
                  isMoreActive || isMoreMenuOpen ? 'scale-110' : ''
                }`}
              />
              {favoriteCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </div>

            <span
              className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] ${
                isMoreActive || isMoreMenuOpen ? 'font-bold' : 'font-medium'
              }`}
            >
              Lainnya
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
