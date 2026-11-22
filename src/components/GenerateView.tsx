import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wand2,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Save,
  Zap,
  Globe,
  Shield,
  ShieldCheck,
  Download,
  Star,
  RefreshCw,
  Code2,
  Layers,
  FileText,
  History,
  FileCode,
  Printer,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Play,
  Braces,
  Plus,
  Eye,
  Edit3,
  Undo2,
  MoreHorizontal,
  SlidersHorizontal,
} from 'lucide-react';
import { FormState, PromptItem, Collection, QualityControlMeta } from '../types';
import { getCustomApiKeys } from '../lib/storage';
import {
  subscribeToWorkspaceDocRealtime,
  saveWorkspaceDoc,
  deleteWorkspaceDoc,
} from '../lib/firebaseStorage';
import { VoiceAutoFillButton } from './VoiceAutoFillButton';

interface GenerateViewProps {
  userId: string;
  collections: Collection[];
  onSavePrompt: (prompt: PromptItem) => void;
  onOpenScoreModal: (promptText: string, title: string) => void;
  onOpenOptimizerModal: (promptText: string) => void;
  onOpenTranslatorModal: (promptText: string) => void;
  onNavigateToPlayground?: (promptText: string) => void;
}

interface DraftSnapshot {
  id: string;
  timestamp: string;
  title: string;
  promptSnippet: string;
  formData: FormState;
  promptText: string;
}

interface PromptStrategyVariant {
  id: string;
  label: string;
  badge: string;
  summary: string;
  bestFor: string;
  prompt: string;
  qualityScore: number;
  qualityControl: QualityControlMeta;
}

interface GeneratorDraftPayload {
  formData?: Partial<FormState>;
  generatedPrompt?: string;
  variableValues?: Record<string, string>;
  draftHistory?: DraftSnapshot[];
}

const DEFAULT_FORM: FormState = {
  title: '',
  category: 'Development',
  subCategory: '',
  aiModel: 'Gemini 4 Hydrogen',
  language: 'Indonesian',
  programmingLanguage: '',
  framework: '',
  database: '',
  platform: '',
  stylePrompt: 'Direct All-in-One (Langsung Jadi & Lengkap)',
  designTheme: 'Clean Minimalist Modern UI',
  tone: 'Professional & Technical',
  outputLanguage: 'Indonesian',
  creativity: 'Balanced (0.7)',
  length: 'Full Complete Solution',
  targetAudience: '',
  description: '',
  additionalReqs: '',
  negativePrompt: '',
  expectedOutput: '',
  reference: '',
};

const VAR_REGEX = /\{\{\s*([a-zA-Z0-9_.\-\s]{1,50})\s*\}\}/g;

function normalizeVarName(raw: string): string {
  return raw.trim().replace(/\s+/g, '_').toLowerCase();
}

