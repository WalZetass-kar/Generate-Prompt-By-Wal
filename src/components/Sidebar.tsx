import React from 'react';
import {
  Home,
  Sparkles,
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
  const menuItems = [
    { id: 'dashboard' as ViewMode, label: 'Dashboard', icon: Home },
    { id: 'generate' as ViewMode, label: 'Generate Prompt', icon: Sparkles, badge: 'New' },
    { id: 'library' as ViewMode, label: 'Library', icon: BookOpen, count: promptCount },
    { id: 'collections' as ViewMode, label: 'Collections', icon: FolderKanban, count: collectionCount },
    { id: 'playground' as ViewMode, label: 'Playground', icon: FlaskConical },
    { id: 'history' as ViewMode, label: 'History', icon: History },
    { id: 'favorites' as ViewMode, label: 'Favorit', icon: Star, count: favoriteCount },
    { id: 'analytics' as ViewMode, label: 'Analitik', icon: BarChart3 },
    { id: 'settings' as ViewMode, label: 'Pengaturan', icon: Settings },
  ];

  const handleSelect = (view: ViewMode) => {
    onViewChange(view);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-Over Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-[#E5E7EB] dark:border-slate-800 transform transition-transform duration-200 ease-in-out md:hidden flex flex-col shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[#E5E7EB] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0 font-bold text-base">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">
                Generate Prompt <span className="text-emerald-600 font-extrabold">by Walzetass</span>
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                WORKSPACE PRIBADI
              </span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile Footer */}
        <div className="p-3 border-t border-[#E5E7EB] dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                Gemini 3.6 Active
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Workspace terhubung ke AI Studio Server Route.
            </p>
          </div>
        </div>
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen border-r border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 z-20 select-none shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Brand Header */}
        {collapsed ? (
          <div className="flex items-center justify-center h-14 border-b border-[#E5E7EB] dark:border-slate-800">
            <button
              onClick={onToggleCollapse}
              className="group relative flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
              title="Buka Sidebar"
              id="sidebar-toggle-btn"
            >
              <Zap className="w-5 h-5 fill-white group-hover:scale-90 transition-transform" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shadow-xs border border-white dark:border-slate-900">
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between h-14 px-3 border-b border-[#E5E7EB] dark:border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0 font-bold text-lg">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading font-bold text-xs leading-tight tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  Generate Prompt <span className="text-emerald-600 font-extrabold block text-[11px]">by Walzetass</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  WORKSPACE PRIBADI
                </span>
              </div>
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

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                id={`nav-${item.id}`}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-2.5 py-2'
                } rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />

                {!collapsed && (
                  <div className="flex items-center justify-between w-full min-w-0">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md ${
                          isActive
                            ? 'bg-emerald-200/60 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Action Footer */}
        {!collapsed && (
          <div className="p-3 border-t border-[#E5E7EB] dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  Gemini 3.6 Active
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                Workspace terhubung ke AI Studio Server Route.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

