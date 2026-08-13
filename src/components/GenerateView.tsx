import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Save,
  Zap,
  Globe,
  ShieldCheck,
  Download,
  Star,
  Share2,
  RefreshCw,
  Code2,
  Layers,
  Bot,
  SlidersHorizontal,
  FileText,
  History,
  FileCode,
  Printer,
  ChevronDown,
  Trash2,
  Clock,
  Palette,
  X,
} from 'lucide-react';
import { FormState, PromptItem, Collection } from '../types';

interface GenerateViewProps {
  collections: Collection[];
  onSavePrompt: (prompt: PromptItem) => void;
  onOpenScoreModal: (promptText: string, title: string) => void;
  onOpenOptimizerModal: (promptText: string) => void;
  onOpenTranslatorModal: (promptText: string) => void;
}

const DEFAULT_FORM: FormState = {
  title: '',
  category: 'Development',
  subCategory: '',
  aiModel: 'Claude 3.5 Sonnet',
  language: 'Indonesian',
  programmingLanguage: '',
  framework: '',
  database: '',
  platform: '',
  stylePrompt: 'Direct All-in-One (Langsung Jadi & Lengkap)',
  designTheme: 'Glassmorphism / Glass Friendly Clean UI',
  tone: 'Professional & Technical',
  outputLanguage: 'Indonesian',
  creativity: 'Balanced (0.7)',
  length: 'Full Complete Solution (Langsung Seluruh Kode/Konten)',
  targetAudience: '',
  description: '',
  additionalReqs: '',
  negativePrompt: '',
  expectedOutput: '',
  reference: '',
};