function formatVarLabel(name: string): string {
  return name
    .replace(/[_\-.]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function extractVariablesFromSources(promptText: string, form: FormState): string[] {
  const found = new Set<string>();
  const sources = [
    promptText || '',
    form.title || '',
    form.description || '',
    form.additionalReqs || '',
    form.expectedOutput || '',
  ];
  for (const src of sources) {
    let match: RegExpExecArray | null;
    VAR_REGEX.lastIndex = 0;
    while ((match = VAR_REGEX.exec(src)) !== null) {
      const normalized = normalizeVarName(match[1]);
      if (normalized) found.add(normalized);
    }
  }
  return Array.from(found);
}

function injectVariablesIntoPrompt(text: string, values: Record<string, string>): string {
  if (!text) return '';
  return text.replace(VAR_REGEX, (fullMatch, rawName) => {
    const key = normalizeVarName(rawName);
    const val = values[key];
    return val && val.trim().length > 0 ? val : fullMatch;
  });
}

export const GenerateView: React.FC<GenerateViewProps> = ({
  userId,
  collections,
  onSavePrompt,
  onOpenScoreModal,
  onOpenOptimizerModal,
  onOpenTranslatorModal,
  onNavigateToPlayground,
}) => {
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);
  const [wizardInput, setWizardInput] = useState('');
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [qualityControl, setQualityControl] = useState<QualityControlMeta | null>(null);
  const [assumptionsList, setAssumptionsList] = useState<string[]>([]);
  const [clarificationsList, setClarificationsList] = useState<string[]>([]);
  const [activeOutputTab, setActiveOutputTab] = useState<'prompt' | 'audit' | 'assumptions' | 'clarifications'>('prompt');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [promptVariants, setPromptVariants] = useState<PromptStrategyVariant[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  // Dynamic {{variable}} injection state
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [newVarName, setNewVarName] = useState('');
  const [isVarPanelOpen, setIsVarPanelOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [undoInjectSnapshot, setUndoInjectSnapshot] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>([]);
  const [isDraftHistoryOpen, setIsDraftHistoryOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);

  const cloudHydratedRef = useRef(false);
  const lastSavedDigestRef = useRef('');
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
        setIsSaveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const detectedVariables = useMemo(
    () => extractVariablesFromSources(generatedPrompt, formData),
    [generatedPrompt, formData]
  );

  const filledVariableCount = useMemo(
    () => detectedVariables.filter((name) => Boolean(variableValues[name]?.trim())).length,
    [detectedVariables, variableValues]
  );

  const resolvedPrompt = useMemo(
    () => injectVariablesIntoPrompt(generatedPrompt, variableValues),
    [generatedPrompt, variableValues]
  );

  const advancedFilledCount = useMemo(() => {
    const fields = [
      formData.subCategory,
      formData.programmingLanguage,
      formData.framework,
      formData.database,
      formData.platform,
      formData.targetAudience,
      formData.negativePrompt,
      formData.expectedOutput,
    ];
    return fields.filter((v) => Boolean(v?.trim())).length;
  }, [formData]);

  // Subscribe to user's private Firebase generator_draft workspace doc
  useEffect(() => {
    if (!userId) return;
    cloudHydratedRef.current = false;
    lastSavedDigestRef.current = '';

    const unsubscribe = subscribeToWorkspaceDocRealtime<GeneratorDraftPayload>(
      userId,
      'generator_draft',
      (payload) => {
        if (!cloudHydratedRef.current) {
          cloudHydratedRef.current = true;
          if (payload) {
            const hydratedForm: FormState = {
              ...DEFAULT_FORM,
              ...(payload.formData || {}),
            };
            const hydratedPrompt =
              typeof payload.generatedPrompt === 'string' ? payload.generatedPrompt : '';
            const hydratedVars =
              payload.variableValues && typeof payload.variableValues === 'object'
                ? payload.variableValues
                : {};
            const hydratedHistory = Array.isArray(payload.draftHistory)
              ? payload.draftHistory.slice(0, 15)
              : [];

            setFormData(hydratedForm);
            setGeneratedPrompt(hydratedPrompt);
            setVariableValues(hydratedVars);
            setDraftHistory(hydratedHistory);

            lastSavedDigestRef.current = JSON.stringify({
              formData: hydratedForm,
              generatedPrompt: hydratedPrompt,
              variableValues: hydratedVars,
              draftHistoryCount: hydratedHistory.length,
            });
          } else {
            lastSavedDigestRef.current = JSON.stringify({
              formData: DEFAULT_FORM,
              generatedPrompt: '',
              variableValues: {},
              draftHistoryCount: 0,
            });
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Auto-save mechanism: persist generator draft & snapshots to Firebase Firestore
  useEffect(() => {
    if (!userId || !cloudHydratedRef.current || isStreaming) return;

    const timer = setTimeout(async () => {
      const now = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      let nextHistory = draftHistory;
      if (generatedPrompt.trim()) {
        const last = draftHistory[0];
        if (!last || last.promptText !== generatedPrompt || last.title !== formData.title) {
          const newVersion: DraftSnapshot = {
            id: `draft-${Date.now()}`,
            timestamp: `${new Date().toLocaleDateString('id-ID')} ${now}`,
            title: formData.title || 'Untitled Draft',
            promptSnippet: generatedPrompt.slice(0, 100) + '...',
            formData,
            promptText: generatedPrompt,
          };
          nextHistory = [newVersion, ...draftHistory].slice(0, 15);
        }
      }

      const digest = JSON.stringify({
        formData,
        generatedPrompt,
        variableValues,
        draftHistoryCount: nextHistory.length,
      });

      if (digest === lastSavedDigestRef.current) return;

      try {
        await saveWorkspaceDoc(userId, 'generator_draft', {
          formData,
          generatedPrompt,
          variableValues,
          draftHistory: nextHistory,
        });
        lastSavedDigestRef.current = digest;
        if (nextHistory !== draftHistory) {
          setDraftHistory(nextHistory);
        }
      } catch (err) {
        console.error('Failed to auto-save generator draft to Firebase:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [userId, formData, generatedPrompt, variableValues, draftHistory, isStreaming]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sanitizeCleanPromptText = (raw: string): string => {
    if (!raw) return '';
    let text = raw;
    text = text.replace(/^(tentu|berikut|ini|halo|hi|here is|here's|pasti|baik).*?\n+/i, '');
    text = text.replace(/^```markdown\n?/i, '').replace(/\n?```$/i, '');
    text = text.replace(/[#@*]/g, '');
    text = text.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, '');
    text = text.replace(/([^\n])\n(\[[A-Z0-9 _\-&]+\])/g, '$1\n\n$2');
    return text.replace(/\n{3,}/g, '\n\n').trim();
  };

  const flashNotice = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg((prev) => (prev === msg ? '' : prev)), 3200);
  };

  // AI Wizard Auto-Fill
  const handleRunWizard = async (overrideInput?: string) => {
    const activeInput = typeof overrideInput === 'string' ? overrideInput : wizardInput;
    if (!activeInput.trim()) return;
    setErrorBanner(null);
    setIsWizardLoading(true);
    try {
      const res = await fetch('/api/gemini/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: activeInput.trim(), customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setFormData({
          title: d.title || formData.title,
          category: d.category || 'Development',
          subCategory: d.subCategory || '',
          aiModel: d.aiModel || 'Gemini 4 Hydrogen',
          language: d.language || 'Indonesian',
          programmingLanguage: d.programmingLanguage || '',
          framework: d.framework || '',
          database: d.database || '',
          platform: d.platform || '',
          stylePrompt: d.stylePrompt || 'Direct All-in-One (Langsung Jadi & Lengkap)',
          designTheme: d.designTheme || formData.designTheme || 'Clean Minimalist Modern UI',
          tone: d.tone || 'Professional & Technical',
          outputLanguage: d.outputLanguage || 'Indonesian',
          creativity: d.creativity || 'Balanced (0.7)',
          length: d.length || 'Full Complete Solution',
          targetAudience: d.targetAudience || '',
          description: d.description || '',
          additionalReqs: d.additionalReqs || '',
          negativePrompt: d.negativePrompt || '',
          expectedOutput: d.expectedOutput || '',
          reference: '',
        });
        if (data.qualityControl) setQualityControl(data.qualityControl);
        if (Array.isArray(data.assumptions)) setAssumptionsList(data.assumptions);
        if (Array.isArray(data.clarifications)) setClarificationsList(data.clarifications);
        flashNotice('Form terisi otomatis. Klik Generate Prompt untuk mulai.');
      } else {
        setErrorBanner(data.error || 'Gagal memproses Auto-Fill.');
      }
    } catch (err: any) {
      console.error('Wizard error', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsWizardLoading(false);
    }
  };

  const handleVoiceTranscribed = (transcript: string, shouldAutoFill: boolean) => {
    const nextText = wizardInput.trim() ? `${wizardInput.trim()}\n${transcript}` : transcript;
    setWizardInput(nextText);
    if (shouldAutoFill) {
      void handleRunWizard(nextText);
    } else {
      flashNotice('Suara berhasil ditranskrip ke kotak ide.');
    }
  };

  const handleCleanUpPrompt = () => {
    if (!generatedPrompt) return;
    setGeneratedPrompt(sanitizeCleanPromptText(generatedPrompt));
    setIsToolsMenuOpen(false);
    flashNotice('Format prompt dibersihkan.');
  };

  const handleInjectAntiMetaDirective = () => {
    if (!generatedPrompt) return;
    setIsToolsMenuOpen(false);
    const directiveHeader = '[MANDATORY DIRECTIVE: LANGSUNG EKSEKUSI SOLUSI & DILARANG MEMBUAT PROMPT BARU]';
    if (generatedPrompt.includes(directiveHeader)) {
      flashNotice('Klausul Anti-Meta sudah aktif.');
      return;
    }

    const directiveBlock = `${directiveHeader}
1. DILARANG membuatkan prompt baru atau saran prompt.
2. DILARANG basa-basi pembuka dan DILARANG bertanya balik minta konfirmasi.
3. LANGSUNG eksekusi solusi lengkap dari awal sampai akhir pada respon pertama.

`;

    let updated = generatedPrompt;
    const roleMatch = updated.match(/(\[ROLE[^\]]*\][^\n]*\n(?:[^\n]+\n)*)/i);
    if (roleMatch && roleMatch[0]) {
      updated = updated.replace(roleMatch[0], `${roleMatch[0]}\n${directiveBlock}`);
    } else {
      updated = `${directiveBlock}${updated}`;
    }

    setGeneratedPrompt(sanitizeCleanPromptText(updated));
    flashNotice('Klausul Anti-Meta disisipkan.');
  };

  // Real-Time SSE Streaming Master Prompt Generator
  const handleGeneratePrompt = async () => {
    setErrorBanner(null);
    setIsGenerating(true);
    setIsStreaming(true);
    setActiveOutputTab('prompt');
    setIsPreviewMode(false);
    setActiveVariantId(null);

    const effectiveForm: FormState =
      !formData.title.trim() && !formData.description.trim() && wizardInput.trim()
        ? { ...formData, title: wizardInput.trim().slice(0, 80), description: wizardInput.trim() }
        : formData;

    const requestPayload = { ...effectiveForm, customKeys: getCustomApiKeys() };

    try {
      const res = await fetch('/api/gemini/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!res.ok || !res.body) {
        const fallbackRes = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });
        const data = await fallbackRes.json();
        if (data.success && data.generatedPrompt) {
          setGeneratedPrompt(sanitizeCleanPromptText(data.generatedPrompt));
          if (data.qualityControl) setQualityControl(data.qualityControl);
          if (Array.isArray(data.assumptions)) setAssumptionsList(data.assumptions);
          if (Array.isArray(data.clarifications)) setClarificationsList(data.clarifications);
        } else {
          setErrorBanner(data.error || 'Gagal menghasilkan prompt.');
        }
        return;
      }

      setGeneratedPrompt('');
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let streamedText = '';
      let receivedDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const rawEvent of events) {
          const line = rawEvent.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const evt = JSON.parse(jsonStr);
            if (evt.type === 'chunk' && typeof evt.text === 'string') {
              streamedText += evt.text;
              setGeneratedPrompt(streamedText);
            } else if (evt.type === 'done') {
              receivedDone = true;
              const finalText = sanitizeCleanPromptText(evt.generatedPrompt || streamedText);
              setGeneratedPrompt(finalText);
              if (evt.qualityControl) setQualityControl(evt.qualityControl);
              if (Array.isArray(evt.assumptions)) setAssumptionsList(evt.assumptions);
              if (Array.isArray(evt.clarifications)) setClarificationsList(evt.clarifications);
            } else if (evt.type === 'error') {
              setErrorBanner(evt.error || 'Gagal melakukan streaming prompt.');
            }
          } catch {
            // Ignore partial chunk JSON parse error
          }
        }
      }

      if (!receivedDone && streamedText.trim()) {
        setGeneratedPrompt(sanitizeCleanPromptText(streamedText));
      }
    } catch (err: any) {
      console.error('Generate prompt stream error', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsStreaming(false);
      setIsGenerating(false);
    }
  };

  // Multi-Variant 3-Strategy Prompt Generator
  const handleGenerateVariants = async () => {
    setErrorBanner(null);
    setIsGeneratingVariants(true);
    setActiveOutputTab('prompt');
    setIsPreviewMode(false);
    try {
      const effectiveForm: FormState =
        !formData.title.trim() && !formData.description.trim() && wizardInput.trim()
          ? { ...formData, title: wizardInput.trim().slice(0, 80), description: wizardInput.trim() }
          : formData;

      const res = await fetch('/api/gemini/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...effectiveForm, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.variants) && data.variants.length > 0) {
        setPromptVariants(data.variants);
        const first: PromptStrategyVariant = data.variants[0];
        setActiveVariantId(first.id);
        setGeneratedPrompt(sanitizeCleanPromptText(first.prompt));
        if (first.qualityControl) setQualityControl(first.qualityControl);
        if (Array.isArray(data.assumptions)) setAssumptionsList(data.assumptions);
        if (Array.isArray(data.clarifications)) setClarificationsList(data.clarifications);
        flashNotice('3 variasi strategi siap dibandingkan.');
      } else {
        setErrorBanner(data.error || 'Gagal menyusun 3 variasi strategi.');
      }
    } catch (err: any) {
      console.error('Generate variants error', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  const handleSelectVariant = (variant: PromptStrategyVariant) => {
    setActiveVariantId(variant.id);
    setGeneratedPrompt(sanitizeCleanPromptText(variant.prompt));
    if (variant.qualityControl) setQualityControl(variant.qualityControl);
    setActiveOutputTab('prompt');
  };

  const handleInsertVariableToken = () => {
    const clean = normalizeVarName(newVarName);
    if (!clean) return;
    const token = `{{${clean}}}`;
    setGeneratedPrompt((prev) => (prev ? `${prev}\n${token}` : token));
    setNewVarName('');
    setIsVarPanelOpen(true);
  };

  const handlePermanentInjectVariables = () => {
    if (!generatedPrompt || filledVariableCount === 0) return;
    setUndoInjectSnapshot(generatedPrompt);
    setGeneratedPrompt(resolvedPrompt);
    setIsPreviewMode(false);
    flashNotice(`${filledVariableCount} variabel diterapkan.`);
  };

  const handleUndoInject = () => {
    if (!undoInjectSnapshot) return;
    setGeneratedPrompt(undoInjectSnapshot);
    setUndoInjectSnapshot(null);
    flashNotice('Injeksi variabel dibatalkan.');
  };

  const handleAutoPolish = async () => {
    if (!generatedPrompt) return;
    setIsToolsMenuOpen(false);
    setErrorBanner(null);
    setIsRefining(true);
    try {
      const res = await fetch('/api/gemini/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: generatedPrompt,
          goal: 'Tingkatkan akurasi direktif, hilangkan placeholder, dan perketat klausul eksekusi langsung',
          customKeys: getCustomApiKeys(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.optimizedPrompt) {
        setGeneratedPrompt(sanitizeCleanPromptText(data.data.optimizedPrompt));
        flashNotice('Prompt berhasil disempurnakan.');
      } else {
        setErrorBanner(data.error || 'Gagal menyempurnakan prompt.');
      }
    } catch (err: any) {
      console.error('Auto polish error', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsRefining(false);
    }
  };

  const handlePresetPrompt = (
    type: 'saas' | 'ecommerce' | 'ai_agent' | 'fintech' | 'seo' | 'academic' | 'design' | 'data' | 'legal' | 'game'
  ) => {
    const templates: Record<string, Partial<FormState>> = {
      saas: {
        title: 'SaaS Multi-Tenant Platform (Clean Architecture)',
        category: 'Development',
        subCategory: 'Backend Architecture',
        aiModel: 'Gemini 4 Hydrogen',
        description: 'Merancang backend B2B SaaS dengan Multi-Tenancy, RBAC, billing Stripe, dan analytics dashboard.',
        expectedOutput: 'Struktur folder modular, skema migrasi, service layer, dan REST controller lengkap.',
        framework: 'Next.js 15 / Laravel 11',
        programmingLanguage: 'TypeScript / PHP 8.3',
        database: 'PostgreSQL + Redis',
      },
      ecommerce: {
        title: 'Mobile E-Commerce Marketplace App',
        category: 'Development',
        subCategory: 'Mobile App',
        description: 'Aplikasi E-Commerce Multi-Vendor mencakup katalog, payment gateway, tracking logistik, dan review.',
        expectedOutput: 'Arsitektur Clean Flutter/React Native, state management, API services, dan ERD database.',
        framework: 'Flutter / React Native',
        programmingLanguage: 'Dart / TypeScript',
        database: 'PostgreSQL + Redis',
      },
      ai_agent: {
        title: 'Autonomous AI Agent & RAG Pipeline',
        category: 'AI Agent',
        subCategory: 'Generative AI & RAG',
        description: 'Arsitektur AI Agent dengan Retrieval-Augmented Generation (RAG), hybrid vector search, dan tool calling guardrails.',
        expectedOutput: 'System prompt arsitektur, strategi chunking, vector indexing, tool schema, dan fallback handler.',
        framework: 'LangChain / Python',
        programmingLanguage: 'Python / TypeScript',
        database: 'Qdrant / pgvector',
      },
      fintech: {
        title: 'Sistem Pembayaran Digital & Audit Keamanan PCI-DSS',
        category: 'CyberSec',
        subCategory: 'Fintech & Security',
        description: 'Sistem keuangan digital dengan KYC verification, fraud detection, dan dual-authorization transfer flow.',
        expectedOutput: 'Security audit matrix, protokol enkripsi AES-256, dan acceptance criteria.',
        framework: 'NestJS / Go',
        programmingLanguage: 'TypeScript / Go',
        database: 'PostgreSQL',
      },
      seo: {
        title: 'Artikel SEO Long-Form & Copywriting',
        category: 'Content',
        subCategory: 'SEO & Copywriting',
        description: 'Artikel blog SEO 2.000 kata berperingkat tinggi dengan LSI keywords, struktur H1-H3, dan CTA kuat.',
        expectedOutput: 'Artikel lengkap dengan FAQ schema, internal linking, dan meta description.',
        framework: 'AIDA / PAS Framework',
      },
      academic: {
        title: 'Asisten Riset Akademik & Review Jurnal',
        category: 'Academic',
        subCategory: 'Riset & Metodologi',
        description: 'Evaluasi metodologi penelitian, tinjauan pustaka, perumusan hipotesis, dan verifikasi sitasi ilmiah.',
        expectedOutput: 'Matriks kajian pustaka, evaluasi kritis metodologi, dan kerangka penulisan ilmiah.',
      },
      design: {
        title: 'UI/UX Design System & Visual Prompt',
        category: 'Design',
        subCategory: 'UI/UX Design',
        description: 'Panduan Design System UI mencakup tipografi, spacing grid, dan spesifikasi komponen modern.',
        expectedOutput: 'Design tokens Tailwind CSS dan spesifikasi komponen aksesibel.',
        framework: 'Tailwind CSS',
      },
      data: {
        title: 'Query SQL Kompleks & ETL Pipeline Python',
        category: 'Data Science',
        subCategory: 'Data Engineering',
        description: 'Perancangan data warehouse (Star Schema), query SQL Window Functions, dan script ETL Python.',
        expectedOutput: 'Query SQL teroptimasi, script Python ETL, dan rekomendasi visualisasi BI.',
        programmingLanguage: 'Python / SQL',
        database: 'BigQuery / PostgreSQL',
      },
      legal: {
        title: 'Draf Kontrak Kerja Sama (MOU & NDA)',
        category: 'Legal',
        subCategory: 'Legal Drafting',
        description: 'Penyusunan surat perjanjian kerja sama lengkap dengan pasal perlindungan HAKI dan penyelesaian sengketa.',
        expectedOutput: 'Draf dokumen hukum terstruktur dalam format pasal resmi dan ringkasan risiko.',
      },
      game: {
        title: 'Worldbuilding RPG Lore & Quest Design',
        category: 'Game Dev',
        subCategory: 'Game Design',
        description: 'Perancangan dunia game RPG mencakup faksi, dialog branching NPC, dan combat stat balancing.',
        expectedOutput: 'Dokumen GDD, pohon dialog JSON, tabel balancing, dan main quest sequence.',
        framework: 'Unity / Unreal Engine',
      },
    };

    const t = templates[type];
    if (!t) return;
    setFormData((prev) => ({ ...prev, ...t }));
    flashNotice(`Preset "${t.title}" dimuat.`);
  };

  const handleResetForm = async () => {
    setFormData(DEFAULT_FORM);
    setWizardInput('');
    setGeneratedPrompt('');
    setQualityControl(null);
    setPromptVariants([]);
    setActiveVariantId(null);
    setVariableValues({});
    setUndoInjectSnapshot(null);
    setErrorBanner(null);
    if (userId) {
      try {
        await deleteWorkspaceDoc(userId, 'generator_draft');
        lastSavedDigestRef.current = JSON.stringify({
          formData: DEFAULT_FORM,
          generatedPrompt: '',
          variableValues: {},
          draftHistoryCount: draftHistory.length,
        });
      } catch (err) {
        console.error('Failed to clear generator draft in Firebase:', err);
      }
    }
  };

  const handleCopy = () => {
    const text = resolvedPrompt || generatedPrompt;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSaveToLibrary = () => {
    const contentToSave = resolvedPrompt || generatedPrompt;
    if (!contentToSave.trim()) {
      setErrorBanner('Belum ada prompt untuk disimpan.');
      return;
    }
    const newPromptItem: PromptItem = {
      id: `prompt-${Date.now()}`,
      title: formData.title || 'Untitled Prompt',
      category: formData.category,
      subCategory: formData.subCategory,
      aiModel: formData.aiModel,
      language: formData.language,
      programmingLanguage: formData.programmingLanguage,
      framework: formData.framework,
      database: formData.database,
      platform: formData.platform,
      stylePrompt: formData.stylePrompt,
      designTheme: formData.designTheme,
      tone: formData.tone,
      outputLanguage: formData.outputLanguage,
      creativity: formData.creativity,
      length: formData.length,
      targetAudience: formData.targetAudience,
      description: formData.description,
      additionalReqs: formData.additionalReqs,
      negativePrompt: formData.negativePrompt,
      expectedOutput: formData.expectedOutput,
      reference: formData.reference,
      content: contentToSave,
      isFavorite,
      isPinned: false,
      collectionId: selectedCollectionId || null,
      tags: [formData.category, formData.framework, formData.aiModel].filter(Boolean),
      score: qualityControl?.overallScore || 96,
      scoreDetail: null,
      qualityControl: qualityControl || null,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSavePrompt(newPromptItem);
    setIsSaveMenuOpen(false);
    flashNotice('Prompt tersimpan di Library.');
  };

  const handleDownloadFile = (ext: 'md' | 'txt' | 'json') => {
    const text = resolvedPrompt || generatedPrompt;
    if (!text) return;
    const content =
      ext === 'json'
        ? JSON.stringify(
            {
              title: formData.title || 'Untitled Prompt',
              createdAt: new Date().toISOString(),
              formParameters: formData,
              variableValues,
              promptText: text,
            },
            null,
            2
          )
        : text;
    const mime =
      ext === 'md' ? 'text/markdown' : ext === 'json' ? 'application/json' : 'text/plain';
    const element = document.createElement('a');
    element.href = URL.createObjectURL(new Blob([content], { type: mime }));
    element.download = `${(formData.title || 'prompt').toLowerCase().replace(/\s+/g, '-')}.${ext}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setIsToolsMenuOpen(false);
  };

  const handlePrintPDF = () => {
    const textToPrint = resolvedPrompt || generatedPrompt;
    if (!textToPrint) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const safeTitle = (formData.title || 'Prompt Export').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeBody = textToPrint.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>${safeTitle}</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 36px; line-height: 1.6; color: #0f172a; }
              h1 { font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
              pre { background: #f8fafc; padding: 16px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 12px; }
            </style>
          </head>
          <body><h1>${safeTitle}</h1><pre>${safeBody}</pre></body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 250);
    } else {
      document.body.removeChild(iframe);
    }
    setIsToolsMenuOpen(false);
  };

  const handleRestoreDraft = (draft: { formData: FormState; promptText: string }) => {
    setFormData({ ...DEFAULT_FORM, ...draft.formData });
    setGeneratedPrompt(draft.promptText);
    setIsDraftHistoryOpen(false);
  };

  const handleClearDraftHistory = async () => {
    setDraftHistory([]);
    if (userId) {
      try {
        await saveWorkspaceDoc(userId, 'generator_draft', {
          formData,
          generatedPrompt,
          variableValues,
          draftHistory: [],
        });
      } catch (err) {
        console.error('Failed to clear draft history in Firebase:', err);
      }
    }
  };

  const activeText = isPreviewMode ? resolvedPrompt : generatedPrompt;
  const wordCount = activeText.trim() ? activeText.trim().split(/\s+/).length : 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Inline Status Alerts */}
      {errorBanner && (
        <div className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </span>
          <button type="button" onClick={() => setErrorBanner(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </span>
          <button type="button" onClick={() => setSaveSuccessMsg('')} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Compact Quick Idea & Voice Auto-Fill Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="wizard-input-field"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Ide Cepat (Tulis atau Rekam Suara untuk Auto-Fill)
          </label>
          {wizardInput.trim() && (
            <button
              type="button"
              onClick={() => setWizardInput('')}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Hapus
            </button>
          )}
        </div>

        <textarea
          rows={2}
          value={wizardInput}
          onChange={(e) => setWizardInput(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              void handleRunWizard();
            }
          }}
          placeholder="Contoh: Buatkan sistem SaaS manajemen inventaris dengan Next.js, PostgreSQL, dan role admin..."
          className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-y min-h-[64px] max-h-[180px] focus:outline-none focus:border-emerald-500 leading-relaxed"
          id="wizard-input-field"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <VoiceAutoFillButton
            onTranscribed={handleVoiceTranscribed}
            disabled={isWizardLoading}
            accentColor="emerald"
            defaultAutoFill={true}
            placeholderHint="Bicara untuk mengisi ide dan form secara otomatis"
          />

          <button
            type="button"
            onClick={() => void handleRunWizard()}
            disabled={isWizardLoading || !wizardInput.trim()}
            id="run-wizard-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
          >
            {isWizardLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Mengisi Form...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Auto-Fill Form</span>
              </>
            )}
          </button>
        </div>

        {!wizardInput.trim() && !generatedPrompt && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 overflow-x-auto scrollbar-none">
            <span className="shrink-0">Contoh:</span>
            {[
              'SaaS B2B Laravel 11 + PostgreSQL',
              'Artikel SEO 2000 kata',
              'AI Agent & RAG Pipeline',
              'Audit Skripsi & Metodologi',
            ].map((idea, idx) => (
              <React.Fragment key={idea}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <button
                  type="button"
                  onClick={() => setWizardInput(idea)}
                  className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {idea}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Main 2-Column Workspace: Clean Form (5 cols) + Spacious Output (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Essential Form + Collapsible Advanced */}
        <div
          id="form-builder-section"
          className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-heading font-semibold text-slate-900 dark:text-slate-100">
              Detail Prompt
            </h3>

            <div className="flex items-center gap-2">
              <select
                aria-label="Muat Preset Domain"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handlePresetPrompt(e.target.value as any);
                    e.target.value = '';
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Muat Preset...</option>
                <option value="saas">SaaS B2B</option>
                <option value="seo">Artikel SEO</option>
                <option value="ai_agent">AI Agent &amp; RAG</option>
                <option value="academic">Skripsi &amp; Riset</option>
                <option value="design">UI &amp; Design System</option>
                <option value="data">SQL &amp; Data</option>
                <option value="ecommerce">E-Commerce</option>
                <option value="fintech">Fintech Security</option>
                <option value="legal">Draf Hukum</option>
                <option value="game">Game Dev</option>
              </select>

              {draftHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDraftHistoryOpen(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={`Riwayat Draft (${draftHistory.length})`}
                >
                  <History className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Essential Fields */}
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Judul Prompt
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Misal: Arsitektur Backend SaaS Multi-Tenant"
                className="w-full px-3 py-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Kategori
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Development">Development</option>
                  <option value="Content">Content &amp; SEO</option>
                  <option value="AI Agent">AI Agent</option>
                  <option value="Design">Design &amp; UI/UX</option>
                  <option value="Business">Business &amp; PRD</option>
                  <option value="Academic">Academic</option>
                  <option value="Data Science">Data Science</option>
                  <option value="CyberSec">CyberSec</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Legal">Legal</option>
                  <option value="Game Dev">Game Dev</option>
                  <option value="Custom">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bahasa Output
                </label>
                <select
                  name="outputLanguage"
                  value={formData.outputLanguage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Indonesian">Indonesia</option>
                  <option value="English">English</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi Utama
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Jelaskan apa yang ingin dibuat atau diselesaikan..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Kebutuhan Tambahan <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <textarea
                name="additionalReqs"
                rows={2}
                value={formData.additionalReqs}
                onChange={handleInputChange}
                placeholder="Fitur spesifik, aturan teknis, atau {{variabel}}..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            {/* Collapsible Advanced Options */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Opsi Lanjutan</span>
                  {advancedFilledCount > 0 && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                      ({advancedFilledCount} terisi)
                    </span>
                  )}
                </span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Target AI Model
                      </label>
                      <select
                        name="aiModel"
                        value={formData.aiModel}
                        onChange={handleInputChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Gemini 4 Hydrogen">Gemini 4 Hydrogen</option>
                        <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                        <option value="GPT-4o">GPT-4o</option>
                        <option value="DeepSeek V3">DeepSeek V3</option>
                        <option value="Universal AI">Universal AI</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Gaya Prompt
                      </label>
                      <select
                        name="stylePrompt"
                        value={formData.stylePrompt}
                        onChange={handleInputChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Direct All-in-One (Langsung Jadi & Lengkap)">Direct All-in-One</option>
                        <option value="Step-by-Step">Step-by-Step</option>
                        <option value="Roleplay / Persona">Roleplay / Persona</option>
                        <option value="Few-Shot">Few-Shot Examples</option>
                        <option value="Instruction-Based">Instruction-Based</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Bahasa Pemrograman
                      </label>
                      <input
                        type="text"
                        name="programmingLanguage"
                        value={formData.programmingLanguage}
                        onChange={handleInputChange}
                        placeholder="TypeScript, PHP, Python..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Framework
                      </label>
                      <input
                        type="text"
                        name="framework"
                        value={formData.framework}
                        onChange={handleInputChange}
                        placeholder="Next.js, Laravel, React..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Database
                      </label>
                      <input
                        type="text"
                        name="database"
                        value={formData.database}
                        onChange={handleInputChange}
                        placeholder="PostgreSQL, Firebase..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Platform
                      </label>
                      <input
                        type="text"
                        name="platform"
                        value={formData.platform}
                        onChange={handleInputChange}
                        placeholder="Web, Mobile, API..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Tone
                      </label>
                      <select
                        name="tone"
                        value={formData.tone}
                        onChange={handleInputChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Professional & Technical">Professional &amp; Technical</option>
                        <option value="Direct & Concise">Direct &amp; Concise</option>
                        <option value="Educational & Detailed">Educational &amp; Detailed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Tema UI
                      </label>
                      <input
                        type="text"
                        name="designTheme"
                        value={formData.designTheme}
                        onChange={handleInputChange}
                        placeholder="Clean Minimalist..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Hal yang Harus Dihindari (Negative Prompt)
                    </label>
                    <input
                      type="text"
                      name="negativePrompt"
                      value={formData.negativePrompt}
                      onChange={handleInputChange}
                      placeholder="Kode terpotong, TODO comments, basa-basi..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Expected Output
                    </label>
                    <input
                      type="text"
                      name="expectedOutput"
                      value={formData.expectedOutput}
                      onChange={handleInputChange}
                      placeholder="Struktur kode, skema database, dokumentasi..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clean Primary Action Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-2.5 py-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateVariants}
                disabled={isGenerating || isGeneratingVariants}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                title="Buat 3 variasi strategi sekaligus"
              >
                {isGeneratingVariants ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )}
                <span>{isGeneratingVariants ? 'Menyusun...' : '3 Variasi'}</span>
              </button>

              <button
                type="button"
                onClick={handleGeneratePrompt}
                disabled={isGenerating || isGeneratingVariants}
                id="generate-prompt-submit-btn"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs disabled:opacity-50 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isStreaming ? 'Menulis...' : 'Generate Prompt'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Spacious Clean Prompt Output Panel (7 cols) */}
        <div
          id="preview-prompt-panel"
          className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col min-h-[520px] lg:h-[680px]"
        >
          {/* Output Header: Tabs + Compact Action Controls */}
          <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
            {/* Segmented Output Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveOutputTab('prompt')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeOutputTab === 'prompt'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Hasil Prompt
              </button>
              <button
                type="button"
                onClick={() => setActiveOutputTab('audit')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeOutputTab === 'audit'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Audit{qualityControl ? ` (${qualityControl.overallScore})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setActiveOutputTab('assumptions')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeOutputTab === 'assumptions'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Asumsi
              </button>
              <button
                type="button"
                onClick={() => setActiveOutputTab('clarifications')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeOutputTab === 'clarifications'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Klarifikasi
              </button>
            </div>

            {/* Clean Action Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!generatedPrompt}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                title="Salin Prompt"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Disalin' : 'Salin'}</span>
              </button>

              {onNavigateToPlayground && (
                <button
                  type="button"
                  onClick={() => onNavigateToPlayground(resolvedPrompt || generatedPrompt)}
                  disabled={!generatedPrompt}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Uji di Playground"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Uji</span>
                </button>
              )}

              {/* Save Popover */}
              <div className="relative" ref={saveMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (collections.length === 0) {
                      handleSaveToLibrary();
                    } else {
                      setIsSaveMenuOpen(!isSaveMenuOpen);
                    }
                  }}
                  disabled={!generatedPrompt}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>

                {isSaveMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 z-30 space-y-2.5 text-xs">
                    <label className="block font-medium text-slate-700 dark:text-slate-300">
                      Simpan ke Folder
                    </label>
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="">Tanpa Folder</option>
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setIsFavorite(!isFavorite)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                          isFavorite ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500' : ''}`} />
                        <span>Favorit</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveToLibrary}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                      >
                        Konfirmasi
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Consolidated Tools & Export Dropdown */}
              <div className="relative" ref={toolsMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                  disabled={!generatedPrompt}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Alat & Export"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {isToolsMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1.5 z-30 space-y-0.5 text-xs">
                    <button
                      type="button"
                      onClick={handleAutoPolish}
                      disabled={isRefining}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isRefining ? 'Menyempurnakan...' : 'Refine dengan AI'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleInjectAntiMetaDirective}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sisipkan Anti-Meta</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCleanUpPrompt}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                      <span>Bersihkan Simbol</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenScoreModal(generatedPrompt, formData.title);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Audit Kualitas AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenOptimizerModal(generatedPrompt);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                      <span>Buka Optimizer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenTranslatorModal(generatedPrompt);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      <span>Terjemahkan</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={() => handleDownloadFile('md')}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Unduh Markdown (.md)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile('txt')}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-slate-400" />
                      <span>Unduh Teks (.txt)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile('json')}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Unduh JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintPDF}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cetak / PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TAB 1: MASTER PROMPT EDITOR */}
          {activeOutputTab === 'prompt' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
              {/* 3-Strategy Variant Switcher (only shown when variants exist) */}
              {promptVariants.length > 0 && (
                <div className="flex items-center justify-between gap-2 pb-1">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {promptVariants.map((variant) => {
                      const isSelected = activeVariantId === variant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => handleSelectVariant(variant)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 text-slate-900 dark:text-slate-100'
                              : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold truncate">{variant.label}</span>
                            <span className="text-[10px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 shrink-0">
                              {variant.qualityScore}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPromptVariants([]);
                      setActiveVariantId(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Tutup variasi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Dynamic {{variable}} Injector (only shown when variables detected) */}
              {(detectedVariables.length > 0 || undoInjectSnapshot) && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsVarPanelOpen(!isVarPanelOpen)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Braces className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Variabel ({filledVariableCount}/{detectedVariables.length})
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isVarPanelOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {detectedVariables.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsPreviewMode(!isPreviewMode)}
                          className="px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          {isPreviewMode ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{isPreviewMode ? 'Edit' : 'Preview'}</span>
                        </button>
                      )}
                      {filledVariableCount > 0 && (
                        <button
                          type="button"
                          onClick={handlePermanentInjectVariables}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Terapkan
                        </button>
                      )}
                      {undoInjectSnapshot && (
                        <button
                          type="button"
                          onClick={handleUndoInject}
                          className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>Undo</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isVarPanelOpen && detectedVariables.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 overflow-y-auto">
                      {detectedVariables.map((varName) => (
                        <input
                          key={varName}
                          type="text"
                          value={variableValues[varName] || ''}
                          onChange={(e) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [varName]: e.target.value,
                            }))
                          }
                          placeholder={`${formatVarLabel(varName)} ({{${varName}}})`}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Editor Area */}
              <div className="flex-1 flex flex-col rounded-lg vscode-editor-bg border border-slate-800 overflow-hidden min-h-[360px]">
                {isPreviewMode ? (
                  <pre className="flex-1 w-full h-full p-4 bg-transparent text-emerald-100 font-mono text-[13px] leading-relaxed overflow-y-auto whitespace-pre-wrap">
                    {resolvedPrompt}
                  </pre>
                ) : (
                  <textarea
                    value={generatedPrompt}
                    onChange={(e) => setGeneratedPrompt(e.target.value)}
                    className="flex-1 w-full h-full p-4 bg-transparent text-slate-100 font-mono text-[13px] leading-relaxed resize-none focus:outline-none"
                    placeholder="Hasil prompt akan tampil langsung di sini saat Anda klik Generate Prompt..."
                  />
                )}

                {/* Quiet Footer Bar */}
                <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 gap-2 shrink-0">
                  <div className="flex items-center gap-2 tabular-nums">
                    <span>{activeText.length} karakter</span>
                    <span aria-hidden="true">·</span>
                    <span>{wordCount} kata</span>
                    <span aria-hidden="true">·</span>
                    <span>~{Math.ceil(activeText.length / 4)} token</span>
                    {isStreaming && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400">Menulis...</span>
                      </>
                    )}
                  </div>

                  {/* Subtle Inline Variable Adder */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newVarName}
                      onChange={(e) => setNewVarName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleInsertVariableToken();
                        }
                      }}
                      placeholder="+ variabel"
                      className="w-24 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    {newVarName.trim() && (
                      <button
                        type="button"
                        onClick={handleInsertVariableToken}
                        className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold inline-flex items-center cursor-pointer"
                        title="Sisipkan {{variabel}}"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT */}
          {activeOutputTab === 'audit' && (
            <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              {qualityControl ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-sm font-heading font-semibold text-slate-900 dark:text-slate-100">
                        Skor Kualitas Prompt
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {qualityControl.rating}
                      </p>
                    </div>
                    <span className="text-xl font-heading font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {qualityControl.overallScore}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Kejelasan', score: qualityControl.dimensions?.clarity ?? qualityControl.clarityScore ?? 96 },
                      { label: 'Kelengkapan', score: qualityControl.dimensions?.completeness ?? qualityControl.completenessScore ?? 94 },
                      { label: 'Spesifisitas', score: qualityControl.dimensions?.specificity ?? qualityControl.specificityScore ?? 96 },
                      { label: 'Konsistensi', score: qualityControl.dimensions?.consistency ?? qualityControl.consistencyScore ?? 96 },
                      { label: 'Konteks', score: qualityControl.dimensions?.context ?? qualityControl.contextAccuracy ?? 94 },
                      { label: 'Batasan', score: qualityControl.dimensions?.constraints ?? qualityControl.constraintsScore ?? 96 },
                      { label: 'Format Output', score: qualityControl.dimensions?.outputDefinition ?? qualityControl.outputDefinitionScore ?? 95 },
                      { label: 'Resolusi Ambiguitas', score: qualityControl.dimensions?.ambiguityResolution ?? qualityControl.ambiguityResolutionScore ?? 94 },
                    ].map((dim) => (
                      <div key={dim.label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300">{dim.label}</span>
                          <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                            {dim.score}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, Math.max(10, dim.score))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {qualityControl.qualityHighlights && qualityControl.qualityHighlights.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <h5 className="font-semibold text-slate-800 dark:text-slate-200">Catatan Evaluasi</h5>
                      <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                        {qualityControl.qualityHighlights.map((h, i) => (
                          <li key={i}>· {h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-16 text-center text-slate-400 space-y-1">
                  <p className="font-medium text-slate-500">Belum ada hasil audit.</p>
                  <p>Skor evaluasi otomatis muncul setelah Anda generate prompt.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ASSUMPTIONS */}
          {activeOutputTab === 'assumptions' && (
            <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
              {(assumptionsList.length > 0 || (qualityControl?.assumptions?.length ?? 0) > 0) ? (
                <ol className="space-y-2.5 list-decimal list-inside text-slate-700 dark:text-slate-300 leading-relaxed">
                  {(assumptionsList.length > 0 ? assumptionsList : qualityControl?.assumptions || []).map(
                    (asmp, idx) => (
                      <li key={idx} className="pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        {asmp}
                      </li>
                    )
                  )}
                </ol>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  Tidak ada asumsi tambahan yang perlu ditampilkan.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLARIFICATIONS */}
          {activeOutputTab === 'clarifications' && (
            <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
              {(clarificationsList.length > 0 || (qualityControl?.clarificationsNeeded?.length ?? 0) > 0) ? (
                <ol className="space-y-2.5 list-decimal list-inside text-slate-700 dark:text-slate-300 leading-relaxed">
                  {(clarificationsList.length > 0
                    ? clarificationsList
                    : qualityControl?.clarificationsNeeded || []
                  ).map((clr, idx) => (
                    <li key={idx} className="pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      {clr}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  Tidak ada klarifikasi mendesak. Spesifikasi sudah jelas.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Draft History Modal */}
      {isDraftHistoryOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsDraftHistoryOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-heading font-semibold text-slate-900 dark:text-slate-100">
                Riwayat Draft
              </h3>
              <div className="flex items-center gap-2">
                {draftHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearDraftHistory}
                    className="text-xs text-slate-400 hover:text-red-500 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDraftHistoryOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex-1 text-xs">
              {draftHistory.length === 0 ? (
                <div className="py-10 text-center text-slate-400 space-y-2">
                  <Clock className="w-6 h-6 mx-auto opacity-50" />
                  <p>Belum ada riwayat draft.</p>
                </div>
              ) : (
                draftHistory.map((ver) => (
                  <div key={ver.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {ver.title}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {ver.timestamp} · {ver.promptText.length} karakter
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreDraft(ver)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium shrink-0 cursor-pointer"
                    >
                      Pulihkan
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
