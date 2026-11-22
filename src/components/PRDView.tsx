import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Save,
  Download,
  Code2,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Database,
  Globe,
  Shield,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  ListTodo,
  Workflow,
  Server,
  FileCode,
  Terminal,
  Table,
  ShieldAlert,
  Send,
  CheckSquare,
  Activity,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Braces,
  BookOpen,
  Plus,
  Undo2,
  Eye,
  Pencil,
  Search,
  X,
  Wand2,
} from 'lucide-react';
import { PRDFormState, PromptItem, Collection } from '../types';
import { getCustomApiKeys } from '../lib/storage';
import {
  saveWorkspaceDoc,
  deleteWorkspaceDoc,
  subscribeToWorkspaceDocRealtime,
  PRDDraftPayload,
  PRDDraftSnapshot,
} from '../lib/firebaseStorage';
import { VoiceAutoFillButton } from './VoiceAutoFillButton';
import {
  PROMPT_REQUIREMENT_TEMPLATES,
  PromptRequirementTemplate,
  PromptTemplateTechnique,
  extractBracketedVariables,
  injectVariablesIntoText,
  injectVariablesIntoForm,
  formatVariableLabel,
  getVariableMeta,
} from '../data/prdPromptTemplates';

interface PRDViewProps {
  userId: string;
  collections: Collection[];
  onSavePrompt: (prompt: PromptItem) => void;
  onNavigateToPlayground?: (promptText: string) => void;
}

const DEFAULT_PRD_FORM: PRDFormState = {
  productTitle: '',
  tagline: '',
  category: 'SaaS B2B Platform',
  targetAudience: 'Senior Engineers, Product Managers & Enterprise Teams',
  targetPlatform: 'Web Application (SaaS) & Responsive Mobile',
  problemStatement: '',
  keyFeatures: '',
  techStack: 'TypeScript, Next.js 15, Node.js / NestJS, PostgreSQL, Redis, Docker, Tailwind CSS',
  integrations: 'Payment Gateway (Stripe / Midtrans), Google OAuth 2.0, Cloud Storage S3, Realtime WebSockets',
  releasePhase: 'MVP Horizon (4-6 Minggu)',
  nonFunctionalReqs: 'Keamanan standar SOC2/OWASP Top 10, P99 Latency < 200ms, Uptime SLA 99.9%, Multi-tenant isolation',
  prdFormat: 'Comprehensive Enterprise PRD',
  language: 'Indonesian',
};

