import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Command,
  Plus,
  Sun,
  Moon,
  Menu,
  LogOut,
  Home,
} from 'lucide-react';
import { ViewMode } from '../types';
import { useAuth } from '../context/AuthContext';

interface TopNavProps {
  onOpenCommandPalette: () => void;
  onNavigateToGenerate: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeView: ViewMode;
  onOpenMobileMenu?: () => void;
  onOpenLandingPage?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenCommandPalette,
  onNavigateToGenerate,
  theme,
  onToggleTheme,
  activeView,
  onOpenMobileMenu,
  onOpenLandingPage,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, signOutUser } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Pengguna';
  const email = user?.email || '';
  const photoURL = user?.photoURL || '';
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'PF';

  const viewTitles: Record<ViewMode, string> = {
    dashboard: 'Dashboard',
    generate: 'Generate Prompt',
    prd: 'PRD Studio',
    'media-studio': 'Media Studio',
    library: 'Library',
    collections: 'Collections',
    playground: 'Playground',
    history: 'History',
    favorites: 'Favorit',
    analytics: 'Analitik',
    settings: 'Pengaturan',
  };

  return (
    <header className="h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Left: Mobile Menu & View Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          title="Buka Menu"
          id="topnav-mobile-menu-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm font-heading font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
          {viewTitles[activeView] || 'Workspace'}
        </h1>
      </div>

      {/* Middle: Clean Command Search */}
      <div className="flex-1 max-w-sm hidden sm:block">
        <button
          onClick={onOpenCommandPalette}
          id="topnav-command-btn"
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 text-xs transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cari prompt atau menu...</span>
          </span>
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400 font-mono shrink-0 ml-2">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onOpenCommandPalette}
          className="sm:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Cari"
        >
          <Search className="w-4 h-4" />
        </button>

        {activeView !== 'generate' && (
          <button
            onClick={onNavigateToGenerate}
            id="topnav-quick-generate"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buat Prompt</span>
          </button>
        )}

        <button
          onClick={onToggleTheme}
          id="topnav-theme-btn"
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            id="topnav-user-profile-btn"
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={email || displayName}
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-semibold text-xs">
                {initials}
              </div>
            )}
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1.5 z-50 text-xs">
              <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {email}
                </p>
              </div>

              {onOpenLandingPage && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenLandingPage();
                  }}
                  id="topnav-landing-btn"
                  className="w-full px-2.5 py-2 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Lihat Landing Page</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  void signOutUser();
                }}
                id="topnav-signout-btn"
                className="w-full px-2.5 py-2 rounded-lg text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