export const GenerateView: React.FC<GenerateViewProps> = ({
  collections,
  onSavePrompt,
  onOpenScoreModal,
  onOpenOptimizerModal,
  onOpenTranslatorModal,
}) => {
  const [formData, setFormData] = useState<FormState>(() => {
    try {
      const saved = localStorage.getItem('promptforge_draft_form');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ignore old default demo titles
        if (
          parsed.title === 'Sistem Informasi Sekolah Laravel 11 Clean Architecture' ||
          parsed.title?.includes('Sistem Manajemen Tugas')
        ) {
          return DEFAULT_FORM;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading draft form from localStorage:', e);
    }
    return DEFAULT_FORM;
  });

  const [wizardInput, setWizardInput] = useState('');
  const [isWizardLoading, setIsWizardLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPRD, setIsGeneratingPRD] = useState(false);

  const [generatedPrompt, setGeneratedPrompt] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('promptforge_draft_prompt');
      if (
        saved &&
        !saved.includes('Principal Software Architect') &&
        !saved.includes('Sistem Informasi Sekolah') &&
        !saved.includes('Sistem Manajemen Tugas') &&
        !saved.includes('[ROLE & CONTEXT]')
      ) {
        return saved;
      }
    } catch (e) {
      console.error('Error loading draft prompt from localStorage:', e);
    }
    return '';
  });

  const [copied, setCopied] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [autoSavedAt, setAutoSavedAt] = useState<string>('');
  const [draftHistory, setDraftHistory] = useState<
    Array<{ id: string; timestamp: string; title: string; promptSnippet: string; formData: FormState; promptText: string }>
  >(() => {
    try {
      const saved = localStorage.getItem('promptforge_draft_versions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading draft versions:', e);
    }
    return [];
  });
  const [isDraftHistoryOpen, setIsDraftHistoryOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Auto-save mechanism: save formData and generatedPrompt to localStorage every 1.5 seconds on change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('promptforge_draft_form', JSON.stringify(formData));
        localStorage.setItem('promptforge_draft_prompt', generatedPrompt);
        const now = new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setAutoSavedAt(now);

        // Save rolling draft version snapshot if prompt or title changed significantly
        if (generatedPrompt.trim()) {
          setDraftHistory((prev) => {
            const last = prev[0];
            // Don't add duplicate snapshot if text hasn't changed
            if (last && last.promptText === generatedPrompt && last.title === formData.title) {
              return prev;
            }
            const newVersion = {
              id: `draft-${Date.now()}`,
              timestamp: `${new Date().toLocaleDateString('id-ID')} ${now}`,
              title: formData.title || 'Untitled Draft',
              promptSnippet: generatedPrompt.slice(0, 100) + '...',
              formData,
              promptText: generatedPrompt,
            };
            const updated = [newVersion, ...prev].slice(0, 15); // keep max 15 draft snapshots
            localStorage.setItem('promptforge_draft_versions', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to auto-save to localStorage:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, generatedPrompt]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // AI Wizard Handler
  const handleRunWizard = async () => {
    if (!wizardInput.trim()) return;
    setIsWizardLoading(true);
    try {
      const res = await fetch('/api/gemini/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: wizardInput }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setFormData({
          title: d.title || formData.title,
          category: d.category || 'Development',
          subCategory: d.subCategory || 'General',
          aiModel: d.aiModel || 'Claude 3.5 Sonnet',
          language: d.language || 'Indonesian',
          programmingLanguage: d.programmingLanguage || '',
          framework: d.framework || '',
          database: d.database || '',
          platform: d.platform || '',
          stylePrompt: d.stylePrompt || 'Instruction-Based',
          tone: d.tone || 'Professional & Technical',
          outputLanguage: d.outputLanguage || 'Indonesian',
          creativity: d.creativity || 'Balanced (0.7)',
          length: d.length || 'Comprehensive',
          targetAudience: d.targetAudience || 'Senior Engineer',
          description: d.description || '',
          additionalReqs: d.additionalReqs || '',
          negativePrompt: d.negativePrompt || '',
          expectedOutput: d.expectedOutput || '',
          reference: '',
        });
        // Empty generatedPrompt so output tab is empty until user clicks "Generate Master Prompt" or "Generate Dokumen PRD"
        setGeneratedPrompt('');
        setSaveSuccessMsg('Parameter form berhasil diisi otomatis! Klik "Generate Master Prompt" atau "Generate Dokumen PRD" di bawah untuk membuat prompt.');
        setTimeout(() => setSaveSuccessMsg(''), 4500);
      }
    } catch (err) {
      console.error('Wizard error', err);
    } finally {
      setIsWizardLoading(false);
    }
  };

  // Helper sanitizer to strip '#' hashtag headers and conversational intros
  const sanitizeCleanPromptText = (raw: string): string => {
    if (!raw) return '';
    let text = raw;
    // Remove conversational prefixes and codeblock wrappers
    text = text.replace(/^(tentu|berikut|ini|halo|hi|here is|here's|pasti|baik).*?\n+/i, '');
    text = text.replace(/^```markdown\n?/i, '').replace(/\n?```$/i, '');
    // Strip all leading '#' from headers
    text = text.replace(/^#+\s*/gm, '');
    // Ensure clean double newlines before section headers like [HEADER] or **HEADER**
    text = text.replace(/([^\n])\n(\[[A-Z0-9 _\-&]+\]|\*\*[A-Z0-9 _\-&]+\*\*)/g, '$1\n\n$2');
    // Normalize triple or more blank lines
    return text.replace(/\n{3,}/g, '\n\n').trim();
  };

  // Clean-up & Precision Sanitizer
  const handleCleanUpPrompt = () => {
    if (!generatedPrompt) return;
    setGeneratedPrompt(sanitizeCleanPromptText(generatedPrompt));
  };

  // Generate Prompt Handler
  const handleGeneratePrompt = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success && data.generatedPrompt) {
        setGeneratedPrompt(sanitizeCleanPromptText(data.generatedPrompt));
      }
    } catch (err) {
      console.error('Generate prompt error', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate PRD Handler (Product Requirement Document)
  const handleGeneratePRD = async () => {
    setIsGeneratingPRD(true);
    try {
      const payload = {
        title: formData.title || wizardInput || 'Aplikasi Web Enterprise',
        description: formData.description || wizardInput || 'Sistem informasi berbasis AI modern',
        category: formData.category || 'Business & Product',
        targetAudience: formData.targetAudience || 'Senior Engineer & Product Team',
        techStack: `${formData.programmingLanguage || 'TypeScript'} ${formData.framework || 'React/Laravel'} ${formData.database || 'PostgreSQL'}`,
        keyFeatures: formData.additionalReqs || formData.expectedOutput || 'Dashboard Analytics, Auth Sanctum/OAuth, Realtime Sync, Reporting System',
      };

      const res = await fetch('/api/gemini/prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.prdDocument) {
        setGeneratedPrompt(data.prdDocument);
      }
    } catch (err) {
      console.error('Generate PRD error', err);
    } finally {
      setIsGeneratingPRD(false);
    }
  };

  const handlePresetPRD = (type: 'saas' | 'ecommerce' | 'ai_agent' | 'fintech' | 'seo' | 'academic' | 'design' | 'data' | 'legal' | 'game' = 'saas') => {
    const templates = {
      saas: {
        title: 'SaaS Multi-Tenant Enterprise Platform (Clean Architecture)',
        category: 'Development',
        subCategory: 'Backend Architecture',
        aiModel: 'Claude 3.5 Sonnet',
        stylePrompt: 'Step-by-Step',
        tone: 'Professional & Technical',
        length: 'Detailed Code + Explanation',
        targetAudience: 'Lead Architect & Senior Developer',
        description: 'Merancang sistem backend B2B SaaS dengan Multi-Tenancy, Role-Based Access Control (RBAC), Subscription Billing (Stripe), dan Realtime Analytics Dashboard.',
        expectedOutput: 'Struktur folder modular, Migration schema, DTOs, Service Layer, Repository Interfaces, & Sample REST Controllers.',
        framework: 'Next.js 15 / Laravel 11',
        programmingLanguage: 'TypeScript / PHP 8.3',
        database: 'PostgreSQL + Redis',
      },
      ecommerce: {
        title: 'Mobile E-Commerce Marketplace App Specification',
        category: 'Development',
        subCategory: 'Mobile App',
        aiModel: 'GPT-4o',
        stylePrompt: 'Step-by-Step',
        tone: 'Professional & Technical',
        length: 'Comprehensive',
        targetAudience: 'Mobile Lead & Product Manager',
        description: 'Spesifikasi Aplikasi E-Commerce Multi-Vendor mencakup Katalog Produk, Payment Gateway Integration (Midtrans/Stripe), Tracking Logistik Realtime, & Sistem Review.',
        expectedOutput: 'Arsitektur Clean Flutter/React Native, State Management, API Services, & ERD Database Schema.',
        framework: 'Flutter / React Native',
        programmingLanguage: 'Dart / TypeScript',
        database: 'PostgreSQL + Redis',
      },
      ai_agent: {
        title: 'Autonomous AI Agent Workflow & RAG Pipeline',
        category: 'AI Agent',
        subCategory: 'Generative AI & RAG',
        aiModel: 'Gemini 3.6 Flash',
        stylePrompt: 'Roleplay / Persona',
        tone: 'Professional & Technical',
        length: 'Comprehensive',
        targetAudience: 'AI Engineer & LLM Developer',
        description: 'System Prompt dan Arsitektur AI Automation Engine dengan RAG (Retrieval-Augmented Generation), Document Chunking, Hybrid Vector Search, & Multi-Agent Collaboration.',
        expectedOutput: 'System Prompt Master, Vector Database Schema, LangChain/LlamaIndex Pipeline, & Guardrails Mitigation Code.',
        framework: 'LangChain / LlamaIndex',
        programmingLanguage: 'Python 3.11 / TypeScript',
        database: 'pgvector / Qdrant',
      },
      fintech: {
        title: 'Digital Banking & Secure Payment Gateway',
        category: 'CyberSec',
        subCategory: 'Fintech & Security',
        aiModel: 'Claude 3.5 Sonnet',
        stylePrompt: 'Step-by-Step',
        tone: 'Formal & Highly Secure',
        length: 'Comprehensive',
        targetAudience: 'Security Lead & Compliance Officer',
        description: 'Spesifikasi Sistem Keuangan Digital dengan ISO 27001 / PCI-DSS Compliance, KYC Verification, Fraud Detection, dan Dual-Authorization Transfer Flow.',
        expectedOutput: 'Security Audit Matrix, Data Encryption Protocol (AES-256), & Detailed Acceptance Criteria.',
        framework: 'NestJS / Go',
        programmingLanguage: 'TypeScript / Go',
        database: 'PostgreSQL (CockroachDB)',
      },
      seo: {
        title: 'Panduan Penulisan Artikel SEO Long-form & Copywriting Viral',
        category: 'Content',
        subCategory: 'SEO & Copywriting',
        aiModel: 'GPT-4o',
        stylePrompt: 'Few-Shot',
        tone: 'Engaging & Persuasive',
        length: 'Comprehensive',
        targetAudience: 'Content Marketer & SEO Specialist',
        description: 'Prompt pembuatan artikel blog SEO 2.000+ kata berperingkat tinggi di Google dengan LSI Keywords, Meta Description, Structure H1-H3, & Call to Action (CTA) kuat.',
        expectedOutput: 'Artikel terstruktur rapi dengan FAQ Schema, Internal Linking Strategy, Meta Tag, & Outline Komprehensif.',
        framework: 'AIDA / PAS Copywriting Framework',
        programmingLanguage: 'N/A (Penulisan Konten)',
        database: 'N/A',
      },
      academic: {
        title: 'Asisten Pembimbing Riset Akademik, Skripsi & Review Jurnal',
        category: 'Academic',
        subCategory: 'Riset & Metodologi',
        aiModel: 'Claude 3.5 Sonnet',
        stylePrompt: 'Roleplay / Persona',
        tone: 'Academic & Formal',
        length: 'Comprehensive',
        targetAudience: 'Dosen Pembimbing & Peneliti Utama',
        description: 'Prompt untuk mengevaluasi metodologi penelitian, menyusun Tinjauan Pustaka (Literature Review), merumuskan hipotesis, dan memverifikasi sitasi ilmiah.',
        expectedOutput: 'Matriks Kajian Pustaka, Evaluasi Kritis Metodologi, Rumusan Masalah, & Draf Kerangka Penulisan Ilmiah.',
        framework: 'Metode Kualitatif / Kuantitatif',
        programmingLanguage: 'SPSS / R / Python Data',
        database: 'Scopus / Google Scholar Index',
      },
      design: {
        title: 'Master Prompt Midjourney v6 & UI/UX Design System Specification',
        category: 'Design',
        subCategory: 'Image Gen & UI/UX',
        aiModel: 'Midjourney v6 / DALL-E 3',
        stylePrompt: 'Instruction-Based',
        tone: 'Creative & Inspiring',
        length: 'Comprehensive',
        targetAudience: 'UI/UX Designer & Prompt Visual Artist',
        description: 'Prompt master untuk menghasilkan gambar photorealistic di Midjourney v6 serta panduan Design System UI (Typography, Spacing Grid, Component Specs).',
        expectedOutput: 'Baris Prompt Midjourney dengan parameter lighting & camera, serta Design Tokens Tailwind CSS.',
        framework: 'Figma Auto-Layout / Tailwind CSS',
        programmingLanguage: 'CSS3 / Design Tokens',
        database: 'N/A',
      },
      data: {
        title: 'Query SQL Kompleks, ETL Pipeline & Analisis Data Python',
        category: 'Data Science',
        subCategory: 'Data Engineering & Analytics',
        aiModel: 'Claude 3.5 Sonnet',
        stylePrompt: 'Step-by-Step',
        tone: 'Professional & Technical',
        length: 'Detailed Code + Explanation',
        targetAudience: 'Lead Data Engineer & Business Intelligence',
        description: 'Prompt perancangan data warehouse (Star Schema), query SQL Window Functions tingkat lanjut, serta script data cleaning & visualisasi Python Pandas/Seaborn.',
        expectedOutput: 'SQL Queries, Script Python ETL, Penjelasan Statistik, & Dashboard BI Wireframe.',
        framework: 'Pandas / Apache Spark',
        programmingLanguage: 'Python 3.11 / SQL',
        database: 'Snowflake / BigQuery / PostgreSQL',
      },
      legal: {
        title: 'Penyusunan Draf Kontrak Kerja Sama & Audit Kepatuhan Hukum',
        category: 'Legal',
        subCategory: 'Legal Drafting & Risk Audit',
        aiModel: 'GPT-4o',
        stylePrompt: 'Instruction-Based',
        tone: 'Academic & Formal',
        length: 'Comprehensive',
        targetAudience: 'Legal Counsel & Risk Manager',
        description: 'Prompt penyusunan Surat Perjanjian Kerja Sama (MOU / NDA / Software License Agreement) lengkap dengan pasal perlindungan HAKI dan penyelesaian sengketa.',
        expectedOutput: 'Draf Dokumen Hukum Terstruktur dalam Format Pasal-Pasal Resmi beserta Ringkasan Audit Risiko.',
        framework: 'Hukum Perjanjian Indonesia / KUHPerdata',
        programmingLanguage: 'N/A (Legal Document)',
        database: 'N/A',
      },
      game: {
        title: 'Worldbuilding RPG Game Lore, Quest Line & Battle Mechanics',
        category: 'Game Dev',
        subCategory: 'Game Design & Lore',
        aiModel: 'Gemini 3.6 Flash',
        stylePrompt: 'Roleplay / Persona',
        tone: 'Creative & Inspiring',
        length: 'Comprehensive',
        targetAudience: 'Game Designer & Narrative Writer',
        description: 'Prompt perancangan dunia game RPG (Lore, Faksi, Dialek), dialog interaktif NPC, serta rumus matematika Stat Character & Combat Balancing.',
        expectedOutput: 'Dokumen Game Design (GDD), Pohon Dialog Branching, Tabel Stats Balancing, & Main Quest Sequence.',
        framework: 'Unity / Unreal Engine 5',
        programmingLanguage: 'C# / C++ / JSON Dialogue Tree',
        database: 'N/A',
      },
    };

    const t = templates[type] || templates.saas;
    setFormData((prev) => ({
      ...prev,
      ...t,
    }));
    setGeneratedPrompt('');
    setSaveSuccessMsg('Preset template berhasil dimuat ke form! Klik "Generate Master Prompt" atau "Generate Dokumen PRD" di bawah untuk membuat prompt.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleResetForm = () => {
    localStorage.removeItem('promptforge_draft_form');
    localStorage.removeItem('promptforge_draft_prompt');
    setFormData({
      title: '',
      category: 'Development',
      subCategory: 'General',
      aiModel: 'Claude 3.5 Sonnet',
      language: 'Indonesian',
      programmingLanguage: '',
      framework: '',
      database: '',
      platform: '',
      stylePrompt: 'Roleplay / Persona',
      tone: 'Professional & Technical',
      outputLanguage: 'Indonesian',
      creativity: 'Balanced (0.7)',
      length: 'Comprehensive',
      targetAudience: 'Senior Engineer',
      description: '',
      additionalReqs: '',
      negativePrompt: '',
      expectedOutput: '',
      reference: '',
    });
    setGeneratedPrompt('');
    setAutoSavedAt('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToLibrary = () => {
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
      content: generatedPrompt,
      isFavorite,
      isPinned: false,
      collectionId: selectedCollectionId || null,
      tags: [formData.category, formData.framework, formData.aiModel].filter(Boolean),
      score: 95,
      scoreDetail: null,
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSavePrompt(newPromptItem);
    setSaveSuccessMsg('Tersimpan di Library!');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  const handleDownloadMD = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedPrompt], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${(formData.title || 'prompt').toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setIsExportMenuOpen(false);
  };

  const handleDownloadTXT = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedPrompt], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${(formData.title || 'prompt').toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setIsExportMenuOpen(false);
  };

  const handleDownloadJSON = () => {
    const payload = {
      app: 'PromptForge AI Studio',
      title: formData.title || 'Untitled Prompt',
      createdAt: new Date().toISOString(),
      formParameters: formData,
      promptText: generatedPrompt,
    };
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${(formData.title || 'prompt').toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setIsExportMenuOpen(false);
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${formData.title || 'Prompt Export'}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; line-height: 1.6; color: #1e293b; }
            h1 { font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; background: #f8fafc; padding: 12px; rounded: 8px; }
            pre { background: #0f172a; color: #f8fafc; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>${formData.title || 'PromptForge AI Export'}</h1>
          <div class="meta">
            <strong>Category:</strong> ${formData.category} | <strong>Model:</strong> ${formData.aiModel} | <strong>Exported At:</strong> ${new Date().toLocaleString('id-ID')}
          </div>
          <pre>${generatedPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
    setIsExportMenuOpen(false);
  };

  const handleRestoreDraft = (draft: { formData: FormState; promptText: string }) => {
    setFormData(draft.formData);
    setGeneratedPrompt(draft.promptText);
    setIsDraftHistoryOpen(false);
  };

  const handleClearDraftHistory = () => {
    localStorage.removeItem('promptforge_draft_versions');
    setDraftHistory([]);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* AI Wizard Quick Bar - Dedicated for Auto-Fill Form Parameters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              AI Wizard - Auto Fill Form
            </h3>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              • Ketik ide singkat untuk mengisi 19 parameter form secara otomatis
            </span>
          </div>
          <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-800/80">
            Auto-Fill Assistant
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={wizardInput}
            onChange={(e) => setWizardInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunWizard()}
            placeholder="Ketik ide prompt singkat (misal: 'System prompt AI CS', 'Artikel SEO Skripsi Bab 2', 'B2B SaaS Laravel')..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            id="wizard-input-field"
          />
          <button
            onClick={handleRunWizard}
            disabled={isWizardLoading || isGeneratingPRD}
            id="run-wizard-btn"
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs disabled:opacity-50 shrink-0 transition-all cursor-pointer"
            title="Mengisi seluruh parameter form secara otomatis berdasarkan ide singkat Anda"
          >
            {isWizardLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            <span>Isi Form Otomatis</span>
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none text-[10px]">
          <span className="text-slate-400 font-semibold shrink-0">Coba Ide:</span>
          {[
            'B2B SaaS Clean Architecture Laravel 11',
            'Artikel Blog SEO 2000 Kata Viral',
            'Bimbingan Skripsi & Review Jurnal',
            'Midjourney v6 Photorealistic Image Prompt',
            'Autonomous AI Agent & RAG Pipeline',
            'Query SQL Window Functions & Analytics',
            'Draf Kontrak Kerja Sama (MOU & NDA)',
            'Worldbuilding Game RPG & Quest Lines',
          ].map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => {
                setWizardInput(idea);
              }}
              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/60 dark:border-slate-700 shrink-0 transition-colors cursor-pointer"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Builder (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-heading font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <span>Form Builder Parameters</span>
              </h3>
              {formData.stylePrompt?.includes('Direct') || formData.stylePrompt?.includes('Langsung') ? (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-300/80 dark:border-amber-700 flex items-center gap-1 animate-pulse">
                  <Zap className="w-3 h-3 fill-amber-500 text-amber-500" /> Mode Langsung Jadi & Lengkap
                </span>
              ) : (
                <span className="text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  Mode: {formData.stylePrompt || 'Standard'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    stylePrompt: 'Direct All-in-One (Langsung Jadi & Lengkap)',
                    length: 'Full Complete Solution (Langsung Seluruh Kode/Konten A-Z)',
                    additionalReqs: (prev.additionalReqs ? prev.additionalReqs + '\n' : '') + 'Hasilkan seluruh kode dan solusi secara LANGSUNG JADI, UTUH, LENGKAP A-Z tanpa bertanya atau meminta konfirmasi bertahap.',
                  }));
                  setSaveSuccessMsg('Mode "Langsung Jadi & Lengkap" diaktifkan!');
                  setTimeout(() => setSaveSuccessMsg(''), 3000);
                }}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                  formData.stylePrompt?.includes('Direct') || formData.stylePrompt?.includes('Langsung')
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                }`}
                title="Aktifkan Mode Prompt Langsung Jadi & Lengkap (Tanpa Basa-basi & Tanpa Tahapan)"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Set Mode Langsung Jadi</span>
              </button>
              {autoSavedAt && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60 animate-in fade-in duration-200">
                  <Check className="w-3 h-3 text-emerald-500" /> Auto-saved {autoSavedAt}
                </span>
              )}
              {draftHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsDraftHistoryOpen(true)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors"
                >
                  <History className="w-3 h-3" />
                  <span>Draft History ({draftHistory.length})</span>
                </button>
              )}
              <span className="text-[10px] text-slate-400">19 Input Variables</span>
            </div>
          </div>

          {/* Quick Preset Templates Toolbar */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <span>Preset Template Domain Siap Pakai:</span>
              <span className="text-emerald-500">1 Click Auto Fill</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {[
                { id: 'saas', label: 'SaaS B2B' },
                { id: 'seo', label: 'Artikel SEO' },
                { id: 'academic', label: 'Skripsi & Riset' },
                { id: 'design', label: 'UI & Midjourney' },
                { id: 'ai_agent', label: 'AI Agent & RAG' },
                { id: 'data', label: 'SQL & Data Science' },
                { id: 'legal', label: 'Draf Hukum' },
                { id: 'game', label: 'Game Dev Lore' },
                { id: 'fintech', label: 'Fintech Security' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetPRD(p.id as any)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 font-medium shrink-0 transition-colors shadow-2xs hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Title */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Judul Prompt
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Judul prompt yang spesifik..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category & Sub-category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori Domain
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Development">Development & Coding</option>
                  <option value="Content">Content & Copywriting</option>
                  <option value="Academic">Academic & Research</option>
                  <option value="Design">Design & UI/UX</option>
                  <option value="AI Agent">AI Agent & System Prompt</option>
                  <option value="Data Science">Data Science & SQL</option>
                  <option value="CyberSec">CyberSec & Security</option>
                  <option value="Business">Business & PRD Strategy</option>
                  <option value="Productivity">Productivity & Career</option>
                  <option value="Legal">Legal & Compliance</option>
                  <option value="Game Dev">Game Dev & Worldbuilding</option>
                  <option value="Custom">Custom Domain Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sub Kategori / Spesialisasi
                </label>
                <input
                  type="text"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleInputChange}
                  placeholder="Backend, SEO Copy, Metodologi, RAG Pipeline..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* AI Model & Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target AI Model
                </label>
                <select
                  name="aiModel"
                  value={formData.aiModel}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                >
                  <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                  <option value="Gemini 3.6 Flash">Gemini 3.6 Flash</option>
                  <option value="GPT-4o">GPT-4o</option>
                  <option value="DeepSeek V3">DeepSeek V3</option>
                  <option value="Universal AI">Universal / All Models</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Style Prompt
                </label>
                <select
                  name="stylePrompt"
                  value={formData.stylePrompt}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="Direct All-in-One (Langsung Jadi & Lengkap)">Direct All-in-One (Langsung Jadi & Lengkap)</option>
                  <option value="Roleplay / Persona">Roleplay / Persona</option>
                  <option value="Instruction-Based">Instruction-Based</option>
                  <option value="Few-Shot">Few-Shot Examples</option>
                  <option value="Step-by-Step">Step-by-Step Chain</option>
                </select>
              </div>
            </div>

            {/* Programming Lang, Framework, DB, Platform */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 truncate">
                  Bahasa Prog.
                </label>
                <input
                  type="text"
                  name="programmingLanguage"
                  value={formData.programmingLanguage}
                  onChange={handleInputChange}
                  placeholder="PHP / TS / Dart"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 truncate">
                  Framework
                </label>
                <input
                  type="text"
                  name="framework"
                  value={formData.framework}
                  onChange={handleInputChange}
                  placeholder="Laravel / React"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 truncate">
                  Database
                </label>
                <input
                  type="text"
                  name="database"
                  value={formData.database}
                  onChange={handleInputChange}
                  placeholder="PostgreSQL / Redis"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 truncate">
                  Platform
                </label>
                <input
                  type="text"
                  name="platform"
                  value={formData.platform}
                  onChange={handleInputChange}
                  placeholder="Web / Mobile / Cloud"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Tone & Output Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tone
                </label>
                <select
                  name="tone"
                  value={formData.tone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                >
                  <option value="Professional & Technical">Professional & Technical</option>
                  <option value="Direct & Concise">Direct & Concise</option>
                  <option value="Educational & Detailed">Educational & Detailed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bahasa Output
                </label>
                <select
                  name="outputLanguage"
                  value={formData.outputLanguage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                >
                  <option value="Indonesian">Indonesia</option>
                  <option value="English">English</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kreativitas
                </label>
                <select
                  name="creativity"
                  value={formData.creativity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                >
                  <option value="Balanced (0.7)">Balanced (0.7)</option>
                  <option value="High (1.0)">High (1.0)</option>
                  <option value="Strict/Exact (0.2)">Strict / Exact (0.2)</option>
                </select>
              </div>
            </div>

            {/* UI Theme & Design Style */}
            <div className="bg-purple-50/60 dark:bg-purple-950/20 p-3.5 rounded-2xl border border-purple-200/70 dark:border-purple-800/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Tema & Gaya Tampilan UI (Theme Style)</span>
                </label>
                <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300">Glassmorphism, Friendly, Soft, dsb.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  name="designTheme"
                  value={formData.designTheme}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="Glassmorphism / Glass Friendly Clean UI">Glassmorphism (Glass Friendly & Translucent)</option>
                  <option value="Soft & Friendly Pastel UI">Soft & Friendly Pastel</option>
                  <option value="Clean Minimalist Modern UI">Clean Minimalist Modern</option>
                  <option value="Dark Luxury & Sleek UI">Dark Luxury & Sleek Premium</option>
                  <option value="Cyberpunk & Futuristic Neon UI">Cyberpunk & Futuristic Neon</option>
                  <option value="Eco-Friendly & Warm Nature UI">Eco-Friendly & Warm Nature</option>
                  <option value="Neumorphism & Soft Shadows UI">Neumorphism & Soft Depth</option>
                  <option value="Corporate Professional & High Contrast">Corporate Professional</option>
                  <option value="Retro Vintage Nostalgic UI">Retro Vintage Nostalgic</option>
                  <option value="Brutalism Bold Modern UI">Brutalism Bold Modern</option>
                </select>

                <input
                  type="text"
                  name="designTheme"
                  value={formData.designTheme}
                  onChange={handleInputChange}
                  placeholder="Atau ketik tema kustom (misal: Glass Friendly + Ocean Blue)..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Quick Preset Badges */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {[
                  { label: 'Glass Friendly', value: 'Glassmorphism / Glass Friendly Clean UI' },
                  { label: 'Friendly Pastel', value: 'Soft & Friendly Pastel UI' },
                  { label: 'Clean Minimalist', value: 'Clean Minimalist Modern UI' },
                  { label: 'Dark Luxury', value: 'Dark Luxury & Sleek UI' },
                  { label: 'Cyber Neon', value: 'Cyberpunk & Futuristic Neon UI' },
                  { label: 'Eco Friendly', value: 'Eco-Friendly & Warm Nature UI' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, designTheme: preset.value }))}
                    className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                      formData.designTheme === preset.value
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-purple-200 dark:border-slate-700 hover:border-purple-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description & Requirements */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi Ide
              </label>
              <textarea
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Jelaskan secara garis besar apa yang ingin dicapai..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kebutuhan Tambahan & Negative Prompt
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <textarea
                  name="additionalReqs"
                  rows={2}
                  value={formData.additionalReqs}
                  onChange={handleInputChange}
                  placeholder="Constraint teknis atau instruksi khusus..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                />
                <textarea
                  name="negativePrompt"
                  rows={2}
                  value={formData.negativePrompt}
                  onChange={handleInputChange}
                  placeholder="Hal yang HARUS DIHINDARI AI..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePRD}
                  disabled={isGeneratingPRD || isGenerating}
                  id="generate-prd-submit-btn"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                  title="Generate Dokumen PRD (Product Requirement Document) lengkap"
                >
                  {isGeneratingPRD ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span>Generate Dokumen PRD</span>
                </button>

                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  disabled={isGenerating || isGeneratingPRD}
                  id="generate-prompt-submit-btn"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  title="Susun seluruh 19 parameter form builder menjadi Master Prompt AI tingkat lanjut"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>Generate Master Prompt</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview Prompt VS Code Style (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col min-h-[500px] lg:h-[740px]">
          {/* Top Preview Toolbar */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Preview Prompt
              </h3>
            </div>

            <div className="flex items-center gap-1">
              {/* Clean & Format Button */}
              <button
                onClick={handleCleanUpPrompt}
                className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                title="Bersihkan & Rapikan Format Prompt"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Clean & Precise</span>
              </button>

              {/* Score Button */}
              <button
                onClick={() => onOpenScoreModal(generatedPrompt, formData.title)}
                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                title="Score Prompt Audit"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Score 95</span>
              </button>

              {/* Optimize Button */}
              <button
                onClick={() => onOpenOptimizerModal(generatedPrompt)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="AI Optimize Prompt"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </button>

              {/* Translate Button */}
              <button
                onClick={() => onOpenTranslatorModal(generatedPrompt)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="AI Translate Prompt"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
              </button>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Copy Prompt"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Multi-Format Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Export Document"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isExportMenuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-1 space-y-0.5 text-xs animate-in fade-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={handleDownloadMD}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      onClick={handleDownloadTXT}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium"
                    >
                      <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Text File (.txt)</span>
                    </button>
                    <button
                      onClick={handleDownloadJSON}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium"
                    >
                      <Code2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>JSON Backup</span>
                    </button>
                    <button
                      onClick={handlePrintPDF}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-2 font-medium"
                    >
                      <Printer className="w-3.5 h-3.5 text-purple-500" />
                      <span>Print / PDF Document</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collection Assignment & Save Section */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="">-- Pilih Folder Collection --</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-xl border transition-colors ${
                isFavorite
                  ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
              }`}
              title="Pin/Favorite"
            >
              <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500' : ''}`} />
            </button>

            <button
              onClick={handleSaveToLibrary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
          </div>

          {saveSuccessMsg && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center justify-between">
              <span>{saveSuccessMsg}</span>
              <Check className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Editor Container with Realtime Stats */}
          <div className="flex-1 flex flex-col rounded-xl vscode-editor-bg border border-slate-800 overflow-hidden">
            <textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              className="flex-1 w-full h-full p-3.5 bg-transparent text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-red-900 selection:text-white"
              placeholder="Prompt atau PRD akan muncul di sini setelah Anda mengklik tombol 'Generate Master Prompt' atau 'Generate Dokumen PRD'..."
            />

            {/* Live Realtime Stats Bar */}
            <div className="bg-slate-950/90 border-t border-slate-800/80 px-3 py-2 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="text-emerald-400">●</span> {generatedPrompt.length} karakter
                </span>
                <span>•</span>
                <span>{generatedPrompt.trim() ? generatedPrompt.trim().split(/\s+/).length : 0} kata</span>
                <span>•</span>
                <span className="text-amber-400">~{Math.ceil(generatedPrompt.length / 4)} tokens</span>
                <span>•</span>
                <span>~{generatedPrompt.trim() ? Math.max(1, Math.ceil((generatedPrompt.trim().split(/\s+/).length || 0) / 200)) : 0} mnt baca</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  <span>Power Score: {generatedPrompt.trim() ? Math.min(100, Math.max(60, Math.round((generatedPrompt.length / 1000) * 85 + 15))) : 0}%</span>
                </div>
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Versions History Modal */}
      {isDraftHistoryOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsDraftHistoryOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Draft Version History (Auto-Saved)
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Pulihkan draf pekerjaan Anda jika terjadi ketidaksengajaan terhapus
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {draftHistory.length > 0 && (
                  <button
                    onClick={handleClearDraftHistory}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors text-[10px] font-semibold flex items-center gap-1"
                    title="Clear All Draft Snapshots"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Bersihkan</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDraftHistoryOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              {draftHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <Clock className="w-8 h-8 mx-auto opacity-50" />
                  <p>Belum ada histori snapshot draf otomatis.</p>
                </div>
              ) : (
                draftHistory.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                        {ver.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{ver.timestamp}</span>
                    </div>

                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 line-clamp-2">
                      {ver.promptSnippet}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-slate-400">
                        {ver.promptText.length} karakter • {ver.formData.category}
                      </span>
                      <button
                        onClick={() => handleRestoreDraft(ver)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Pulihkan Draft</span>
                      </button>
                    </div>
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
