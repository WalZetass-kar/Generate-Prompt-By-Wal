import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  BrainCircuit,
  Copy,
  Check,
  RotateCcw,
  Maximize2,
  Minimize2,
  Lightbulb,
  ListTodo,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  CheckSquare,
  FileCode,
  Edit3,
  Layers,
  ChevronDown,
  Cpu,
} from 'lucide-react';
import { UserSettings, AIProviderId } from '../types';
import { getCustomApiKeys } from '../lib/storage';
import {
  saveWorkspaceDoc,
  subscribeToWorkspaceDocRealtime,
  ChatPreferencesPayload,
} from '../lib/firebaseStorage';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isThinking?: boolean;
  providerUsed?: string;
  modelUsed?: string;
  isFallback?: boolean;
}

interface QuickSetupPreset {
  id: string;
  title: string;
  tag: string;
  description: string;
  systemPrompt: string;
}

const QUICK_SETUP_PRESETS: QuickSetupPreset[] = [
  {
    id: 'actionable_tasks',
    title: 'Actionable Task List & Execution Plan',
    tag: 'Rekomendasi Utama',
    description: 'AI wajib menyusun daftar tugas aksi nyata (Checklist [ ]), tahapan teknis, deliverables, dan master prompt siap eksekusi.',
    systemPrompt: `Kamu adalah ZetassAI — Lead AI Architect & Executive Task Execution Specialist.
Setiap kali pengguna menanyakan ide, kebutuhan sistem, atau pembuatan prompt AI, tugas UTAMA kamu adalah memecahnya menjadi DAFTAR TUGAS AKSI NYATA (ACTIONABLE TASK LIST) yang sangat terstruktur, jelas, dan siap dieksekusi secara nyata.

FORMAT STRUKTUR RESPON WAJIB:
1. RINGKASAN TUJUAN & LINGKUP (Executive Scope)
2. ACTIONABLE TASK LIST & RENCANA KERJA TEKNIS (Wajib dalam format checklist checkbox [ ] atau [x]):
   - [ ] Fase 1: Fondasi & Arsitektur (Daftar tugas rinci, output/deliverable)
   - [ ] Fase 2: Implementasi Core & Logika Bisnis (Daftar tugas implementasi)
   - [ ] Fase 3: Integrasi, Validasi & Keamanan (Daftar tugas integrasi)
   - [ ] Fase 4: Pengujian, Delivery & Finalisasi (Daftar tugas verifikasi)
3. PRODUCTION MASTER PROMPT TEMPLATE (Template prompt siap salin yang langsung mengeksekusi task list tersebut tanpa basa-basi)
4. DEFINITION OF DONE & CHECKLIST KEBERHASILAN (Kriteria acceptance criteria terukur)

DILARANG memberikan penjelasan teoritis yang mengambang tanpa action items yang konkret dan checklist terstruktur.`,
  },
  {
    id: 'sprint_prd',
    title: 'Sprint & PRD Task Breakdown',
    tag: 'Product & Dev',
    description: 'AI memecah fitur menjadi tiket/task sprint per modul (Frontend, Backend API, Database Schema, QA Testing).',
    systemPrompt: `Kamu adalah ZetassAI — Senior Principal Product Manager & Technical Architect.
Tugasmu adalah menganalisis kebutuhan produk atau fitur pengguna dan langsung menyusun SPRINT TASK BREAKDOWN terperinci.

FORMAT STRUKTUR RESPON WAJIB:
1. OVERVIEW FITUR & ESTIMASI SPRINT
2. ACTIONABLE SPRINT TASKS:
   - [ ] Frontend Tasks (UI Components, State Management, Validasi)
   - [ ] Backend API Tasks (Endpoints, Business Logic, Middleware)
   - [ ] Database & Storage Tasks (Schema Migration, Indexing, ORM)
   - [ ] Security & Testing Tasks (Unit Test, Integration, Role Access)
3. MASTER PROMPT EKSEKUSI (Prompt siap pakai untuk tim engineer/AI coder)
4. RISK MITIGATION & ACCEPTANCE CRITERIA`,
  },
  {
    id: 'prompt_refinement',
    title: 'Prompt Optimization & Tuning Tasks',
    tag: 'Prompt Engineering',
    description: 'AI menganalisis prompt pengguna, memberikan task checklist perbaikan, dan menghasilkan master prompt siap pakai.',
    systemPrompt: `Kamu adalah ZetassAI — Master Prompt Optimization Strategist.
Tugasmu adalah mereview kebutuhan atau draf prompt pengguna dan menyusun TASK LIST PERBAIKAN PROMPT.

FORMAT STRUKTUR RESPON WAJIB:
1. DIAGNOSIS AMBIGUITAS & POTENSI HALUSINASI
2. ACTIONABLE REFINEMENT TASKS (Langkah-langkah perbaikan spesifik [ ])
3. DIRECT-EXECUTION MASTER PROMPT (Versi prompt bersih, terlindungi klausul anti-meta, dan siap dieksekusi langsung)
4. BENCHMARKING & ATURAN PENGUJIAN`,
  },
];

