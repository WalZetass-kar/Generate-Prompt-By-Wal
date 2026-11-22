import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { CommandPalette } from './components/CommandPalette';
import { DashboardView } from './components/DashboardView';
import { GenerateView } from './components/GenerateView';
import { PRDView } from './components/PRDView';
import { MediaStudioView } from './components/MediaStudioView';
import { LibraryView } from './components/LibraryView';
import { CollectionsView } from './components/CollectionsView';
import { PlaygroundView } from './components/PlaygroundView';
import { HistoryView } from './components/HistoryView';
import { FavoritesView } from './components/FavoritesView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { LandingPage } from './components/LandingPage';

import { PromptScoreModal } from './components/modals/PromptScoreModal';
import { PromptOptimizerModal } from './components/modals/PromptOptimizerModal';
import { PromptTranslatorModal } from './components/modals/PromptTranslatorModal';
import { ExportImportModal } from './components/modals/ExportImportModal';
import { NewCollectionModal } from './components/modals/NewCollectionModal';
import { PromptDetailModal } from './components/modals/PromptDetailModal';
import { GeminiChatDrawer } from './components/GeminiChatDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Bot, AlertCircle, X } from 'lucide-react';

import { setRuntimeCustomApiKeys } from './lib/storage';
import { DEFAULT_SETTINGS } from './data/initialData';

import {
  syncPromptToFirestore,
  togglePromptFavoriteInFirestore,
  deletePromptFromFirestore,
  batchDeletePromptsFromFirestore,
  batchMovePromptsToCollectionInFirestore,
  clearAllPromptsInFirestore,
  syncCollectionToFirestore,
  deleteCollectionFromFirestore,
  clearAllCollectionsInFirestore,
  syncSettingsToFirestore,
  addHistoryEntryToFirestore,
  subscribeToPromptsRealtime,
  subscribeToCollectionsRealtime,
  subscribeToHistoryRealtime,
  subscribeToSettingsRealtime,
  clearAllHistoryInFirestore,
  clearAllWorkspaceDataInFirestore,
} from './lib/firebaseStorage';

