import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandPalette } from './components/CommandPalette';
import { DashboardView } from './components/DashboardView';
import { GenerateView } from './components/GenerateView';
import { LibraryView } from './components/LibraryView';
import { CollectionsView } from './components/CollectionsView';
import { PlaygroundView } from './components/PlaygroundView';
import { HistoryView } from './components/HistoryView';
import { FavoritesView } from './components/FavoritesView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';

import { PromptScoreModal } from './components/modals/PromptScoreModal';
import { PromptOptimizerModal } from './components/modals/PromptOptimizerModal';
import { PromptTranslatorModal } from './components/modals/PromptTranslatorModal';
import { ExportImportModal } from './components/modals/ExportImportModal';
import { NewCollectionModal } from './components/modals/NewCollectionModal';
import { PromptDetailModal } from './components/modals/PromptDetailModal';
import { GeminiChatDrawer } from './components/GeminiChatDrawer';
import { Sparkles, Bot } from 'lucide-react';

import {
  getStoredPrompts,
  saveStoredPrompts,
  clearStoredPrompts,
  getStoredCollections,
  saveStoredCollections,
  clearStoredCollections,
  getStoredHistory,
  saveStoredHistory,
  clearStoredHistory,
  getStoredSettings,
  saveStoredSettings,
  addHistoryEntry,
} from './lib/storage';

import {
  syncPromptToFirestore,
  deletePromptFromFirestore,
  clearAllPromptsInFirestore,
  syncCollectionToFirestore,
  deleteCollectionFromFirestore,
  clearAllCollectionsInFirestore,
  syncSettingsToFirestore,
  subscribeToPromptsRealtime,
  subscribeToCollectionsRealtime,
  subscribeToHistoryRealtime,
  subscribeToSettingsRealtime,
  seedFirestoreIfEmpty,
  clearAllHistoryInFirestore,
} from './lib/firebaseStorage';

import { ViewMode, PromptItem, Collection, HistoryLog, UserSettings } from './types';
import { useRealtime } from './context/RealtimeContext';