interface GeminiChatDrawerProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyPromptToGenerator?: (prompt: string) => void;
  settings?: UserSettings;
  onUpdateSettings?: (newSettings: UserSettings) => void;
}

export const GeminiChatDrawer: React.FC<GeminiChatDrawerProps> = ({
  userId,
  isOpen,
  onClose,
  onApplyPromptToGenerator,
  settings,
  onUpdateSettings,
}) => {
  // Current AI Provider for Bot
  const [activeBotProvider, setActiveBotProvider] = useState<AIProviderId>(
    settings?.botProvider || 'gemini'
  );

  useEffect(() => {
    if (settings?.botProvider) {
      setActiveBotProvider(settings.botProvider);
    }
  }, [settings?.botProvider]);

  const handleProviderSelect = (prov: AIProviderId) => {
    setActiveBotProvider(prov);
    if (settings && onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        botProvider: prov,
      });
    }
  };

  // Quick Setup State (100% synced with Firebase Firestore)
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const [isQuickSetupEnabled, setIsQuickSetupEnabled] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('actionable_tasks');
  const [customPromptText, setCustomPromptText] = useState<string>(
    QUICK_SETUP_PRESETS[0].systemPrompt
  );
  const [isEditingCustomPrompt, setIsEditingCustomPrompt] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToWorkspaceDocRealtime<ChatPreferencesPayload>(
      userId,
      'chat_preferences',
      (payload) => {
        if (payload) {
          setIsQuickSetupEnabled(Boolean(payload.enabled));
          setSelectedPresetId(payload.presetId || 'actionable_tasks');
          setCustomPromptText(payload.customPrompt || QUICK_SETUP_PRESETS[0].systemPrompt);
        }
      }
    );
    return () => unsub();
  }, [userId]);

  const persistChatPreferences = (next: ChatPreferencesPayload) => {
    if (!userId) return;
    void saveWorkspaceDoc(userId, 'chat_preferences', next);
  };

  const activePreset = QUICK_SETUP_PRESETS.find((p) => p.id === selectedPresetId);

  const getEffectiveSystemPrompt = () => {
    if (!isQuickSetupEnabled) return undefined;
    if (selectedPresetId === 'custom') return customPromptText;
    return activePreset ? activePreset.systemPrompt : QUICK_SETUP_PRESETS[0].systemPrompt;
  };

  const getProviderDisplay = (prov: AIProviderId) => {
    switch (prov) {
      case 'openai':
        return { name: 'OpenAI GPT-4o', color: 'text-emerald-500' };
      case 'anthropic':
        return { name: 'Claude 3.5 Sonnet', color: 'text-amber-500' };
      case 'deepseek':
        return { name: 'DeepSeek V3 / R1', color: 'text-cyan-500' };
      case 'groq':
        return { name: 'Groq Llama 3.3', color: 'text-orange-500' };
      case 'openrouter':
        return { name: 'OpenRouter Hub', color: 'text-violet-500' };
      default:
        return { name: 'Gemini 4 Hydrogen', color: 'text-blue-500' };
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'Halo! Saya ZetassAI powered by Gemini 4 Hydrogen. Ada yang bisa saya bantu untuk merancang Master Prompt, menyusun PRD, atau mengoptimalkan arsitektur sistem Anda hari ini?',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enableThinking, setEnableThinking] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isQuickSetupOpen) {
          setIsQuickSetupOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isQuickSetupOpen, onClose]);

  // Persist Quick Setup Preferences to Firebase Firestore
  const handleToggleQuickSetup = (enabled: boolean) => {
    setIsQuickSetupEnabled(enabled);
    persistChatPreferences({
      enabled,
      presetId: selectedPresetId,
      customPrompt: customPromptText,
    });
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const target = QUICK_SETUP_PRESETS.find((p) => p.id === presetId);
    const nextPrompt = target ? target.systemPrompt : customPromptText;
    if (target) {
      setCustomPromptText(target.systemPrompt);
    }
    persistChatPreferences({
      enabled: isQuickSetupEnabled,
      presetId,
      customPrompt: nextPrompt,
    });
  };

  const handleApplyQuickSetupAndReset = () => {
    setIsQuickSetupEnabled(true);
    persistChatPreferences({
      enabled: true,
      presetId: selectedPresetId,
      customPrompt: customPromptText,
    });
    setIsQuickSetupOpen(false);

    const presetName = selectedPresetId === 'custom' 
      ? 'Custom Directives' 
      : activePreset?.title || 'Actionable Task List';

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Quick Setup Berhasil Diaktifkan: [${presetName}].\n\nKonteks sistem telah disuntikkan. Silakan sebutkan kebutuhan atau ide prompt Anda, dan AI akan otomatis menghasilkan Actionable Task List terstruktur beserta Master Prompt siap pakai.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      // Map for server endpoint with Multi-Provider AI support & Quick Setup Injection
      const payload = {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        enableThinking,
        systemPrompt: getEffectiveSystemPrompt(),
        quickSetupMode: isQuickSetupEnabled,
        provider: activeBotProvider,
        customKeys: getCustomApiKeys() || settings?.customKeys,
      };

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          isThinking: enableThinking,
          providerUsed: data.providerUsed,
          modelUsed: data.modelUsed,
          isFallback: data.isFallback,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Response invalid');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Maaf, terjadi kesalahan saat menghubungi AI Engine: ${err.message || 'Error'}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: isQuickSetupEnabled
          ? 'Sesi chat telah dibersihkan. Quick Setup (Actionable Task List) tetap aktif. Silakan sampaikan permintaan atau ide prompt Anda.'
          : 'Sesi chat telah dibersihkan. Silakan ajukan pertanyaan atau instruksi baru untuk ZetassAI.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop Overlay - click outside to close */}
      <div
        className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity cursor-pointer"
        onClick={onClose}
        aria-label="Tutup Chat"
      />

      {/* Floating Chat Box Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed z-50 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-all duration-300
          inset-x-2 bottom-2 top-14 sm:top-auto sm:inset-x-auto sm:bottom-4 sm:right-4
          ${
            isExpanded
              ? 'sm:w-[720px] sm:h-[84vh] sm:max-h-[820px]'
              : 'sm:w-[480px] sm:h-[620px]'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-t-2xl shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-heading font-bold text-slate-800 dark:text-slate-100 truncate">
                  ZetassAI Co-Pilot
                </h3>
                <span className="hidden xs:inline-block px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-semibold rounded-full border border-emerald-500/20 shrink-0">
                  Online
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <select
                  value={activeBotProvider}
                  onChange={(e) => handleProviderSelect(e.target.value as AIProviderId)}
                  className="text-[10px] font-bold py-0.5 px-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  title="Ganti Engine AI untuk Bot"
                >
                  <option value="gemini">Gemini 4 Hydrogen</option>
                  <option value="openai">OpenAI GPT-4o</option>
                  <option value="anthropic">Claude 3.5 Sonnet</option>
                  <option value="deepseek">DeepSeek V3</option>
                  <option value="groq">Groq Llama 3.3</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Quick Setup Trigger Button */}
            <button
              type="button"
              onClick={() => setIsQuickSetupOpen(!isQuickSetupOpen)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isQuickSetupEnabled
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Quick Setup: Suntikkan System Prompt khusus untuk Actionable Task Lists"
            >
              <ListTodo className={`w-3.5 h-3.5 ${isQuickSetupEnabled ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="hidden xs:inline">Quick Setup</span>
              {isQuickSetupEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
              )}
            </button>

            {/* Thinking Mode Toggle */}
            <button
              type="button"
              onClick={() => setEnableThinking(!enableThinking)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                enableThinking
                  ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
              title="Sertakan Deep Reasoning & Thinking Mode Gemini"
            >
              <BrainCircuit className={`w-3 h-3 ${enableThinking ? 'text-purple-600 dark:text-purple-400 animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Thinking</span>
            </button>

            {/* Expand Toggle (Desktop Only) */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:flex p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title={isExpanded ? 'Kecilkan Window' : 'Perbesar Window'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Bersihkan Percakapan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 sm:p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
              title="Tutup Chat (Esc)"
              aria-label="Tutup Chat"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Quick Setup Modal / Flyout Overlay */}
        {isQuickSetupOpen && (
          <div className="absolute inset-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 flex flex-col rounded-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Quick Setup Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Quick Setup: Actionable Task List Injector
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Suntikkan instruksi sistem agar AI selalu menghasilkan task list terstruktur.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuickSetupOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Setup Content */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs">
              {/* Enable / Disable Switch */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Status Quick Setup</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isQuickSetupEnabled
                      ? 'Aktif: AI akan otomatis menyajikan Actionable Task List untuk setiap prompt.'
                      : 'Non-aktif: Menggunakan mode obrolan AI standar.'}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isQuickSetupEnabled}
                    onChange={(e) => handleToggleQuickSetup(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* Preset Selector */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Pilih Preset System Directives:
                </label>
                <div className="space-y-2">
                  {QUICK_SETUP_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-xs'
                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <CheckSquare className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                              {preset.title}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {preset.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal pl-5">
                          {preset.description}
                        </p>
                      </div>
                    );
                  })}

                  {/* Custom Option */}
                  <div
                    onClick={() => setSelectedPresetId('custom')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      selectedPresetId === 'custom'
                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-xs'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Edit3 className={`w-3.5 h-3.5 ${selectedPresetId === 'custom' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                          Custom System Directives
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        Custom
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal pl-5">
                      Kustomisasi teks instruksi sistem secara langsung sesuai preferensi spesifik Anda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Injected System Prompt Preview / Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <FileCode className="w-3 h-3 text-slate-500" />
                    <span>System Prompt Injected ke Chat Context:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEditingCustomPrompt(!isEditingCustomPrompt)}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {isEditingCustomPrompt ? 'Kunci Tampilan' : 'Edit Prompt'}
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={selectedPresetId === 'custom' ? customPromptText : (activePreset?.systemPrompt || customPromptText)}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setCustomPromptText(nextVal);
                    if (selectedPresetId !== 'custom') {
                      setSelectedPresetId('custom');
                    }
                    persistChatPreferences({
                      enabled: isQuickSetupEnabled,
                      presetId: 'custom',
                      customPrompt: nextVal,
                    });
                  }}
                  disabled={!isEditingCustomPrompt && selectedPresetId !== 'custom'}
                  className="w-full p-2.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 font-mono text-[10px] leading-relaxed resize-none focus:outline-hidden focus:ring-1 focus:ring-amber-500/50 disabled:opacity-80"
                />
              </div>
            </div>

            {/* Quick Setup Panel Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleToggleQuickSetup(false);
                  setIsQuickSetupOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Matikan Quick Setup
              </button>

              <button
                type="button"
                onClick={handleApplyQuickSetupAndReset}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Terapkan &amp; Mulai Sesi Baru</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Setup Active Notification Strip */}
        {isQuickSetupEnabled && (
          <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>Quick Setup Aktif:</strong> AI wajib menghasilkan Actionable Task List (Checklist [ ]) &amp; Master Prompt.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickSetupOpen(true)}
              className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0 cursor-pointer"
            >
              Ubah
            </button>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 space-y-1.5 shadow-2xs ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-tr-xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/40 dark:border-slate-700/40 pb-1 text-[10px] opacity-70">
                  <span className="font-semibold flex items-center gap-1 flex-wrap">
                    {m.role === 'user'
                      ? 'Anda'
                      : m.modelUsed || (m.providerUsed ? `${m.providerUsed.toUpperCase()} AI` : 'Gemini AI')}
                    {m.isFallback && (
                      <span className="text-amber-500 font-bold text-[9px] bg-amber-500/10 px-1 rounded">
                        (Fallback Gemini)
                      </span>
                    )}
                    {m.isThinking && (
                      <span className="text-purple-500 font-bold flex items-center gap-0.5">
                        <BrainCircuit className="w-2.5 h-2.5" /> Deep Thinking
                      </span>
                    )}
                  </span>
                  <span>{m.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap leading-relaxed font-normal text-[11px] sm:text-xs">
                  {m.content}
                </div>

                {m.role === 'assistant' && (
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(m.id, m.content)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    {onApplyPromptToGenerator && (
                      <button
                        type="button"
                        onClick={() => onApplyPromptToGenerator(m.content)}
                        className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 text-[10px] font-semibold flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
                        title="Gunakan sebagai prompt di Generator"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                        <span>Gunakan Prompt</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-slate-400 dark:text-slate-500 text-xs italic">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center animate-bounce">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>
                {enableThinking ? 'Gemini sedang berpikir mendalam & menyusun task list...' : 'Mengetik jawaban...'}
              </span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompt Suggestions */}
        <div className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" /> Ide:
          </span>
          {isQuickSetupEnabled ? (
            <>
              <button
                type="button"
                onClick={() => handleSendMessage('Buatkan Actionable Task List dan Master Prompt untuk implementasi sistem SaaS E-Commerce Multi-Tenant.')}
                className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400 shrink-0 transition-all cursor-pointer"
              >
                Task List SaaS E-Commerce
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Susun Actionable Task List dan Master Prompt Clean Architecture untuk backend Laravel 11 & PostgreSQL.')}
                className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400 shrink-0 transition-all cursor-pointer"
              >
                Task List Clean Architecture Laravel
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Buatkan Task List Sprint dan prompt untuk perancangan sistem autentikasi JWT + Role RBAC.')}
                className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400 shrink-0 transition-all cursor-pointer"
              >
                Task List RBAC Auth
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSendMessage('Buatkan saya PRD lengkap untuk sistem B2B SaaS Multi-Tenant')}
                className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 shrink-0 transition-all cursor-pointer"
              >
                PRD SaaS B2B
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Bagaimana cara membuat Master Prompt AI yang tahan halusinasi?')}
                className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 shrink-0 transition-all cursor-pointer"
              >
                Cegah Halusinasi AI
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Buatkan prompt koding Clean Architecture Laravel 11')}
                className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 shrink-0 transition-all cursor-pointer"
              >
                Prompt Clean Architecture
              </button>
            </>
          )}
        </div>

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-b-2xl"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isQuickSetupEnabled
                ? 'Ketik kebutuhan Anda untuk menghasilkan Actionable Task List...'
                : 'Tanyakan sesuatu pada Gemini Co-Pilot...'
            }
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-xl text-white disabled:opacity-40 transition-all shrink-0 cursor-pointer ${
              isQuickSetupEnabled
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </>
  );
};