import { ViewMode, PromptItem, Collection, HistoryLog, UserSettings } from './types';
import { useRealtime } from './context/RealtimeContext';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, authReady, profileReady } = useAuth();
  const { sendRealtimeSync } = useRealtime();

  // Navigation State
  const [showLandingPage, setShowLandingPage] = useState(true);
  const prevSignedInRef = useRef<boolean | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Cloud-Backed Data State (100% Firebase Firestore, Zero localStorage)
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    ...DEFAULT_SETTINGS,
    defaultModel: 'gemini-4-hydrogen',
  });
  const [playgroundDraftPrompt, setPlaygroundDraftPrompt] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const showNotice = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((prev) => (prev === msg ? null : prev)), 4000);
  };

  // Sync in-memory custom API keys cache from Firestore settings
  useEffect(() => {
    setRuntimeCustomApiKeys(settings.customKeys);
  }, [settings.customKeys]);

  // Reset workspace state cleanly when user logs out
  useEffect(() => {
    if (!user) {
      setPrompts([]);
      setCollections([]);
      setHistory([]);
      setSettings({ ...DEFAULT_SETTINGS, defaultModel: 'gemini-4-hydrogen' });
      setRuntimeCustomApiKeys(undefined);
      setSelectedPrompt(null);
      setIsDetailModalOpen(false);
    }
  }, [user]);

  // Firestore Real-Time Subscriptions strictly gated on authenticated user + profileReady
  useEffect(() => {
    if (!authReady || !profileReady || !user) {
      return;
    }

    const uid = user.uid;
    const unsubPrompts = subscribeToPromptsRealtime(uid, (remotePrompts) => {
      setPrompts(remotePrompts);
    });

    const unsubCollections = subscribeToCollectionsRealtime(uid, (remoteCols) => {
      setCollections(remoteCols);
    });

    const unsubHistory = subscribeToHistoryRealtime(uid, (remoteHist) => {
      setHistory(remoteHist);
    });

    const unsubSettings = subscribeToSettingsRealtime(uid, (remoteSettings) => {
      setSettings(remoteSettings);
    });

    return () => {
      unsubPrompts();
      unsubCollections();
      unsubHistory();
      unsubSettings();
    };
  }, [authReady, profileReady, user]);

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

  // Automatically enter workspace when a signed-out user completes Google Sign-In
  useEffect(() => {
    if (!authReady) return;
    const isNowSignedIn = Boolean(user && profileReady);
    if (prevSignedInRef.current === false && isNowSignedIn) {
      setShowLandingPage(false);
    }
    if (!user) {
      setShowLandingPage(true);
    }
    prevSignedInRef.current = Boolean(user);
  }, [authReady, user, profileReady]);

  // Show Landing Page when unauthenticated or when user visits Landing Page
  if (!authReady || !user || !profileReady || showLandingPage) {
    return (
      <LandingPage
        theme={settings.theme}
        onToggleTheme={() => {
          const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
          if (user && profileReady) {
            const nextSettings: UserSettings = { ...settings, theme: nextTheme };
            setSettings(nextSettings);
            void syncSettingsToFirestore(user.uid, nextSettings);
          } else {
            setSettings((prev) => ({ ...prev, theme: nextTheme }));
          }
        }}
        onEnterWorkspace={(targetView) => {
          if (targetView) {
            setCurrentView(targetView);
          }
          setShowLandingPage(false);
        }}
      />
    );
  }

  const userId = user.uid;

  const handleClearAllHistory = async () => {
    setHistory([]);
    await clearAllHistoryInFirestore(userId);
    sendRealtimeSync('UPDATE_PROMPTS', { historyCleared: true });
  };

  const handleClearAllLibrary = async () => {
    setPrompts([]);
    setCollections([]);
    await clearAllPromptsInFirestore(userId);
    await clearAllCollectionsInFirestore(userId);
    sendRealtimeSync('UPDATE_PROMPTS', { libraryCleared: true });
  };

  const handleClearAllWorkspaceData = async () => {
    setPrompts([]);
    setCollections([]);
    setHistory([]);
    setPlaygroundDraftPrompt('');
    await clearAllWorkspaceDataInFirestore(userId);
    sendRealtimeSync('UPDATE_PROMPTS', { workspaceCleared: true });
    showNotice('Seluruh data workspace berhasil dikosongkan. Template bawaan tetap tersedia.');
  };

  // Cloud CRUD Handlers
  const handleSavePrompt = (newPrompt: PromptItem) => {
    setPrompts((prev) => [newPrompt, ...prev.filter((p) => p.id !== newPrompt.id)]);
    void syncPromptToFirestore(userId, newPrompt);
    sendRealtimeSync('PROMPT_CREATED', { promptId: newPrompt.id, title: newPrompt.title });
    void addHistoryEntryToFirestore(
      userId,
      newPrompt.title,
      'create',
      `Prompt baru dibuat dan disimpan di ${newPrompt.category}`,
      newPrompt.id
    );
  };

  const handleUpdatePrompt = (updatedPrompt: PromptItem) => {
    setPrompts((prev) => prev.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p)));
    void syncPromptToFirestore(userId, updatedPrompt);
    sendRealtimeSync('PROMPT_UPDATED', { promptId: updatedPrompt.id, title: updatedPrompt.title });
    void addHistoryEntryToFirestore(
      userId,
      updatedPrompt.title,
      'update',
      'Prompt diperbarui di Firebase Cloud',
      updatedPrompt.id
    );
  };

  const handleDeletePrompt = (id: string) => {
    const p = prompts.find((item) => item.id === id);
    setPrompts((prev) => prev.filter((item) => item.id !== id));
    void deletePromptFromFirestore(userId, id);
    sendRealtimeSync('PROMPT_DELETED', { id });

    if (p) {
      void addHistoryEntryToFirestore(userId, p.title, 'update', 'Prompt dihapus dari library', id);
    }
  };

  const handleBatchDeletePrompts = async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setPrompts((prev) => prev.filter((item) => !idSet.has(item.id)));
    if (selectedPrompt && idSet.has(selectedPrompt.id)) {
      setSelectedPrompt(null);
      setIsDetailModalOpen(false);
    }
    await batchDeletePromptsFromFirestore(userId, ids);
    sendRealtimeSync('PROMPT_DELETED', { ids, batch: true });
    void addHistoryEntryToFirestore(
      userId,
      `${ids.length} Prompt Terpilih`,
      'update',
      `${ids.length} prompt dihapus secara massal dari library`
    );
    showNotice(`${ids.length} prompt berhasil dihapus dari library.`);
  };

  const handleBatchMovePromptsToCollection = async (
    ids: string[],
    collectionId: string | null
  ) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const nowIso = new Date().toISOString();
    setPrompts((prev) =>
      prev.map((p) =>
        idSet.has(p.id)
          ? { ...p, collectionId: collectionId ?? undefined, updatedAt: nowIso }
          : p
      )
    );
    await batchMovePromptsToCollectionInFirestore(userId, ids, collectionId);
    sendRealtimeSync('PROMPT_UPDATED', { ids, collectionId, batch: true });

    const targetCol = collectionId ? collections.find((c) => c.id === collectionId) : null;
    const colLabel = targetCol ? `koleksi "${targetCol.name}"` : 'tanpa koleksi';
    void addHistoryEntryToFirestore(
      userId,
      `${ids.length} Prompt Terpilih`,
      'update',
      `${ids.length} prompt dipindahkan ke ${colLabel}`
    );
    showNotice(`${ids.length} prompt berhasil dipindahkan ke ${colLabel}.`);
  };

  const handleRecordPromptUsage = (
    prompt: PromptItem,
    action: HistoryLog['action'],
    details: string
  ) => {
    void addHistoryEntryToFirestore(userId, prompt.title, action, details, prompt.id);
  };

  const handleToggleFavorite = (id: string) => {
    const target = prompts.find((p) => p.id === id);
    if (!target) return;
    const nextFav = !target.isFavorite;
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, isFavorite: nextFav } : p)));
    void togglePromptFavoriteInFirestore(userId, id, nextFav);
    sendRealtimeSync('PROMPT_FAVORITED', { id });
  };

  const handleCreateCollection = (newCol: Collection) => {
    setCollections((prev) => [newCol, ...prev.filter((c) => c.id !== newCol.id)]);
    void syncCollectionToFirestore(userId, newCol);
    sendRealtimeSync('COLLECTION_CREATED', { collectionId: newCol.id, name: newCol.name });
  };

  const handleDeleteCollection = (colId: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== colId));
    void deleteCollectionFromFirestore(userId, colId);
    sendRealtimeSync('COLLECTION_DELETED', { id: colId });
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    setRuntimeCustomApiKeys(newSettings.customKeys);
    void syncSettingsToFirestore(userId, newSettings);
  };

  const handleImportWorkspace = (
    importedPrompts: PromptItem[],
    importedCollections: Collection[]
  ) => {
    setPrompts(importedPrompts);
    importedPrompts.forEach((p) => void syncPromptToFirestore(userId, p));

    if (importedCollections.length > 0) {
      setCollections(importedCollections);
      importedCollections.forEach((c) => void syncCollectionToFirestore(userId, c));
    }
    showNotice(`Berhasil mengimpor ${importedPrompts.length} prompt ke Firebase Cloud.`);
  };

  const handleRestoreVersion = (log: HistoryLog) => {
    if (log.promptId) {
      const found = prompts.find((p) => p.id === log.promptId);
      if (found) {
        setSelectedPrompt(found);
        setIsDetailModalOpen(true);
      } else {
        showNotice(`Prompt "${log.promptTitle}" tidak ditemukan di library.`);
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

  const handleNavigateToPlaygroundWithPrompt = (promptText?: string) => {
    if (promptText && promptText.trim()) {
      setPlaygroundDraftPrompt(promptText);
    }
    setCurrentView('playground');
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
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
          onOpenLandingPage={() => setShowLandingPage(true)}
        />

        {/* Inline Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 right-4 z-50 max-w-sm px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 shadow-xl flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Router Workspace */}
        <main className="flex-1 overflow-y-auto bg-[#FAFAFA] dark:bg-slate-950 pb-20 md:pb-0">
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
              userId={userId}
              collections={collections}
              onSavePrompt={handleSavePrompt}
              onOpenScoreModal={handleOpenScoreModal}
              onOpenOptimizerModal={handleOpenOptimizerModal}
              onOpenTranslatorModal={handleOpenTranslatorModal}
              onNavigateToPlayground={handleNavigateToPlaygroundWithPrompt}
            />
          )}

          {currentView === 'prd' && (
            <PRDView
              userId={userId}
              collections={collections}
              onSavePrompt={handleSavePrompt}
              onNavigateToPlayground={handleNavigateToPlaygroundWithPrompt}
            />
          )}

          {currentView === 'media-studio' && (
            <MediaStudioView userId={userId} prompts={prompts} settings={settings} />
          )}

          {currentView === 'library' && (
            <LibraryView
              prompts={prompts}
              collections={collections}
              history={history}
              onSelectPrompt={handleSelectPrompt}
              onToggleFavorite={handleToggleFavorite}
              onDeletePrompt={handleDeletePrompt}
              onBatchDeletePrompts={handleBatchDeletePrompts}
              onBatchMoveToCollection={handleBatchMovePromptsToCollection}
              onRecordPromptUsage={handleRecordPromptUsage}
              onOpenNewCollectionModal={() => setIsNewCollectionModalOpen(true)}
              onOpenOptimizerModal={handleOpenOptimizerModal}
              onOpenTranslatorModal={handleOpenTranslatorModal}
              onClearAllPrompts={handleClearAllLibrary}
            />
          )}

          {currentView === 'collections' && (
            <CollectionsView
              collections={collections}
              prompts={prompts}
              onSelectCollection={() => {
                setCurrentView('library');
              }}
              onOpenNewCollectionModal={() => setIsNewCollectionModalOpen(true)}
              onDeleteCollection={handleDeleteCollection}
            />
          )}

          {currentView === 'playground' && (
            <PlaygroundView settings={settings} initialPrompt={playgroundDraftPrompt} />
          )}

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
            <AnalyticsView prompts={prompts} collections={collections} history={history} />
          )}

          {currentView === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenExportImportModal={() => setIsExportImportModalOpen(true)}
              onClearAllWorkspaceData={handleClearAllWorkspaceData}
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

      {/* Floating AI Assistant Launcher */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-5 sm:right-5 z-30 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-md flex items-center gap-2 transition-colors cursor-pointer"
          title="Buka ZetassAI Chat"
        >
          <Bot className="w-4 h-4" />
          <span className="font-heading text-xs">ZetassAI</span>
        </button>
      )}

      {/* Floating Multi-AI Assistant Chat Drawer (ZetassAI) */}
      <GeminiChatDrawer
        userId={userId}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onApplyPromptToGenerator={() => {
          setCurrentView('generate');
        }}
      />

      {/* Dedicated Mobile Web Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={setCurrentView}
        promptCount={prompts.length}
        favoriteCount={prompts.filter((p) => p.isFavorite).length}
        collectionCount={collections.length}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />
    </div>
  );
}