export const PRDView: React.FC<PRDViewProps> = ({
  userId,
  collections,
  onSavePrompt,
  onNavigateToPlayground,
}) => {
  const [formData, setFormData] = useState<PRDFormState>(DEFAULT_PRD_FORM);
  const [wizardInput, setWizardInput] = useState('');
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [isGeneratingPRD, setIsGeneratingPRD] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [activeSubAction, setActiveSubAction] = useState<string>('');
  const [generatedPRD, setGeneratedPRD] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const cloudHydratedRef = useRef(false);
  const lastSavedDigestRef = useRef<string>('');

  // Active Studio Mode Tab
  const [activeTab, setActiveTab] = useState<
    'document' | 'structure' | 'preview' | 'audit' | 'database' | 'api' | 'diagrams' | 'tickets'
  >('document');

  // Extended Data States from AI
  const [auditReport, setAuditReport] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  const [schemaData, setSchemaData] = useState<{ postgresSql: string; prismaSchema: string; typeScriptTypes: string } | null>(null);
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
  const [schemaSubTab, setSchemaSubTab] = useState<'postgres' | 'prisma' | 'typescript'>('postgres');

  const [apiSpecData, setApiSpecData] = useState<{ openApiJson: string; endpoints: any[] } | null>(null);
  const [isGeneratingApiSpec, setIsGeneratingApiSpec] = useState(false);
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState(0);

  const [diagramsData, setDiagramsData] = useState<{
    systemArchitectureMermaid: string;
    erdMermaid: string;
    sequenceJourneyMermaid: string;
  } | null>(null);
  const [isGeneratingDiagrams, setIsGeneratingDiagrams] = useState(false);
  const [diagramSubTab, setDiagramSubTab] = useState<'arch' | 'erd' | 'sequence'>('arch');

  const [ticketsData, setTicketsData] = useState<{ epics: any[]; csvData: string } | null>(null);
  const [isGeneratingTickets, setIsGeneratingTickets] = useState(false);

  // Inline AI Co-Pilot
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  // Dynamic Bracketed Variable Injection State (synced via Firebase Cloud)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [newVarNameInput, setNewVarNameInput] = useState('');
  const [editorViewMode, setEditorViewMode] = useState<'raw' | 'resolved'>('raw');
  const [preInjectSnapshot, setPreInjectSnapshot] = useState<{
    formData: PRDFormState;
    generatedPRD: string;
    variableValues: Record<string, string>;
  } | null>(null);
  const prdTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Prompt Requirement Templates Library State (collapsed by default for clean workspace)
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  const [selectedTechniqueFilter, setSelectedTechniqueFilter] = useState<'ALL' | PromptTemplateTechnique>('ALL');
  const [templateSearch, setTemplateSearch] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [autoSavedAt, setAutoSavedAt] = useState<string>('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isDraftHistoryOpen, setIsDraftHistoryOpen] = useState(false);

  const [draftHistory, setDraftHistory] = useState<PRDDraftSnapshot[]>([]);

  // Hydrate PRD draft state from Firebase Firestore once on mount
  useEffect(() => {
    if (!userId) return;
    cloudHydratedRef.current = false;
    const unsub = subscribeToWorkspaceDocRealtime<PRDDraftPayload>(userId, 'prd_draft', (payload) => {
      if (!cloudHydratedRef.current) {
        if (payload) {
          if (payload.formData) setFormData({ ...DEFAULT_PRD_FORM, ...payload.formData });
          if (typeof payload.generatedPRD === 'string') setGeneratedPRD(payload.generatedPRD);
          if (payload.variableValues) setVariableValues(payload.variableValues);
          if (payload.activeTemplateId !== undefined) setActiveTemplateId(payload.activeTemplateId);
          if (Array.isArray(payload.draftHistory)) setDraftHistory(payload.draftHistory);
          if (payload.updatedAtIso) {
            setAutoSavedAt(
              new Date(payload.updatedAtIso).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            );
          }
          lastSavedDigestRef.current = JSON.stringify({
            formData: payload.formData || DEFAULT_PRD_FORM,
            generatedPRD: payload.generatedPRD || '',
            variableValues: payload.variableValues || {},
            activeTemplateId: payload.activeTemplateId ?? null,
          });
        }
        cloudHydratedRef.current = true;
      }
    });
    return () => unsub();
  }, [userId]);

  // Automatically detect all {{bracketed_variables}} across both PRD document and form fields
  const detectedVariables = useMemo(
    () => extractBracketedVariables(generatedPRD, formData),
    [generatedPRD, formData]
  );

  const filledVariablesCount = useMemo(
    () =>
      detectedVariables.filter((v) => (variableValues[v.name] || '').trim().length > 0).length,
    [detectedVariables, variableValues]
  );

  const resolvedPRD = useMemo(
    () => injectVariablesIntoText(generatedPRD, variableValues),
    [generatedPRD, variableValues]
  );

  const resolvedFormData = useMemo(
    () => injectVariablesIntoForm(formData, variableValues),
    [formData, variableValues]
  );

  const hasActiveInjections = filledVariablesCount > 0;

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return PROMPT_REQUIREMENT_TEMPLATES.filter((tpl) => {
      const matchesTech = selectedTechniqueFilter === 'ALL' || tpl.technique === selectedTechniqueFilter;
      if (!matchesTech) return false;
      if (!query) return true;
      return (
        tpl.name.toLowerCase().includes(query) ||
        tpl.technique.toLowerCase().includes(query) ||
        tpl.description.toLowerCase().includes(query) ||
        tpl.useCase.toLowerCase().includes(query) ||
        tpl.variables.some((v) => v.name.toLowerCase().includes(query))
      );
    });
  }, [selectedTechniqueFilter, templateSearch]);

  // Auto-save draft to Firebase Cloud Firestore every 1.8 seconds on change
  useEffect(() => {
    if (!userId || !cloudHydratedRef.current) return;
    const digest = JSON.stringify({ formData, generatedPRD, variableValues, activeTemplateId });
    if (digest === lastSavedDigestRef.current) return;

    const timer = setTimeout(() => {
      const nowIso = new Date().toISOString();
      const nowTime = new Date(nowIso).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      let nextHistory = draftHistory;
      if (generatedPRD.trim()) {
        const last = draftHistory[0];
        if (!last || last.contentText !== generatedPRD || last.title !== formData.productTitle) {
          const newVer: PRDDraftSnapshot = {
            id: `prd-${Date.now()}`,
            timestamp: `${new Date().toLocaleDateString('id-ID')} ${nowTime}`,
            title: formData.productTitle || 'Untitled PRD',
            contentSnippet: generatedPRD.slice(0, 100) + '...',
            formData,
            contentText: generatedPRD,
          };
          nextHistory = [newVer, ...draftHistory].slice(0, 10);
          setDraftHistory(nextHistory);
        }
      }

      lastSavedDigestRef.current = digest;
      void saveWorkspaceDoc(userId, 'prd_draft', {
        formData,
        generatedPRD,
        variableValues,
        activeTemplateId,
        draftHistory: nextHistory,
        updatedAtIso: nowIso,
      }).then(() => {
        setAutoSavedAt(nowTime);
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [userId, formData, generatedPRD, variableValues, activeTemplateId, draftHistory]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sanitizeCleanText = (raw: string): string => {
    if (!raw) return '';
    let text = raw;
    text = text.replace(/^(tentu|berikut|ini|halo|hi|here is|here's|pasti|baik).*?\n+/i, '');
    text = text.replace(/^```markdown\n?/i, '').replace(/\n?```$/i, '');
    text = text.replace(/[#@*]/g, '');
    text = text.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, '');
    text = text.replace(/([^\n])\n(\[[A-Z0-9 _\-&]+\])/g, '$1\n\n$2');
    return text.replace(/\n{3,}/g, '\n\n').trim();
  };

  // AI PRD Auto-Fill Wizard (supports both typed and voice-transcribed input)
  const handleRunWizard = async (overrideInput?: string) => {
    const query = (overrideInput ?? wizardInput).trim();
    if (!query) return;
    setIsWizardLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/gemini/prd/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setFormData((prev) => ({
          productTitle: d.productTitle || prev.productTitle,
          tagline: d.tagline || prev.tagline,
          category: d.category || 'SaaS B2B Platform',
          targetAudience: d.targetAudience || prev.targetAudience,
          targetPlatform: d.targetPlatform || prev.targetPlatform,
          problemStatement: d.problemStatement || prev.problemStatement,
          keyFeatures: d.keyFeatures || prev.keyFeatures,
          techStack: d.techStack || prev.techStack,
          integrations: d.integrations || prev.integrations,
          releasePhase: d.releasePhase || prev.releasePhase,
          nonFunctionalReqs: d.nonFunctionalReqs || prev.nonFunctionalReqs,
          prdFormat: d.prdFormat || 'Comprehensive Enterprise PRD',
          language: prev.language,
        }));

        setSaveSuccessMsg('Parameter PRD berhasil dianalisis & diisi otomatis oleh AI!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setErrorBanner(data.error || 'Gagal mengisi parameter PRD otomatis.');
      }
    } catch (err: any) {
      console.error('PRD Auto-Fill Error:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsWizardLoading(false);
    }
  };

  // Preset Template Selectors
  const handleApplyPreset = (type: 'saas' | 'mobile' | 'ai_agent' | 'fintech' | 'ecommerce' | 'health' | 'devtools') => {
    const presets: Record<string, Partial<PRDFormState>> = {
      saas: {
        productTitle: 'NexusCRM - Multi-Tenant B2B Sales & Pipeline Intelligence',
        tagline: 'AI-driven CRM with automated lead scoring and pipeline forecasts',
        category: 'SaaS B2B Platform',
        targetAudience: 'B2B Sales Directors, Account Executives & Revenue Operations',
        targetPlatform: 'Web Application (SaaS Dashboard) & Chrome Extension',
        problemStatement: 'Tim penjualan B2B kehilangan 30% prospek potensial karena pengelolaan pipeline manual, entri data yang lambat, dan kurangnya insight prediktif closing deal.',
        keyFeatures: 'P1: Otentikasi Multi-Tenant dengan RBAC, Visual Kanban Pipeline, Lead Enrichment Otomatis, Email Sync OAuth.\nP2: AI Deal Scoring, WhatsApp Business API Integration, Custom Webhooks.\nP3: Multi-currency Billing with Stripe & Advanced Forecasting Charts.',
        techStack: 'TypeScript, Next.js 15 App Router, NestJS / Express, PostgreSQL (Prisma), Redis, Tailwind CSS, Docker',
        integrations: 'Stripe Billing, Google Workspace OAuth, Microsoft Graph, SendGrid, Segment Analytics',
        releasePhase: 'MVP Horizon (Phase 1: Pipeline & Contact Mgmt -> Phase 2: AI Lead Scoring)',
        nonFunctionalReqs: 'SOC2 Type II compliance ready, Sub-150ms P95 API response, Multi-tenant DB isolation (tenant_id schema), 99.95% SLA',
        prdFormat: 'Comprehensive Enterprise PRD',
      },
      mobile: {
        productTitle: 'FitPulse - AI Personal Fitness & Calorie Tracker App',
        tagline: 'Snap meal photos for instant macro tracking and personalized workout coaching',
        category: 'Mobile App (iOS/Android)',
        targetAudience: 'Health-conscious individuals, gym-goers, and busy professionals',
        targetPlatform: 'Mobile iOS & Android (Native cross-platform)',
        problemStatement: 'Pencatatan kalori harian konvensional memakan waktu lebih dari 10 menit per hari, membuat 75% pengguna berhenti diet dalam 2 minggu pertama.',
        keyFeatures: 'P1: AI Photo Food Recognition & Macro Breakdown, Daily Streak & Habit Tracker, Offline-first Database Sync.\nP2: Apple Health & Google Health Connect Sync, Social Workout Feed.\nP3: Voice Logging Assistant & 3D Avatar Body Progress.',
        techStack: 'React Native / Flutter, TypeScript, FastAPI Python (AI Vision), PostgreSQL + Supabase, Redis, Cloudflare R2',
        integrations: 'Apple HealthKit, Google Fit / Health Connect, RevenueCat (In-App Subscriptions), PostHog',
        releasePhase: 'MVP Phase 1: Photo Macro Logger & Daily Journal',
        nonFunctionalReqs: 'Cold start < 1.2 detik, Offline mode support, End-to-end data encryption for biometric data, 60fps UI',
        prdFormat: 'Agile User Stories PRD',
      },
      ai_agent: {
        productTitle: 'AuraRAG - Enterprise Knowledge Intelligence & Autonomous Agent',
        tagline: 'Secure multi-source document intelligence with hybrid vector search and tool calling',
        category: 'AI Agent / RAG Pipeline',
        targetAudience: 'Enterprise IT Leads, Compliance Officers, Customer Support Teams & Legal Analysts',
        targetPlatform: 'Web App & Slack/MS Teams Bot Integration',
        problemStatement: 'Karyawan enterprise menghabiskan rata-rata 1.8 jam setiap hari mencari SOP internal, regulasi legal, dan dokumentasi teknis di berbagai silo data terpisah.',
        keyFeatures: 'P1: Multi-format Document Ingestion (PDF, DOCX, Notion, Confluence), Hybrid Vector Search (Dense + Sparse BM25), Citation & Source Highlighting.\nP2: Role-based Document Access Guardrails, Slack/Teams Bot.\nP3: Autonomous Tool Calling with Action Approval Workflow.',
        techStack: 'Python / LangChain / LlamaIndex, Next.js 15, FastAPI, Qdrant / Pinecone Vector DB, PostgreSQL, Redis, Gemini 4 Hydrogen / Claude 3.5',
        integrations: 'Google Drive, Notion API, Confluence API, Slack Bot API, Microsoft Teams SDK',
        releasePhase: 'MVP Phase 1: Knowledge Ingestion & Verified RAG Search',
        nonFunctionalReqs: 'Zero data leakage across department tenants, Hallucination guardrails < 1%, Query latency < 1.8s for 20-page document context',
        prdFormat: 'Technical Spec & Architecture PRD',
      },
      fintech: {
        productTitle: 'VaultPay - Cross-Border Multi-Currency B2B Treasury & Invoicing',
        tagline: 'Frictionless international payouts and FX hedging for digital enterprises',
        category: 'Fintech & Payments',
        targetAudience: 'CFOs, Finance Teams, Freelancers & Cross-border Agencies',
        targetPlatform: 'Secure Web Portal & Financial API Platform',
        problemStatement: 'Pembayaran tagihan luar negeri untuk agensi digital memakan biaya transfer 3-5% dan membutuhkan waktu kliring 2-4 hari kerja dengan risiko fluktuasi kurs.',
        keyFeatures: 'P1: Multi-currency Virtual Accounts (USD, EUR, SGD, IDR), Realtime FX Converter, Instant Local Payout Rails.\nP2: Automated PDF Invoicing & Tax Calculation, Two-Factor Hardware Token Auth.\nP3: API Payouts for Payroll & Automated Accounting Sync (Xero/QuickBooks).',
        techStack: 'TypeScript, React, Golang / Node.js, PostgreSQL (CockroachDB/Spanner for strong ACID), Redis, Kafka',
        integrations: 'Stripe Connect, Wise API, Plaid, Xero API, Jumio KYC Verification',
        releasePhase: 'MVP Phase 1: Virtual Wallets, Invoicing & Local Bank Payouts',
        nonFunctionalReqs: 'PCI-DSS Level 1 compliant, End-to-end audit logging, Financial ledger double-entry bookkeeping, 99.99% Uptime SLA',
        prdFormat: 'Comprehensive Enterprise PRD',
      },
      ecommerce: {
        productTitle: 'OmniCommerce - Modern Headless Multi-Vendor Marketplace',
        tagline: 'High-speed storefront with unified vendor portal and live logistics tracking',
        category: 'E-Commerce & Marketplace',
        targetAudience: 'Direct-to-Consumer Brands, Multi-vendor Merchants & Modern Shoppers',
        targetPlatform: 'Web Storefront (PWA) & Vendor Admin Portal',
        problemStatement: 'Sistem e-commerce monolitik yang lambat menyebabkan churn checkout tinggi (68%) dan menyulitkan vendor mengelola stok lintas cabang.',
        keyFeatures: 'P1: Instant Headless Catalog & Instant Search, Multi-Vendor Admin Dashboard, Split-payment Gateway, Realtime Order Tracking.\nP2: Dynamic Flash Sale Engine, AI Product Recommendations.\nP3: Live Streaming Commerce & Loyalty Cashback Points.',
        techStack: 'Next.js 15, MedusaJS / Node.js, PostgreSQL, Meilisearch / Algolia, Redis, Tailwind CSS',
        integrations: 'Midtrans / Xendit / Stripe, J&T / SiCepat / DHL Logistics APIs, WhatsApp Notifications',
        releasePhase: 'MVP Phase 1: Core Catalog, Checkout & Vendor Management',
        nonFunctionalReqs: 'Google Lighthouse Performance Score > 95, Sub-50ms search query response, Handling 5,000 checkout RPM during flash sales',
        prdFormat: 'Comprehensive Enterprise PRD',
      },
      health: {
        productTitle: 'MedixConnect - Telemedicine & Electronic Health Record (EHR)',
        tagline: 'HIPAA-compliant video consultation and digital prescription platform',
        category: 'Healthcare & MedTech',
        targetAudience: 'Doctors, Clinics, Patients & Healthcare Administrators',
        targetPlatform: 'Web Portal & Mobile App (iOS/Android)',
        problemStatement: 'Pasien di daerah terpencil kesulitan berkonsultasi dengan dokter spesialis, sementara klinik independen kekurangan sistem rekam medis digital yang terstandarisasi.',
        keyFeatures: 'P1: HIPAA-Compliant WebRTC Video Consultations, Digital Prescription & Drug Interaction Checker, Patient Medical History Records.\nP2: Clinic Appointment Booking & Queue Management.\nP3: Pharmacy Logistics Integration & Lab Results Sync.',
        techStack: 'TypeScript, React, WebRTC, Node.js, PostgreSQL, Redis, AWS HIPAA-Eligible Services',
        integrations: 'Twilio WebRTC, Stripe Healthcare, SatuSehat / HL7 FHIR APIs',
        releasePhase: 'MVP Phase 1: Teleconsultation & Digital Prescription',
        nonFunctionalReqs: 'HIPAA & Permenkes compliance, AES-256 encryption for all patient health info (PHI), Zero video recording unless explicit consent',
        prdFormat: 'Comprehensive Enterprise PRD',
      },
      devtools: {
        productTitle: 'DevPulse - Cloud Infrastructure Cost & Latency Observability',
        tagline: 'Real-time microservice tracing and automated cloud cost anomaly detection',
        category: 'Developer Tools & DevOps',
        targetAudience: 'DevOps Engineers, Site Reliability Engineers (SRE) & Engineering Leads',
        targetPlatform: 'Web Dashboard & CLI Tool',
        problemStatement: 'Tim engineering sering terkejut oleh tagihan cloud tak terduga dan kesulitan mendiagnosis bottleneck performa terdistribusi antar microservices.',
        keyFeatures: 'P1: OpenTelemetry Trace Ingestion, Cost Anomaly Alerting via Slack, Interactive Service Dependency Graph.\nP2: Automated Resource Right-sizing Recommendations.\nP3: CI/CD Pipeline Cost Impact Predictor.',
        techStack: 'Go / Rust (Ingestion agent), TypeScript / React Dashboard, ClickHouse (Time-series analytics), Kafka, Docker',
        integrations: 'AWS Cost Explorer, GCP Cloud Billing, OpenTelemetry, Slack, GitHub Actions',
        releasePhase: 'MVP Phase 1: Trace Ingestion & Slack Cost Alerts',
        nonFunctionalReqs: 'Ingestion throughput > 50,000 events/sec, Query response < 300ms for 30-day analytics aggregation',
        prdFormat: 'Technical Spec & Architecture PRD',
      },
    };

    const selected = presets[type];
    if (selected) {
      setFormData((prev) => ({ ...prev, ...selected }));
      setSaveSuccessMsg(`Preset template "${selected.productTitle?.split(' - ')[0]}" berhasil dimuat!`);
      setTimeout(() => setSaveSuccessMsg(''), 3500);
    }
  };

  // Apply Pre-Defined Prompt Requirement Template
  const handleApplyPromptTemplate = (
    template: PromptRequirementTemplate,
    mode: 'replace' | 'append' = 'replace'
  ) => {
    setPreInjectSnapshot(null);
    if (mode === 'append' && generatedPRD.trim()) {
      setGeneratedPRD((prev) => `${prev.trim()}\n\n${template.templateContent}`);
      setActiveTemplateId(template.id);
      setActiveTab('document');
      setEditorViewMode('raw');
      setSaveSuccessMsg(
        `Struktur "${template.name}" disisipkan ke dokumen — ${template.variables.length} variabel siap diinjeksi di sidebar!`
      );
      setTimeout(() => setSaveSuccessMsg(''), 4500);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      ...template.formDefaults,
    }));
    setGeneratedPRD(template.templateContent);
    setActiveTemplateId(template.id);
    setActiveTab('document');
    setEditorViewMode('raw');
    setSaveSuccessMsg(
      `Template "${template.name}" (${template.technique}) dimuat! Isi ${template.variables.length} variabel {{...}} di sidebar kiri untuk injeksi terstruktur.`
    );
    setTimeout(() => setSaveSuccessMsg(''), 4500);
  };

  // Variable Injection Handlers
  const handleVariableValueChange = (varName: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [varName]: value }));
  };

  const handleFillTemplateDefaults = () => {
    const nextValues: Record<string, string> = { ...variableValues };
    let filled = 0;
    for (const v of detectedVariables) {
      const meta = getVariableMeta(v.name);
      if (meta?.defaultValue) {
        nextValues[v.name] = meta.defaultValue;
        filled += 1;
      } else if (!nextValues[v.name]?.trim()) {
        nextValues[v.name] = `[Contoh ${formatVariableLabel(v.name)}]`;
        filled += 1;
      }
    }
    setVariableValues(nextValues);
    if (filled > 0) {
      setSaveSuccessMsg(`${filled} nilai contoh variabel berhasil diisi otomatis!`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  const handleClearVariables = () => {
    setVariableValues({});
    setEditorViewMode('raw');
  };

  const handleInjectVariablesPermanent = () => {
    if (!hasActiveInjections) return;
    setPreInjectSnapshot({
      formData: { ...formData },
      generatedPRD,
      variableValues: { ...variableValues },
    });
    setFormData(resolvedFormData);
    setGeneratedPRD(resolvedPRD);
    setVariableValues((prev) => {
      const remaining: Record<string, string> = {};
      for (const v of detectedVariables) {
        if (!(prev[v.name] || '').trim()) {
          remaining[v.name] = '';
        }
      }
      return remaining;
    });
    setEditorViewMode('raw');
    setSaveSuccessMsg(
      `${filledVariablesCount} variabel berhasil diinjeksi permanen ke dokumen & form! Klik "Undo Injeksi" bila ingin kembali ke template.`
    );
    setTimeout(() => setSaveSuccessMsg(''), 6000);
  };

  const handleUndoInject = () => {
    if (!preInjectSnapshot) return;
    setFormData(preInjectSnapshot.formData);
    setGeneratedPRD(preInjectSnapshot.generatedPRD);
    setVariableValues(preInjectSnapshot.variableValues);
    setPreInjectSnapshot(null);
    setSaveSuccessMsg('Template variabel sebelum injeksi berhasil dikembalikan.');
    setTimeout(() => setSaveSuccessMsg(''), 3500);
  };

  const handleInsertVariableToken = (rawName: string) => {
    const cleanName = rawName
      .trim()
      .replace(/^\{+|\}+$/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!cleanName) return;

    const token = `{{${cleanName}}}`;
    const textarea = prdTextareaRef.current;

    if (generatedPRD && textarea && activeTab === 'document' && editorViewMode === 'raw') {
      const start = textarea.selectionStart ?? generatedPRD.length;
      const end = textarea.selectionEnd ?? generatedPRD.length;
      const updated = generatedPRD.slice(0, start) + token + generatedPRD.slice(end);
      setGeneratedPRD(updated);
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = start + token.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    } else if (generatedPRD) {
      setGeneratedPRD((prev) => `${prev}${prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' '}${token}`);
    } else {
      setGeneratedPRD(
        `[PRODUCT REQUIREMENT DOCUMENT - PROMPT SPECIFICATION]\nTopik Utama: ${token}\n\n[1. CORE REQUIREMENT]\nJelaskan spesifikasi dan kriteria penerimaan untuk ${token}.`
      );
    }

    setNewVarNameInput('');
    setActiveTab('document');
    setEditorViewMode('raw');
  };

  // Safe React renderer highlighting injected values and remaining {{variables}}
  const renderHighlightedText = (rawText: string) => {
    if (!rawText) return null;
    const tokenRegex = /(\{\{\s*[a-zA-Z0-9_.-]+\s*\}\})/g;
    const parts = rawText.split(tokenRegex);
    return parts.map((part, idx) => {
      const match = part.match(/^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/);
      if (!match) {
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      }
      const varName = match[1];
      const injectedValue = variableValues[varName]?.trim();
      if (injectedValue) {
        return (
          <span
            key={idx}
            title={`Injected from {{${varName}}}`}
            className="px-1 py-0.5 rounded bg-emerald-100/90 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300/70 dark:border-emerald-700/70 font-medium"
          >
            {injectedValue}
          </span>
        );
      }
      return (
        <span
          key={idx}
          title={`Belum diisi: ${part}`}
          className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 font-mono text-[11px] font-bold"
        >
          {part}
        </span>
      );
    });
  };

  // Generate Core PRD
  const handleGeneratePRD = async () => {
    setIsGeneratingPRD(true);
    try {
      const res = await fetch('/api/gemini/prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...resolvedFormData, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.prdDocument) {
        setGeneratedPRD(sanitizeCleanText(data.prdDocument));
        setActiveTab('document');
        setEditorViewMode('raw');
        setSaveSuccessMsg('Dokumen PRD eksekutif berhasil disusun!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setErrorBanner(data.error || 'Gagal menyusun PRD.');
      }
    } catch (err: any) {
      console.error('Generate PRD Error:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsGeneratingPRD(false);
    }
  };

  // AI Refine Section / Expand
  const handleExpandSection = async (sectionGoal: string) => {
    if (!generatedPRD) return;
    setIsRefining(true);
    setActiveSubAction(sectionGoal);
    try {
      const res = await fetch('/api/gemini/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: generatedPRD,
          goal: `Perluas dokumen PRD ini dengan fokus khusus pada: ${sectionGoal}. Pertahankan seluruh seksi yang sudah ada, jangan kurangi detail, dan tambahkan tabel spesifikasi teknis / user stories yang sangat mendalam. Dilarang gunakan simbol #, @, atau *.`,
          customKeys: getCustomApiKeys(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.optimizedPrompt) {
        setGeneratedPRD(sanitizeCleanText(data.data.optimizedPrompt));
        setSaveSuccessMsg(`PRD berhasil diperluas dengan fokus pada ${sectionGoal}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setErrorBanner(data.error || 'Gagal memperluas PRD.');
      }
    } catch (err: any) {
      console.error('Expand PRD error:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsRefining(false);
      setActiveSubAction('');
    }
  };

  // Run PRD Quality & Completeness Audit
  const handleRunAudit = async () => {
    if (!generatedPRD) return;
    setIsAuditing(true);
    setActiveTab('audit');
    try {
      const res = await fetch('/api/gemini/prd/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdDocument: resolvedPRD, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAuditReport(data.data);
      } else {
        setErrorBanner(data.error || 'Gagal melakukan audit PRD.');
      }
    } catch (err: any) {
      console.error('PRD Audit Error:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan saat mengaudit.');
    } finally {
      setIsAuditing(false);
    }
  };

  // Generate Database Schema (PostgreSQL, Prisma, TypeScript)
  const handleGenerateSchema = async () => {
    if (!generatedPRD) return;
    setIsGeneratingSchema(true);
    setActiveTab('database');
    try {
      const res = await fetch('/api/gemini/prd/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdDocument: resolvedPRD, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSchemaData(data.data);
      } else {
        setErrorBanner(data.error || 'Gagal merancang skema database.');
      }
    } catch (err: any) {
      console.error('Schema Error:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsGeneratingSchema(false);
    }
  };

  // Generate API Spec & OpenAPI
  const handleGenerateApiSpec = async () => {
    if (!generatedPRD) return;
    setIsGeneratingApiSpec(true);
    setActiveTab('api');
    try {
      const res = await fetch('/api/gemini/prd/generate-api-spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdDocument: resolvedPRD, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setApiSpecData(data.data);
      } else {
        setErrorBanner(data.error || 'Gagal merancang spesifikasi API.');
      }
    } catch (err: any) {
      console.error('API Spec Error:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsGeneratingApiSpec(false);
    }
  };

  // Generate Mermaid Diagrams
  const handleGenerateDiagrams = async () => {
    if (!generatedPRD) return;
    setIsGeneratingDiagrams(true);
    setActiveTab('diagrams');
    try {
      const res = await fetch('/api/gemini/prd/generate-diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdDocument: resolvedPRD, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDiagramsData(data.data);
      } else {
        setErrorBanner(data.error || 'Gagal menghasilkan diagram.');
      }
    } catch (err: any) {
      console.error('Diagrams Error:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsGeneratingDiagrams(false);
    }
  };

  // Generate Jira & Linear Sprint Tickets
  const handleGenerateTickets = async () => {
    if (!generatedPRD) return;
    setIsGeneratingTickets(true);
    setActiveTab('tickets');
    try {
      const res = await fetch('/api/gemini/prd/generate-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prdDocument: resolvedPRD, customKeys: getCustomApiKeys() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTicketsData(data.data);
      } else {
        setErrorBanner(data.error || 'Gagal membedah tiket sprint.');
      }
    } catch (err: any) {
      console.error('Tickets Error:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsGeneratingTickets(false);
    }
  };

  // Inline AI Co-Pilot for PRD editing
  const handleRunCopilot = async () => {
    if (!copilotInput.trim() || !generatedPRD) return;
    setIsCopilotLoading(true);
    try {
      const res = await fetch('/api/gemini/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: generatedPRD,
          goal: `Terapkan modifikasi atau instruksi berikut pada PRD: "${copilotInput.trim()}". Perbarui dan rapikan seksi terkait dengan mempertahankan kelengkapan seluruh dokumen PRD. Dilarang gunakan simbol #, @, atau *.`,
          customKeys: getCustomApiKeys(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.optimizedPrompt) {
        setGeneratedPRD(sanitizeCleanText(data.data.optimizedPrompt));
        setCopilotInput('');
        setSaveSuccessMsg('Dokumen PRD berhasil dimodifikasi oleh AI Co-Pilot!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setErrorBanner(data.error || 'Gagal memproses instruksi Co-Pilot.');
      }
    } catch (err: any) {
      console.error('Copilot Error:', err);
      setErrorBanner(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Copy to clipboard (defaults to live variable-injected PRD)
  const handleCopy = (textToCopy?: string) => {
    const target = textToCopy || resolvedPRD;
    if (!target) return;
    navigator.clipboard.writeText(target);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save PRD as Prompt/Document item to Library & Firestore
  const handleSaveToLibrary = () => {
    if (!generatedPRD.trim()) return;

    const activeTemplate = PROMPT_REQUIREMENT_TEMPLATES.find((t) => t.id === activeTemplateId);
    const contentToSave = resolvedPRD;

    const newPrompt: PromptItem = {
      id: `prd-${Date.now()}`,
      title: `[PRD] ${resolvedFormData.productTitle || 'Untitled Product Spec'}`,
      category: 'Business & Product',
      subCategory: resolvedFormData.category || 'Product Requirement Document',
      aiModel: 'Gemini 4 Hydrogen',
      language: resolvedFormData.language,
      programmingLanguage: resolvedFormData.techStack.split(',')[0]?.trim() || 'TypeScript',
      framework: activeTemplate ? activeTemplate.technique : 'PRD Document',
      database: 'PostgreSQL / Multi-Model',
      platform: resolvedFormData.targetPlatform,
      stylePrompt: activeTemplate
        ? `PRD (${activeTemplate.technique})`
        : 'Product Requirement Document (PRD)',
      tone: 'Professional & Technical Executive',
      outputLanguage: resolvedFormData.language,
      creativity: 'Analytical & Structured',
      length: 'Comprehensive Full Specification',
      targetAudience: resolvedFormData.targetAudience,
      description:
        resolvedFormData.problemStatement || resolvedFormData.tagline || 'Dokumen PRD Terstruktur',
      additionalReqs: resolvedFormData.keyFeatures,
      negativePrompt: 'Unstructured thoughts, vague requirements',
      expectedOutput: 'Production-ready PRD with Architecture, KPIs & Roadmap',
      reference: '',
      content: contentToSave,
      isFavorite: false,
      isPinned: false,
      collectionId: selectedCollectionId || null,
      tags: [
        'PRD',
        'Product Spec',
        ...(activeTemplate ? [activeTemplate.technique] : ['Architecture']),
        resolvedFormData.category.split(' ')[0],
      ],
      score: auditReport?.overallScore || 98,
      scoreDetail: null,
      versions: [
        {
          id: `v1-${Date.now()}`,
          versionNumber: 1,
          content: contentToSave,
          note: hasActiveInjections ? 'PRD with Injected Variables' : 'Initial PRD Generation',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSavePrompt(newPrompt);
    setSaveSuccessMsg('Dokumen PRD berhasil disimpan ke PromptForge Library & Cloud Firestore!');
    setTimeout(() => setSaveSuccessMsg(''), 4500);
  };

  // Download Handlers
  const handleDownload = (format: 'md' | 'txt' | 'json' | 'csv', customContent?: string, suffix?: string) => {
    const textContent = customContent || resolvedPRD;
    if (!textContent) return;

    let mimeType = 'text/plain';
    if (format === 'md') mimeType = 'text/markdown';
    if (format === 'json') mimeType = 'application/json';
    if (format === 'csv') mimeType = 'text/csv';

    const blob = new Blob([textContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedTitle = (resolvedFormData.productTitle || 'Product-Requirement-Document')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    a.download = `${sanitizedTitle}${suffix ? `-${suffix}` : '-prd'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const handlePrint = () => {
    if (!resolvedPRD) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const safeTitle = (resolvedFormData.productTitle || 'Product Requirement Document').replace(
      /[<&>]/g,
      (ch) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[ch] || ch)
    );
    const safeBody = resolvedPRD.replace(
      /[<&>]/g,
      (ch) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[ch] || ch)
    );
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>${safeTitle}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; }
              pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
              h1 { font-size: 22px; border-bottom: 2px solid #0f766e; padding-bottom: 8px; color: #0f766e; }
            </style>
          </head>
          <body>
            <h1>${safeTitle}</h1>
            <pre>${safeBody}</pre>
          </body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    } else {
      document.body.removeChild(iframe);
    }
    setIsExportMenuOpen(false);
  };

  const wordCount = resolvedPRD ? resolvedPRD.trim().split(/\s+/).length : 0;
  const readTimeMin = Math.ceil(wordCount / 200);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto pb-16">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
            PRD Studio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Susun spesifikasi produk, skema database, API spec, diagram, dan tiket sprint.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={() => {
              if (confirm('Reset seluruh formulir PRD ke pengaturan awal?')) {
                setFormData(DEFAULT_PRD_FORM);
                setGeneratedPRD('');
                setVariableValues({});
                setActiveTemplateId(null);
                setPreInjectSnapshot(null);
                setEditorViewMode('raw');
                setAuditReport(null);
                setSchemaData(null);
                setApiSpecData(null);
                setDiagramsData(null);
                setTicketsData(null);
                setDraftHistory([]);
                setAutoSavedAt('');
                if (userId) {
                  void deleteWorkspaceDoc(userId, 'prd_draft');
                }
              }
            }}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            title="Reset Form"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {draftHistory.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setIsDraftHistoryOpen(!isDraftHistoryOpen)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Versi Draft ({draftHistory.length})</span>
              </button>

              {isDraftHistoryOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-30 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500">Draft Snapshot</span>
                    <button
                      onClick={() => setIsDraftHistoryOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {draftHistory.map((ver) => (
                      <button
                        key={ver.id}
                        onClick={() => {
                          setFormData(ver.formData);
                          setGeneratedPRD(ver.contentText);
                          setIsDraftHistoryOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs transition-colors"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {ver.title}
                        </div>
                        <div className="text-[10px] text-slate-400">{ver.timestamp}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {autoSavedAt && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Cloud Sync ({autoSavedAt})</span>
            </div>
          )}
        </div>
      </div>

      {/* Inline Error Banner */}
      {errorBanner && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center justify-between gap-3 text-xs text-red-700 dark:text-red-300 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-red-500 hover:text-red-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200 font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {preInjectSnapshot && (
              <button
                onClick={handleUndoInject}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo Injeksi</span>
              </button>
            )}
            <button
              onClick={() => setSaveSuccessMsg('')}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Clean AI PRD Auto-Fill Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={wizardInput}
            onChange={(e) => setWizardInput(e.target.value)}
            placeholder="Tulis atau ucapkan ide produk (contoh: Platform SaaS Customer Support multi-tenant dengan billing Stripe)..."
            className="flex-1 px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isWizardLoading) {
                void handleRunWizard();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleRunWizard()}
            disabled={isWizardLoading || !wizardInput.trim()}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white disabled:opacity-40 text-white dark:text-slate-900 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            {isWizardLoading ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Mengisi...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Fill PRD</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <VoiceAutoFillButton
            disabled={isWizardLoading}
            accentColor="emerald"
            placeholderHint="Ucapkan ide produk untuk mengisi form PRD otomatis"
            onTranscribed={(transcript, shouldAutoFill) => {
              setWizardInput(transcript);
              if (shouldAutoFill) {
                void handleRunWizard(transcript);
              }
            }}
          />

          <select
            aria-label="Muat Preset PRD"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleApplyPreset(e.target.value as any);
                e.target.value = '';
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="">Muat Preset PRD...</option>
            <option value="saas">SaaS B2B CRM</option>
            <option value="ai_agent">Enterprise RAG Agent</option>
            <option value="mobile">Mobile Health App</option>
            <option value="fintech">Fintech Treasury</option>
            <option value="ecommerce">Headless E-Commerce</option>
            <option value="health">Telemedicine EHR</option>
            <option value="devtools">DevOps Observability</option>
          </select>
        </div>
      </div>

      {/* Pre-Defined Prompt Requirement Templates Library */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-slate-100">
                  Prompt Requirement Templates Library
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {PROMPT_REQUIREMENT_TEMPLATES.length} Struktur Siap Pakai
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih kerangka prompt standar (Role-Play, Chain-of-Thought, Few-Shot, Tree-of-Thoughts, ReAct, JSON Schema, Socratic) lengkap dengan variabel otomatis <code className="font-mono text-teal-600 dark:text-teal-400">{'{{variable}}'}</code>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsTemplateLibraryOpen(!isTemplateLibraryOpen)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
          >
            {isTemplateLibraryOpen ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Sembunyikan</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Buka Library</span>
              </>
            )}
          </button>
        </div>

        {isTemplateLibraryOpen && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Filter Pills & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    'ALL',
                    'Role-Play',
                    'Chain-of-Thought',
                    'Few-Shot',
                    'Tree-of-Thoughts',
                    'ReAct Agent',
                    'Structured JSON',
                    'Socratic',
                  ] as const
                ).map((tech) => (
                  <button
                    key={tech}
                    onClick={() => setSelectedTechniqueFilter(tech)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 border ${
                      selectedTechniqueFilter === tech
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tech === 'ALL' ? 'Semua Struktur' : tech}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-56 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Cari template atau variabel..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                {templateSearch && (
                  <button
                    onClick={() => setTemplateSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear template search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Template Cards Grid */}
            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredTemplates.map((tpl) => {
                  const isActive = activeTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isActive
                          ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-500 ring-1 ring-teal-500/40'
                          : 'bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-teal-400/70'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${tpl.badgeColor}`}
                          >
                            {tpl.technique}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {tpl.variables.length} vars
                          </span>
                        </div>

                        <div>
                          <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            {tpl.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                            {tpl.description}
                          </p>
                        </div>

                        {/* Variable Tokens Preview */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {tpl.variables.slice(0, 4).map((v) => (
                            <span
                              key={v.name}
                              className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-teal-700 dark:text-teal-300"
                            >
                              {`{{${v.name}}}`}
                            </span>
                          ))}
                          {tpl.variables.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-[10px] text-slate-500">
                              +{tpl.variables.length - 4}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        <button
                          onClick={() => handleApplyPromptTemplate(tpl, 'replace')}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>Gunakan Mulai</span>
                        </button>
                        {generatedPRD.trim().length > 0 && (
                          <button
                            onClick={() => handleApplyPromptTemplate(tpl, 'append')}
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold transition-colors"
                            title="Sisipkan blok struktur ini ke akhir dokumen PRD saat ini"
                          >
                            + Sisipkan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                Tidak ada template yang cocok dengan pencarian "{templateSearch}".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Variable Injector Sidebar & PRD Form Builder (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Dynamic Bracketed Variable Injector Panel */}
          <div
            className={`p-5 rounded-2xl border shadow-xs space-y-4 transition-colors ${
              detectedVariables.length > 0
                ? 'bg-gradient-to-b from-teal-50/70 to-white dark:from-teal-950/25 dark:to-slate-900 border-teal-300/80 dark:border-teal-800/80'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-600/15 text-teal-700 dark:text-teal-300">
                  <Braces className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-slate-100">
                    Dynamic Variable Injector
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Deteksi otomatis variabel <code className="font-mono text-teal-600 dark:text-teal-400">{'{{nama_variabel}}'}</code> di form & editor
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                  detectedVariables.length > 0
                    ? filledVariablesCount === detectedVariables.length
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {detectedVariables.length > 0
                  ? `${filledVariablesCount}/${detectedVariables.length} Terisi`
                  : '0 Variabel'}
              </span>
            </div>

            {detectedVariables.length > 0 ? (
              <>
                {/* Quick Variable Toolbar */}
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Nilai yang diisi otomatis diterapkan saat Salin, Ekspor & Playground.
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleFillTemplateDefaults}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 font-semibold transition-colors"
                      title="Isi seluruh variabel dengan nilai contoh bawaan"
                    >
                      Isi Contoh
                    </button>
                    {filledVariablesCount > 0 && (
                      <button
                        onClick={handleClearVariables}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors"
                      >
                        Bersihkan
                      </button>
                    )}
                  </div>
                </div>

                {/* Dynamically Rendered Variable Input Fields */}
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {detectedVariables.map((variable) => {
                    const meta = getVariableMeta(variable.name);
                    const currentVal = variableValues[variable.name] || '';
                    const isFilled = currentVal.trim().length > 0;
                    const isMultiline =
                      meta?.multiline ||
                      /context|constraint|example|steps|tools|fields|input|output|guardrail|criteria|problem/i.test(
                        variable.name
                      );

                    return (
                      <div
                        key={variable.name}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor={`prd-var-${variable.name}`}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isFilled ? 'bg-emerald-500' : 'bg-amber-400'
                              }`}
                            />
                            <span className="truncate">
                              {meta?.label || formatVariableLabel(variable.name)}
                            </span>
                          </label>
                          <div className="flex items-center gap-1 shrink-0">
                            <code className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 font-mono text-[10px] text-teal-700 dark:text-teal-300">
                              {variable.token}
                            </code>
                            <span
                              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-semibold text-slate-500"
                              title={
                                variable.inDocument && variable.inForm
                                  ? `Ditemukan di Dokumen & Form (${variable.formFields.join(', ')})`
                                  : variable.inDocument
                                  ? 'Ditemukan di PRD Editor'
                                  : `Ditemukan di Form (${variable.formFields.join(', ')})`
                              }
                            >
                              {variable.occurrences}x
                            </span>
                          </div>
                        </div>

                        {isMultiline ? (
                          <textarea
                            id={`prd-var-${variable.name}`}
                            rows={2}
                            value={currentVal}
                            onChange={(e) => handleVariableValueChange(variable.name, e.target.value)}
                            placeholder={
                              meta?.placeholder || `Masukkan nilai untuk ${variable.token}...`
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 resize-y"
                          />
                        ) : (
                          <input
                            id={`prd-var-${variable.name}`}
                            type="text"
                            value={currentVal}
                            onChange={(e) => handleVariableValueChange(variable.name, e.target.value)}
                            placeholder={
                              meta?.placeholder || `Masukkan nilai untuk ${variable.token}...`
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Injection Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                  <button
                    onClick={handleInjectVariablesPermanent}
                    disabled={!hasActiveInjections}
                    className="flex-1 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    title="Ganti token {{variabel}} secara permanen di teks editor & form"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Injeksi Permanen ({filledVariablesCount})</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCopy(resolvedPRD);
                      setSaveSuccessMsg('Prompt hasil injeksi berhasil disalin ke clipboard!');
                      setTimeout(() => setSaveSuccessMsg(''), 2500);
                    }}
                    disabled={!generatedPRD}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="Salin dokumen dengan nilai variabel yang sudah terinjeksi tanpa menghapus template"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Hasil</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tulis variabel berformat <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-teal-600 dark:text-teal-400">{'{{topic}}'}</code> di form atau PRD Editor, atau pilih template di atas — input field terstruktur akan muncul otomatis di sini.
                </p>
                {preInjectSnapshot && (
                  <button
                    onClick={handleUndoInject}
                    className="w-full px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Kembalikan Template Sebelum Injeksi</span>
                  </button>
                )}
              </div>
            )}

            {/* Quick Insert Bracketed Variable Helper */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newVarNameInput}
                  onChange={(e) => setNewVarNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newVarNameInput.trim()) {
                      e.preventDefault();
                      handleInsertVariableToken(newVarNameInput);
                    }
                  }}
                  placeholder="Tambah variabel baru (misal: topic, role)..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => handleInsertVariableToken(newVarNameInput)}
                  disabled={!newVarNameInput.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500 disabled:opacity-40 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>Sisipkan</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <span className="text-slate-400 font-semibold mr-0.5">Cepat:</span>
                {['topic', 'expert_role', 'target_audience', 'constraints', 'output_format'].map(
                  (quickVar) => (
                    <button
                      key={quickVar}
                      onClick={() => handleInsertVariableToken(quickVar)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-950 text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 font-mono transition-colors"
                    >
                      +{`{{${quickVar}}}`}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-slate-100">
                  Parameter Spesifikasi Produk
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">12 Bidang Lengkap</span>
            </div>

            {/* 1. Product Title & Tagline */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Produk / Sistem <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="productTitle"
                  value={formData.productTitle}
                  onChange={handleInputChange}
                  placeholder="Contoh: NexusCRM, AuraRAG, FitPulse"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tagline / Visi Satu Kalimat
                </label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  placeholder="Contoh: AI-driven CRM with automated lead scoring and pipeline forecasting"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* 2. Category & Target Platform */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Produk
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="SaaS B2B Platform">SaaS B2B Platform</option>
                  <option value="Mobile App (iOS/Android)">Mobile App (iOS/Android)</option>
                  <option value="AI Agent / RAG Pipeline">AI Agent / RAG Pipeline</option>
                  <option value="Fintech & Payments">Fintech & Payments</option>
                  <option value="E-Commerce & Marketplace">E-Commerce & Marketplace</option>
                  <option value="Healthcare & MedTech">Healthcare & MedTech</option>
                  <option value="EdTech & Learning">EdTech & Learning</option>
                  <option value="Developer Tools & DevOps">Developer Tools & DevOps</option>
                  <option value="Internal Enterprise Portal">Internal Enterprise Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Platform
                </label>
                <input
                  type="text"
                  name="targetPlatform"
                  value={formData.targetPlatform}
                  onChange={handleInputChange}
                  placeholder="Web SaaS, Mobile iOS/Android, Chrome Extension"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* 3. Target Audience / Personas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Pengguna & Stakeholder
              </label>
              <input
                type="text"
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleInputChange}
                placeholder="Contoh: B2B Sales Directors, Account Executives, Lead Architects"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* 4. Problem Statement */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Latar Belakang Masalah & Pain Points
              </label>
              <textarea
                name="problemStatement"
                rows={3}
                value={formData.problemStatement}
                onChange={handleInputChange}
                placeholder="Jelaskan masalah nyata yang dihadapi calon pengguna dan alasan mendesak mengapa produk ini harus dibangun..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 resize-y"
              />
            </div>

            {/* 5. Key Features & Scope */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fitur Kunci & Ruang Lingkup (P1 / P2 / P3)
              </label>
              <textarea
                name="keyFeatures"
                rows={3}
                value={formData.keyFeatures}
                onChange={handleInputChange}
                placeholder="P1: Otentikasi Multi-Tenant, Kanban Pipeline, Email Sync OAuth&#10;P2: AI Deal Scoring, WhatsApp API&#10;P3: Multi-Currency Billing"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500 resize-y font-mono text-[11px]"
              />
            </div>

            {/* 6. Tech Stack & Integrations */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rekomendasi Tech Stack
                </label>
                <input
                  type="text"
                  name="techStack"
                  value={formData.techStack}
                  onChange={handleInputChange}
                  placeholder="TypeScript, Next.js 15, NestJS, PostgreSQL, Redis, Docker"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Integrasi Pihak Ketiga & SDKs
                </label>
                <input
                  type="text"
                  name="integrations"
                  value={formData.integrations}
                  onChange={handleInputChange}
                  placeholder="Stripe, Google OAuth, S3 Storage, Twilio, SendGrid"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* 7. Non-Functional Requirements & Format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Format PRD
                </label>
                <select
                  name="prdFormat"
                  value={formData.prdFormat}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Comprehensive Enterprise PRD">Comprehensive Enterprise PRD</option>
                  <option value="Lean Startup MVP PRD">Lean Startup MVP PRD</option>
                  <option value="Technical Spec & Architecture PRD">Technical Spec & Architecture</option>
                  <option value="Agile User Stories PRD">Agile User Stories & Acceptance Criteria</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bahasa Dokumen
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Indonesian">Bahasa Indonesia</option>
                  <option value="English">English (US)</option>
                </select>
              </div>
            </div>

            {/* Generate PRD Button */}
            <button
              onClick={handleGeneratePRD}
              disabled={isGeneratingPRD}
              className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-600/20"
            >
              {isGeneratingPRD ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Menyusun Dokumen PRD Eksekutif...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Susun PRD Lengkap (AI Engine)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live PRD Output & Engineering Studio (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col min-h-[680px]">
            {/* Output Header Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-600/10 text-teal-600 dark:text-teal-400">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-heading font-bold text-slate-900 dark:text-slate-100">
                    {resolvedFormData.productTitle
                      ? `PRD: ${resolvedFormData.productTitle}`
                      : 'Dokumen Spesifikasi PRD'}
                  </h4>
                  <div className="flex items-center flex-wrap gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span>{wordCount.toLocaleString()} kata</span>
                    <span>•</span>
                    <span>~{readTimeMin} menit waktu baca</span>
                    {detectedVariables.length > 0 && (
                      <>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            hasActiveInjections
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {filledVariablesCount}/{detectedVariables.length} variabel terinjeksi
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span className="text-teal-600 dark:text-teal-400 font-semibold">
                      Standar Produksi Siap Eksekusi
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => handleCopy()}
                  disabled={!generatedPRD}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title={
                    hasActiveInjections
                      ? 'Salin Dokumen Hasil Injeksi Variabel ke Clipboard'
                      : 'Salin Dokumen ke Clipboard'
                  }
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{hasActiveInjections ? 'Salin (Injected)' : 'Salin'}</span>
                    </>
                  )}
                </button>

                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    disabled={!generatedPRD}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {isExportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-20 space-y-1">
                      <button
                        onClick={() => handleDownload('md')}
                        className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        <span>Unduh Markdown (.md)</span>
                      </button>
                      <button
                        onClick={() => handleDownload('txt')}
                        className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <FileCode className="w-3.5 h-3.5 text-blue-600" />
                        <span>Unduh Teks (.txt)</span>
                      </button>
                      <button
                        onClick={handlePrint}
                        className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-600" />
                        <span>Cetak / Simpan PDF</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Save to Library */}
                <button
                  onClick={handleSaveToLibrary}
                  disabled={!generatedPRD}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan ke Library</span>
                </button>
              </div>
            </div>

            {/* Interactive Engineering Studio Tab Navigation */}
            {generatedPRD && (
              <>
                <div className="px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setActiveTab('document')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        activeTab === 'document'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PRD Editor</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('structure')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        activeTab === 'structure'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Seksi Explorer</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        activeTab === 'preview'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Eksekutif Doc</span>
                    </button>
                    <button
                      onClick={handleRunAudit}
                      disabled={isAuditing}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        activeTab === 'audit'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 bg-amber-50 dark:bg-amber-950/20'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{isAuditing ? 'Auditing...' : 'Audit Kesiapan (0-100)'}</span>
                    </button>
                    <button
                      onClick={handleGenerateSchema}
                      disabled={isGeneratingSchema}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        activeTab === 'database'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 text-blue-500" />
                      <span>{isGeneratingSchema ? 'Generating...' : 'Database SQL/Prisma'}</span>
                    </button>
                    <button
                      onClick={handleGenerateApiSpec}
                      disabled={isGeneratingApiSpec}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        activeTab === 'api'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{isGeneratingApiSpec ? 'Generating...' : 'REST API OpenAPI'}</span>
                    </button>
                    <button
                      onClick={handleGenerateDiagrams}
                      disabled={isGeneratingDiagrams}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        activeTab === 'diagrams'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Workflow className="w-3.5 h-3.5 text-purple-500" />
                      <span>{isGeneratingDiagrams ? 'Generating...' : 'Mermaid Diagrams'}</span>
                    </button>
                    <button
                      onClick={handleGenerateTickets}
                      disabled={isGeneratingTickets}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                        activeTab === 'tickets'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isGeneratingTickets ? 'Generating...' : 'Jira / Linear Tasks'}</span>
                    </button>
                  </div>

                  {onNavigateToPlayground && (
                    <button
                      onClick={() => onNavigateToPlayground(resolvedPRD)}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-semibold text-[11px] transition-colors flex items-center gap-1 shrink-0 ml-2"
                      title="Uji prompt ini di AI Playground"
                    >
                      <Zap className="w-3 h-3 text-teal-600" />
                      <span>Test di Playground</span>
                    </button>
                  )}
                </div>

                {/* Quick AI Expand Toolbar */}
                <div className="px-4 py-2 bg-teal-50/50 dark:bg-teal-950/20 border-b border-teal-100 dark:border-teal-900/50 flex items-center gap-2 overflow-x-auto text-[11px]">
                  <div className="flex items-center gap-1 text-teal-800 dark:text-teal-300 font-semibold shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Perluas Seksi Spesifik:</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleExpandSection('Tabel Arsitektur Database ERD & Schema Migrations')}
                      disabled={isRefining}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isRefining && activeSubAction.includes('Database') ? <RotateCcw className="w-3 h-3 animate-spin" /> : '+'}
                      <span>Skema ERD</span>
                    </button>
                    <button
                      onClick={() => handleExpandSection('Tabel Acceptance Criteria lengkap dengan standar Given-When-Then')}
                      disabled={isRefining}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isRefining && activeSubAction.includes('Acceptance') ? <RotateCcw className="w-3 h-3 animate-spin" /> : '+'}
                      <span>Acceptance (Gherkin)</span>
                    </button>
                    <button
                      onClick={() => handleExpandSection('Spesifikasi Lengkap REST API Endpoints & Request/Response JSON')}
                      disabled={isRefining}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isRefining && activeSubAction.includes('REST API') ? <RotateCcw className="w-3 h-3 animate-spin" /> : '+'}
                      <span>API Endpoints</span>
                    </button>
                    <button
                      onClick={() => handleExpandSection('Matriks Risiko Teknis & Keamanan dengan Rencana Mitigasi Konkret')}
                      disabled={isRefining}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isRefining && activeSubAction.includes('Risiko') ? <RotateCcw className="w-3 h-3 animate-spin" /> : '+'}
                      <span>Risiko & Mitigasi</span>
                    </button>
                    <button
                      onClick={() => handleExpandSection('Rencana Rilis Sprint Detail dengan Estimasi Story Points & Milestone')}
                      disabled={isRefining}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {isRefining && activeSubAction.includes('Sprint') ? <RotateCcw className="w-3 h-3 animate-spin" /> : '+'}
                      <span>Sprint Roadmap</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Document Content View Area */}
            <div className="p-4 sm:p-6 flex-1 flex flex-col">
              {generatedPRD ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  {/* TAB 1: Raw Document / Textarea with Live Injected Preview Toggle */}
                  {activeTab === 'document' && (
                    <div className="space-y-3 flex-1 flex flex-col">
                      {detectedVariables.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Braces className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>
                              Terdeteksi <strong>{detectedVariables.length}</strong> variabel ({filledVariablesCount} terisi)
                            </span>
                          </div>
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => setEditorViewMode('raw')}
                              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                                editorViewMode === 'raw'
                                  ? 'bg-teal-600 text-white'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit Template</span>
                            </button>
                            <button
                              onClick={() => setEditorViewMode('resolved')}
                              className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                                editorViewMode === 'resolved'
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              <span>Live Injected</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {editorViewMode === 'resolved' && detectedVariables.length > 0 ? (
                        <div className="w-full flex-1 min-h-[500px] max-h-[600px] overflow-y-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-emerald-300/70 dark:border-emerald-800/70 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {renderHighlightedText(generatedPRD)}
                        </div>
                      ) : (
                        <textarea
                          ref={prdTextareaRef}
                          value={generatedPRD}
                          onChange={(e) => setGeneratedPRD(e.target.value)}
                          className="w-full flex-1 min-h-[500px] p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-teal-500 resize-y"
                          placeholder="Dokumen PRD akan muncul di sini... Gunakan {{nama_variabel}} kapan saja untuk memunculkan input otomatis di sidebar."
                        />
                      )}

                      {/* Inline AI Co-Pilot Input */}
                      <div className="p-3 bg-teal-50/70 dark:bg-slate-950/80 rounded-xl border border-teal-200 dark:border-teal-900/60 flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-teal-600 text-white shrink-0">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={copilotInput}
                          onChange={(e) => setCopilotInput(e.target.value)}
                          placeholder="Instruksikan AI Co-Pilot (misal: 'Tambahkan seksi Webhook Idempotency' atau 'Perbanyak edge cases')..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isCopilotLoading) {
                              handleRunCopilot();
                            }
                          }}
                        />
                        <button
                          onClick={handleRunCopilot}
                          disabled={isCopilotLoading || !copilotInput.trim()}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                        >
                          {isCopilotLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          <span>Terapkan</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Visual Section Explorer (Bento Cards) */}
                  {activeTab === 'structure' && (
                    <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                      {resolvedPRD.split(/(?=\[[0-9A-Z\s._\-&/:()]+\])/g).filter(Boolean).map((chunk, idx) => {
                        const firstLine = chunk.trim().split('\n')[0] || '';
                        const body = chunk.trim().split('\n').slice(1).join('\n').trim();
                        const isTitleHeader = firstLine.startsWith('[PRODUCT REQUIREMENT DOCUMENT');
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border ${
                              isTitleHeader
                                ? 'bg-teal-900/10 border-teal-300 dark:border-teal-800'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                            } shadow-2xs space-y-2`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                              <h5 className="font-heading font-bold text-xs sm:text-sm text-teal-800 dark:text-teal-300 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                <span>{firstLine.replace(/[[\]]/g, '')}</span>
                              </h5>
                              <button
                                onClick={() => {
                                  handleCopy(chunk.trim());
                                  setSaveSuccessMsg('Seksi PRD disalin ke clipboard!');
                                  setTimeout(() => setSaveSuccessMsg(''), 2000);
                                }}
                                className="text-[11px] font-semibold text-slate-500 hover:text-teal-600 flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Salin Seksi</span>
                              </button>
                            </div>
                            <pre className="text-xs text-slate-700 dark:text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                              {body || firstLine}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TAB 3: Executive Preview Document */}
                  {activeTab === 'preview' && (
                    <div className="p-6 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-[620px] overflow-y-auto space-y-6">
                      <div className="border-b-2 border-teal-600 pb-4">
                        <div className="text-xs uppercase tracking-wider font-bold text-teal-600 mb-1 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" />
                          <span>Dokumen Spesifikasi Resmi & Engineering-Ready</span>
                        </div>
                        <h3 className="text-xl font-heading font-extrabold text-slate-900 dark:text-slate-100">
                          {resolvedFormData.productTitle || 'Product Requirement Document'}
                        </h3>
                        {resolvedFormData.tagline && (
                          <p className="text-xs text-slate-500 italic mt-1">{resolvedFormData.tagline}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            Kategori: {resolvedFormData.category}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            Target: {resolvedFormData.targetPlatform}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300">
                            Fase: {resolvedFormData.releasePhase}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="text-xs sm:text-sm font-sans text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {renderHighlightedText(generatedPRD)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: PRD Quality & Completeness Audit */}
                  {activeTab === 'audit' && (
                    <div className="space-y-5 max-h-[620px] overflow-y-auto pr-1">
                      {isAuditing ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                          <RotateCcw className="w-8 h-8 text-teal-600 animate-spin" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            AI sedang mengaudit kelengkapan dokumen PRD terhadap 6 pilar Silicon Valley...
                          </p>
                        </div>
                      ) : auditReport ? (
                        <div className="space-y-5">
                          {/* Score Card Header */}
                          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 text-white border border-teal-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400">
                                Overall PRD Readiness Score
                              </span>
                              <h4 className="text-xl font-heading font-extrabold text-white">
                                {auditReport.summary || 'Dokumen PRD siap masuk tahap sprint planning'}
                              </h4>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-center p-3 rounded-xl bg-teal-500/20 border border-teal-400/40">
                                <div className="text-3xl font-extrabold text-teal-300">
                                  {auditReport.overallScore || 92}
                                </div>
                                <div className="text-[10px] text-teal-200 font-bold uppercase">Skor / 100</div>
                              </div>
                              <div className="text-center p-3 rounded-xl bg-teal-500/20 border border-teal-400/40">
                                <div className="text-3xl font-extrabold text-teal-300">
                                  {auditReport.grade || 'A'}
                                </div>
                                <div className="text-[10px] text-teal-200 font-bold uppercase">Grade Mutu</div>
                              </div>
                            </div>
                          </div>

                          {/* Score Breakdown Radar */}
                          {auditReport.scoreBreakdown && (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                Breakdown Penilaian Seksi
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {Object.entries(auditReport.scoreBreakdown).map(([k, v]) => (
                                  <div key={k} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                                    <div className="text-xs text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</div>
                                    <div className="text-lg font-bold text-teal-600 dark:text-teal-400 mt-0.5">{String(v)}%</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Strengths & Gaps */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Strengths */}
                            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                              <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Poin Kekuatan Dokumen</span>
                              </h5>
                              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                {auditReport.strengths?.map((s: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold">✓</span>
                                    <span>{s}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Gaps / Risks */}
                            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
                              <h5 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4 text-amber-600" />
                                <span>Blind Spots & Rekomendasi Perbaikan</span>
                              </h5>
                              <div className="space-y-2 text-xs">
                                {auditReport.gapsAndRisks?.map((g: any, idx: number) => (
                                  <div key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-800 dark:text-slate-200">{g.area}</span>
                                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                        {g.severity}
                                      </span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400">{g.issue}</p>
                                    <p className="text-teal-700 dark:text-teal-400 font-medium">👉 {g.fixRecommendation}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Engineering Checklist */}
                          {auditReport.engineeringReadinessChecklist && (
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                Engineering Readiness Checklist
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {auditReport.engineeringReadinessChecklist.map((chk: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                                    {chk.passed ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                    )}
                                    <span className={chk.passed ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-amber-700 dark:text-amber-300 font-medium'}>
                                      {chk.item}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                          <Shield className="w-8 h-8 text-teal-600" />
                          <p className="text-xs text-slate-500">Klik tombol di bawah untuk mengaudit kualitas dan kesiapan PRD.</p>
                          <button
                            onClick={handleRunAudit}
                            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700"
                          >
                            Mulai Audit Kualitas PRD
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: Database & SQL Studio */}
                  {activeTab === 'database' && (
                    <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                      {isGeneratingSchema ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                          <RotateCcw className="w-8 h-8 text-teal-600 animate-spin" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Menghasilkan PostgreSQL DDL, Prisma Schema & TypeScript Types...
                          </p>
                        </div>
                      ) : schemaData ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSchemaSubTab('postgres')}
                                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                                  schemaSubTab === 'postgres'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                PostgreSQL DDL (.sql)
                              </button>
                              <button
                                onClick={() => setSchemaSubTab('prisma')}
                                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                                  schemaSubTab === 'prisma'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                Prisma Schema (.prisma)
                              </button>
                              <button
                                onClick={() => setSchemaSubTab('typescript')}
                                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                                  schemaSubTab === 'typescript'
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                TypeScript Interfaces (.ts)
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                const txt =
                                  schemaSubTab === 'postgres'
                                    ? schemaData.postgresSql
                                    : schemaSubTab === 'prisma'
                                    ? schemaData.prismaSchema
                                    : schemaData.typeScriptTypes;
                                handleCopy(txt);
                                setSaveSuccessMsg('Kode skema disalin!');
                                setTimeout(() => setSaveSuccessMsg(''), 2000);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Salin Kode</span>
                            </button>
                          </div>

                          <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                            {schemaSubTab === 'postgres' && schemaData.postgresSql}
                            {schemaSubTab === 'prisma' && schemaData.prismaSchema}
                            {schemaSubTab === 'typescript' && schemaData.typeScriptTypes}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                          <Database className="w-8 h-8 text-teal-600" />
                          <p className="text-xs text-slate-500">Buat skema tabel nyata, relasi FK, dan tipe TypeScript dari PRD ini.</p>
                          <button
                            onClick={handleGenerateSchema}
                            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700"
                          >
                            Rancang Database SQL / Prisma
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: REST API & OpenAPI Studio */}
                  {activeTab === 'api' && (
                    <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                      {isGeneratingApiSpec ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                          <RotateCcw className="w-8 h-8 text-teal-600 animate-spin" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Menyusun kontrak endpoint REST API & spesifikasi OpenAPI 3.0...
                          </p>
                        </div>
                      ) : apiSpecData ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Daftar Endpoint ({apiSpecData.endpoints?.length || 0})
                            </span>
                            <button
                              onClick={() => handleDownload('json', apiSpecData.openApiJson, 'openapi-spec')}
                              className="px-2.5 py-1 rounded bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 flex items-center gap-1 border border-teal-200 dark:border-teal-800"
                            >
                              <Download className="w-3 h-3" />
                              <span>Unduh OpenAPI JSON</span>
                            </button>
                          </div>

                          <div className="space-y-3">
                            {apiSpecData.endpoints?.map((ep: any, idx: number) => {
                              const methodColor =
                                ep.method === 'GET'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : ep.method === 'POST'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : ep.method === 'PUT' || ep.method === 'PATCH'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                              return (
                                <div
                                  key={idx}
                                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                                >
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold ${methodColor}`}>
                                        {ep.method}
                                      </span>
                                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                                        {ep.path}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-slate-500">{ep.summary}</span>
                                  </div>

                                  {/* cURL Command */}
                                  {ep.curlCommand && (
                                    <div className="p-2 rounded bg-slate-900 text-slate-200 font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto">
                                      <code className="truncate">{ep.curlCommand}</code>
                                      <button
                                        onClick={() => {
                                          handleCopy(ep.curlCommand);
                                          setSaveSuccessMsg('cURL disalin!');
                                          setTimeout(() => setSaveSuccessMsg(''), 2000);
                                        }}
                                        className="text-xs text-teal-400 hover:text-teal-300 shrink-0"
                                      >
                                        Salin cURL
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                          <Server className="w-8 h-8 text-teal-600" />
                          <p className="text-xs text-slate-500">Ekstrak endpoint REST API lengkap dengan request/response JSON.</p>
                          <button
                            onClick={handleGenerateApiSpec}
                            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700"
                          >
                            Rancang REST API & OpenAPI Spec
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 7: Mermaid.js Architecture Diagrams */}
                  {activeTab === 'diagrams' && (
                    <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                      {isGeneratingDiagrams ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                          <RotateCcw className="w-8 h-8 text-teal-600 animate-spin" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Merancang diagram arsitektur sistem, ERD & sequence journey...
                          </p>
                        </div>
                      ) : diagramsData ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setDiagramSubTab('arch')}
                                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                                  diagramSubTab === 'arch'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                System Architecture
                              </button>
                              <button
                                onClick={() => setDiagramSubTab('erd')}
                                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                                  diagramSubTab === 'erd'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                ERD Model
                              </button>
                              <button
                                onClick={() => setDiagramSubTab('sequence')}
                                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                                  diagramSubTab === 'sequence'
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                User Sequence Flow
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                const code =
                                  diagramSubTab === 'arch'
                                    ? diagramsData.systemArchitectureMermaid
                                    : diagramSubTab === 'erd'
                                    ? diagramsData.erdMermaid
                                    : diagramsData.sequenceJourneyMermaid;
                                handleCopy(code);
                                setSaveSuccessMsg('Kode Mermaid disalin!');
                                setTimeout(() => setSaveSuccessMsg(''), 2000);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Salin Mermaid</span>
                            </button>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 space-y-2">
                            <div className="text-[10px] text-slate-400 mb-1 font-sans">
                              (Salin kode ini ke Mermaid Live Editor atau Notion/GitHub Markdown)
                            </div>
                            <pre>
                              {diagramSubTab === 'arch' && diagramsData.systemArchitectureMermaid}
                              {diagramSubTab === 'erd' && diagramsData.erdMermaid}
                              {diagramSubTab === 'sequence' && diagramsData.sequenceJourneyMermaid}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                          <Workflow className="w-8 h-8 text-teal-600" />
                          <p className="text-xs text-slate-500">Rancang diagram arsitektur Mermaid.js otomatis dari PRD.</p>
                          <button
                            onClick={handleGenerateDiagrams}
                            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700"
                          >
                            Generate Diagram Arsitektur
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 8: Jira & Linear Tasks Exporter */}
                  {activeTab === 'tickets' && (
                    <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                      {isGeneratingTickets ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                          <RotateCcw className="w-8 h-8 text-teal-600 animate-spin" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Membedah PRD menjadi Epics, Stories & Tiket Backlog...
                          </p>
                        </div>
                      ) : ticketsData ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Daftar Epics & Stories Backlog
                            </span>
                            <button
                              onClick={() => handleDownload('csv', ticketsData.csvData, 'jira-backlog')}
                              className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                            >
                              <Download className="w-3 h-3" />
                              <span>Unduh Jira/Linear CSV</span>
                            </button>
                          </div>

                          <div className="space-y-3">
                            {ticketsData.epics?.map((epic: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                      {epic.id || `EPIC-${idx + 1}`}
                                    </span>
                                    <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                      {epic.title}
                                    </h5>
                                  </div>
                                  <span className="text-[11px] text-slate-500">{epic.stories?.length || 0} Stories</span>
                                </div>

                                <div className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                                  {epic.stories?.map((st: any, sIdx: number) => (
                                    <div key={sIdx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{st.title}</span>
                                        <div className="flex items-center gap-1.5">
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {st.storyPoints || 3} pts
                                          </span>
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                            {st.priority || 'P1'}
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                                        {st.role} {st.action} {st.benefit}
                                      </p>
                                      {st.acceptanceCriteria && (
                                        <p className="text-teal-600 dark:text-teal-400 text-[10px] font-mono mt-1">
                                          AC: {st.acceptanceCriteria}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                          <ListTodo className="w-8 h-8 text-teal-600" />
                          <p className="text-xs text-slate-500">Pecah PRD menjadi daftar Epics, Stories, dan file CSV siap import ke Jira atau Linear.</p>
                          <button
                            onClick={handleGenerateTickets}
                            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700"
                          >
                            Bedah Tiket Jira / Linear
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3 my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/50 dark:border-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <FileText className="w-8 h-8 stroke-1.5" />
                  </div>
                  <div>
                    <h5 className="font-heading font-bold text-sm text-slate-700 dark:text-slate-300">
                      PRD & Engineering Workstation Siap Digunakan
                    </h5>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Gunakan fitur <strong>Auto-Fill AI Wizard</strong> di atas atau pilih preset kategori untuk menyusun dokumen spesifikasi produk lengkap dengan database, API & diagram.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => handleApplyPromptTemplate(PROMPT_REQUIREMENT_TEMPLATES[0], 'replace')}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Mulai dari Template Role-Play</span>
                    </button>
                    <button
                      onClick={() => handleApplyPromptTemplate(PROMPT_REQUIREMENT_TEMPLATES[1], 'replace')}
                      className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                      Chain-of-Thought
                    </button>
                    <button
                      onClick={() => handleApplyPromptTemplate(PROMPT_REQUIREMENT_TEMPLATES[2], 'replace')}
                      className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-colors"
                    >
                      Few-Shot Exemplar
                    </button>
                    <button
                      onClick={() => handleApplyPreset('saas')}
                      className="px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 transition-colors"
                    >
                      Muat Contoh PRD SaaS B2B
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
