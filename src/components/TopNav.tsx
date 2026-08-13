import React, { useState } from 'react';
import {
  Search,
  Command,
  Bell,
  Plus,
  Sun,
  Moon,
  Check,
  Menu,
  Activity,
  Wifi,
} from 'lucide-react';
import { ViewMode } from '../types';
import { useRealtime } from '../context/RealtimeContext';

interface TopNavProps {
  onOpenCommandPalette: () => void;
  onNavigateToGenerate: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeView: ViewMode;
  onOpenMobileMenu?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenCommandPalette,
  onNavigateToGenerate,
  theme,
  onToggleTheme,
  activeView,
  onOpenMobileMenu,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { isConnected, onlineUsers, latencyMs } = useRealtime();

  const notifications = [
    {
      id: '1',
      title: 'Realtime Sync Active',
      desc: 'Sistem terhubung secara real-time via WebSocket.',
      time: 'Baru saja',
      unread: true,
    },
    {
      id: '2',
      title: 'Prompt Score Ready',
      desc: 'Prompt Laravel 11 Anda mendapat skor 96/100.',
      time: '10m yang lalu',
      unread: true,
    },
    {
      id: '3',
      title: 'Gemini 3.6 Connected',
      desc: 'Backend API route siap memproses optimasi prompt.',
      time: '1j yang lalu',
      unread: false,
    },
  ];

  const viewTitles: Record<ViewMode, string> = {
    dashboard: 'Dashboard Workspace',
    generate: 'Generate & Form Builder',
    library: 'Prompt Library',
    collections: 'Collections & Folders',
    playground: 'AI Playground',
    history: 'Prompt History',
    favorites: 'Favorit',
    analytics: 'Analitik Workspace',
    settings: 'Pengaturan & API Key',
  };

  return (
    <header className="h-14 border-b border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-4 flex items-center justify-between shrink-0 z-10">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          title="Open Navigation Menu"
          id="topnav-mobile-menu-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-xs sm:text-sm font-heading font-bold text-slate-800 dark:text-slate-100 truncate">
          {viewTitles[activeView] || 'Workspace'}
        </h1>
        <span className="hidden lg:inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
          Generate Prompt by Walzetass v1.0
        </span>

        {/* Live Realtime Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold tracking-tight uppercase">Realtime Live</span>
          <span className="text-emerald-400 dark:text-emerald-600">•</span>
          <span>{onlineUsers} Online</span>
          {latencyMs > 0 && <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400">({latencyMs}ms)</span>}
        </div>
      </div>

      {/* Middle: Search & Command Palette Trigger (Desktop / Tablet) */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden sm:block">
        <button
          onClick={onOpenCommandPalette}
          id="topnav-command-btn"
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 text-xs transition-all duration-150 group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
            <span className="truncate">Cari prompt, kategori, collection...</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] text-slate-400 font-mono shadow-2xs shrink-0 ml-2">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Mobile Search Icon Button */}
        <button
          onClick={onOpenCommandPalette}
          className="sm:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Quick Generate Button */}
        <button
          onClick={onNavigateToGenerate}
          id="topnav-quick-generate"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Generate Prompt</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          id="topnav-theme-btn"
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            id="topnav-notifications-btn"
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Notifikasi
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">2 Baru</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {n.title}
                      </span>
                      <span className="text-[9px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {n.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            id="topnav-user-profile-btn"
            className="flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">
              PF
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Prompt Engineer</p>
                <p className="text-[11px] text-slate-400 truncate">ihwalgz@gmail.com</p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5 my-1">
                <Check className="w-3.5 h-3.5" />
                <span>Pro Workspace Plan</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