export default function App() {
  const { sendRealtimeSync, onRealtimeMessage } = useRealtime();

  // State
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Data State
  const [prompts, setPrompts] = useState<PromptItem[]>(() => getStoredPrompts());
  const [collections, setCollections] = useState<Collection[]>(() => getStoredCollections());
  const [history, setHistory] = useState<HistoryLog[]>(() => getStoredHistory());
  const [settings, setSettings] = useState<UserSettings>(() => getStoredSettings());

  const handleClearAllHistory = async () => {
    setHistory([]);
    clearStoredHistory();
    await clearAllHistoryInFirestore();
    sendRealtimeSync('UPDATE_PROMPTS', { historyCleared: true });
  };

  const handleClearAllLibrary = async () => {
    setPrompts([]);
    setCollections([]);
    clearStoredPrompts();
    clearStoredCollections();
    await clearAllPromptsInFirestore();
    await clearAllCollectionsInFirestore();
    sendRealtimeSync('UPDATE_PROMPTS', { libraryCleared: true });
  };

  // Firestore Real-Time Database Listener & Seed Initial Data
  useEffect(() => {
    seedFirestoreIfEmpty();

    const unsubPrompts = subscribeToPromptsRealtime((remotePrompts) => {
      setPrompts(remotePrompts);
      saveStoredPrompts(remotePrompts);
    });

    const unsubCollections = subscribeToCollectionsRealtime((remoteCols) => {
      setCollections(remoteCols);
      saveStoredCollections(remoteCols);
    });

    const unsubHistory = subscribeToHistoryRealtime((remoteHist) => {
      setHistory(remoteHist);
      saveStoredHistory(remoteHist);
    });

    const unsubSettings = subscribeToSettingsRealtime((remoteSettings) => {
      setSettings(remoteSettings);
      saveStoredSettings(remoteSettings);
    });

    return () => {
      unsubPrompts();
      unsubCollections();
      unsubHistory();
      unsubSettings();
    };
  }, []);

  // Listen for real-time messages from other connected sessions
  useEffect(() => {
    const unsubscribe = onRealtimeMessage((data) => {
      if (data.type === 'PROMPT_CREATED' && data.prompt) {
        setPrompts((prev) => {
          if (prev.some((p) => p.id === data.prompt.id)) return prev;
          const updated = [data.prompt, ...prev];
          saveStoredPrompts(updated);
          return updated;
        });
      } else if (data.type === 'PROMPT_UPDATED' && data.prompt) {
        setPrompts((prev) => {
          const updated = prev.map((p) => (p.id === data.prompt.id ? data.prompt : p));
          saveStoredPrompts(updated);
          return updated;
        });
      } else if (data.type === 'PROMPT_DELETED' && data.id) {
        setPrompts((prev) => {
          const updated = prev.filter((p) => p.id !== data.id);
          saveStoredPrompts(updated);
          return updated;
        });
      } else if (data.type === 'PROMPT_FAVORITED' && data.id) {
        setPrompts((prev) => {
          const updated = prev.map((p) => (p.id === data.id ? { ...p, isFavorite: !p.isFavorite } : p));
          saveStoredPrompts(updated);
          return updated;
        });
      } else if (data.type === 'COLLECTION_CREATED' && data.collection) {
        setCollections((prev) => {
          if (prev.some((c) => c.id === data.collection.id)) return prev;
          const updated = [data.collection, ...prev];
          saveStoredCollections(updated);
          return updated;
        });
      } else if (data.type === 'COLLECTION_DELETED' && data.id) {
        setCollections((prev) => {
          const updated = prev.filter((c) => c.id !== data.id);
          saveStoredCollections(updated);
          return updated;
        });
      }
    });

    return () => unsubscribe();
  }, [onRealtimeMessage]);

  // Modal State
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isOptimizerModalOpen, setIsOptimizerModalOpen] = useState(false);
  const [isTranslatorModalOpen, setIsTranslatorModalOpen] = useState(false);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Active target text for modals
  const [modalPromptText, setModalPromptText] = useState('');
  const [modalPromptTitle, setModalPromptTitle] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);

  // Dark Mode Class Sync
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Global Keyboard Shortcuts (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save Handlers
  const handleSavePrompt = (newPrompt: PromptItem) => {
    const updated = [newPrompt, ...prompts];
    setPrompts(updated);
    saveStoredPrompts(updated);
    syncPromptToFirestore(newPrompt);

    sendRealtimeSync('PROMPT_CREATED', { prompt: newPrompt, title: newPrompt.title });

    const newHist = addHistoryEntry(
      newPrompt.title,
      'create',
      `Prompt baru dibuat dan disimpan di ${newPrompt.category}`,
      newPrompt.id
    );
    setHistory((prev) => [newHist, ...prev]);
  };

  const handleUpdatePrompt = (updatedPrompt: PromptItem) => {
    const updated = prompts.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p));
    setPrompts(updated);
    saveStoredPrompts(updated);
    syncPromptToFirestore(updatedPrompt);

    sendRealtimeSync('PROMPT_UPDATED', { prompt: updatedPrompt, title: updatedPrompt.title });

    const newHist = addHistoryEntry(
      updatedPrompt.title,
      'update',
      `Prompt diperbarui`,
      updatedPrompt.id
    );
    setHistory((prev) => [newHist, ...prev]);
  };

  const handleDeletePrompt = (id: string) => {
    const p = prompts.find((item) => item.id === id);
    const updated = prompts.filter((item) => item.id !== id);
    setPrompts(updated);
    saveStoredPrompts(updated);
    deletePromptFromFirestore(id);

    sendRealtimeSync('PROMPT_DELETED', { id });

    if (p) {
      const newHist = addHistoryEntry(p.title, 'update', 'Prompt dihapus dari library', id);
      setHistory((prev) => [newHist, ...prev]);
    }
  };

  const handleToggleFavorite = (id: string) => {
    const updated = prompts.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
    setPrompts(updated);
    saveStoredPrompts(updated);
    const target = updated.find((p) => p.id === id);
    if (target) {
      syncPromptToFirestore(target);
    }

    sendRealtimeSync('PROMPT_FAVORITED', { id });
  };

  const handleCreateCollection = (newCol: Collection) => {
    const updated = [newCol, ...collections];
    setCollections(updated);
    saveStoredCollections(updated);
    syncCollectionToFirestore(newCol);

    sendRealtimeSync('COLLECTION_CREATED', { collection: newCol, name: newCol.name });
  };

  const handleDeleteCollection = (colId: string) => {
    const updated = collections.filter((c) => c.id !== colId);
    setCollections(updated);
    saveStoredCollections(updated);
    deleteCollectionFromFirestore(colId);

    sendRealtimeSync('COLLECTION_DELETED', { id: colId });
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    syncSettingsToFirestore(newSettings);
  };

  const handleImportWorkspace = (
    importedPrompts: PromptItem[],
    importedCollections: Collection[]
  ) => {
    setPrompts(importedPrompts);
    saveStoredPrompts(importedPrompts);
    importedPrompts.forEach((p) => syncPromptToFirestore(p));

    if (importedCollections.length > 0) {
      setCollections(importedCollections);
      saveStoredCollections(importedCollections);
      importedCollections.forEach((c) => syncCollectionToFirestore(c));
    }
  };

  const handleRestoreVersion = (log: HistoryLog) => {
    if (log.promptId) {
      const found = prompts.find((p) => p.id === log.promptId);
      if (found) {
        setSelectedPrompt(found);
        setIsDetailModalOpen(true);
      } else {
        alert(`Prompt "${log.promptTitle}" tidak ditemukan di library.`);
      }
    }
  };

  // Open Modal Helpers
  const handleOpenScoreModal = (text: string, title: string) => {
    setModalPromptText(text);
    setModalPromptTitle(title);
    setIsScoreModalOpen(true);
  };

  const handleOpenOptimizerModal = (text: string) => {
    setModalPromptText(text);
    setIsOptimizerModalOpen(true);
  };

  const handleOpenTranslatorModal = (text: string) => {
    setModalPromptText(text);
    setIsTranslatorModalOpen(true);
  };

  const handleSelectPrompt = (prompt: PromptItem) => {
    setSelectedPrompt(prompt);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        promptCount={prompts.length}
        favoriteCount={prompts.filter((p) => p.isFavorite).length}
        collectionCount={collections.length}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation */}
        <TopNav
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onNavigateToGenerate={() => setCurrentView('generate')}
          theme={settings.theme}
          onToggleTheme={() =>
            handleUpdateSettings({
              ...settings,
              theme: settings.theme === 'light' ? 'dark' : 'light',
            })
          }
          activeView={currentView}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* View Router Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] dark:bg-slate-950">
          {currentView === 'dashboard' && (
            <DashboardView
              prompts={prompts}
              collections={collections}
              history={history}
              onNavigateView={setCurrentView}
              onSelectPrompt={handleSelectPrompt}
              onOpenOptimizeModal={() => handleOpenOptimizerModal(prompts[0]?.content || '')}
              onOpenTranslateModal={() => handleOpenTranslatorModal(prompts[0]?.content || '')}
              onOpenExportImportModal={() => setIsExportImportModalOpen(true)}
              onOpenNewCollectionModal={() => setIsNewCollectionModalOpen(true)}
            />
          )}

          {currentView === 'generate' && (
            <GenerateView
              collections={collections}
              onSavePrompt={handleSavePrompt}
              onOpenScoreModal={handleOpenScoreModal}
              onOpenOptimizerModal={handleOpenOptimizerModal}
              onOpenTranslatorModal={handleOpenTranslatorModal}
            />
          )}

          {currentView === 'library' && (
            <LibraryView
              prompts={prompts}
              collections={collections}
              onSelectPrompt={handleSelectPrompt}
              onToggleFavorite={handleToggleFavorite}
              onDeletePrompt={handleDeletePrompt}
              onOpenOptimizerModal={handleOpenOptimizerModal}
              onOpenTranslatorModal={handleOpenTranslatorModal}
              onClearAllPrompts={handleClearAllLibrary}
            />
          )}

          {currentView === 'collections' && (
            <CollectionsView
              collections={collections}
              prompts={prompts}
              onSelectCollection={(colId) => {
                setCurrentView('library');
              }}
              onOpenNewCollectionModal={() => setIsNewCollectionModalOpen(true)}
              onDeleteCollection={handleDeleteCollection}
            />
          )}

          {currentView === 'playground' && <PlaygroundView />}

          {currentView === 'history' && (
            <HistoryView
              history={history}
              onRestoreVersion={handleRestoreVersion}
              onClearAllHistory={handleClearAllHistory}
            />
          )}

          {currentView === 'favorites' && (
            <FavoritesView
              prompts={prompts}
              onSelectPrompt={handleSelectPrompt}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView prompts={prompts} collections={collections} />
          )}

          {currentView === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenExportImportModal={() => setIsExportImportModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Global Modals & Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        prompts={prompts}
        collections={collections}
        onSelectPrompt={handleSelectPrompt}
        onNavigateView={setCurrentView}
      />

      <PromptScoreModal
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        promptText={modalPromptText}
        title={modalPromptTitle}
      />

      <PromptOptimizerModal
        isOpen={isOptimizerModalOpen}
        onClose={() => setIsOptimizerModalOpen(false)}
        promptText={modalPromptText}
        onApplyOptimizedPrompt={(opt) => {
          if (selectedPrompt) {
            handleUpdatePrompt({ ...selectedPrompt, content: opt });
          }
        }}
      />

      <PromptTranslatorModal
        isOpen={isTranslatorModalOpen}
        onClose={() => setIsTranslatorModalOpen(false)}
        promptText={modalPromptText}
        onApplyTranslatedPrompt={(trans) => {
          if (selectedPrompt) {
            handleUpdatePrompt({ ...selectedPrompt, content: trans });
          }
        }}
      />

      <ExportImportModal
        isOpen={isExportImportModalOpen}
        onClose={() => setIsExportImportModalOpen(false)}
        prompts={prompts}
        collections={collections}
        onImportWorkspace={handleImportWorkspace}
      />

      <NewCollectionModal
        isOpen={isNewCollectionModalOpen}
        onClose={() => setIsNewCollectionModalOpen(false)}
        onCreateCollection={handleCreateCollection}
      />

      <PromptDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        prompt={selectedPrompt}
        onUpdatePrompt={handleUpdatePrompt}
        onOpenScoreModal={handleOpenScoreModal}
        onOpenOptimizerModal={handleOpenOptimizerModal}
        onOpenTranslatorModal={handleOpenTranslatorModal}
      />

      {/* Floating Gemini AI Co-Pilot Launcher */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/20 cursor-pointer"
          title="Tanya ZetassAI"
        >
          <div className="relative">
            <Bot className="w-4 h-4 text-white" />
            <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1.5 animate-pulse" />
          </div>
          <span className="font-heading font-bold text-xs">ZetassAI</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Floating Gemini AI Assistant Chat Drawer */}
      <GeminiChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onApplyPromptToGenerator={() => {
          setCurrentView('generate');
        }}
      />
    </div>
  );
}
