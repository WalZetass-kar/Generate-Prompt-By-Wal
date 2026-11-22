import React from 'react';
import {
  Home,
  Sparkles,
  FileText,
  BookOpen,
  FolderKanban,
  FlaskConical,
  History,
  Star,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Film,
} from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  promptCount: number;
  favoriteCount: number;
  collectionCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  collapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  promptCount,
  favoriteCount,
  collectionCount,
}) => {
  const menuItems: Array<{
    id: ViewMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'generate', label: 'Generate Prompt', icon: Sparkles },
    { id: 'prd', label: 'PRD Studio', icon: FileText },
    { id: 'media-studio', label: 'Media Studio', icon: Film },
    { id: 'playground', label: 'Playground', icon: FlaskConical },
    { id: 'library', label: 'Library', icon: BookOpen, count: promptCount },
    { id: 'collections', label: 'Collections', icon: FolderKanban, count: collectionCount },
    { id: 'favorites', label: 'Favorit', icon: Star, count: favoriteCount },
    { id: 'history', label: 'History', icon: History },
    { id: 'analytics', label: 'Analitik', icon: BarChart3 },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  const handleSelect = (view: ViewMode) => {
    onViewChange(view);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-out md:hidden flex flex-col ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white shrink-0">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-heading font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
              PromptForge
            </span>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate flex-1 text-left whitespace-nowrap">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 z-20 select-none shrink-0 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {collapsed ? (
          <div className="flex items-center justify-center h-14 border-b border-slate-200/80 dark:border-slate-800">
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              title="Buka Sidebar"
              id="sidebar-toggle-btn"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white shrink-0">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <span className="font-heading font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
                PromptForge
              </span>
            </div>

            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Tutup Sidebar"
              id="sidebar-toggle-btn"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                id={`nav-${item.id}`}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'
                } rounded-lg text-[13px] transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />

                {!collapsed && (
                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
