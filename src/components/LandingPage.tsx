import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Mic,
  AlertCircle,
  Loader2,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Wand2,
  FolderKanban,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  PROMPT_REQUIREMENT_TEMPLATES,
  PromptTemplateTechnique,
} from '../data/prdPromptTemplates';
import { HeroAnimatedBackdrop } from './HeroAnimatedBackdrop';
import heroWorkspaceImg from '../assets/images/landing_hero_workspace_1795369301142.jpg';
import voiceStudioImg from '../assets/images/landing_voice_studio_1795369301496.jpg';

interface LandingPageProps {
  onEnterWorkspace?: (initialView?: 'dashboard' | 'generate' | 'prd') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

interface HeroScenario {
  id: string;
  label: string;
  mode: string;
  variables: string[];
  snippet: string;
}

const HERO_SCENARIOS: HeroScenario[] = [
  {
    id: 'architecture',
    label: 'Prompt Builder',
    mode: 'Streaming Cepat · 3 Variasi',
    variables: ['{{nama_produk}}', '{{target_pengguna}}', '{{stack_teknologi}}'],
    snippet: `[PERAN] Principal Software Architect untuk {{nama_produk}}
[TUGAS] Rancang arsitektur API, struktur data, dan alur modul
        untuk {{target_pengguna}} menggunakan {{stack_teknologi}}.
[BATASAN] Keluarkan spesifikasi teknis siap eksekusi dengan
          struktur terarah tanpa teks pengantar.`,
  },
  {
    id: 'prd',
    label: 'PRD Studio',
    mode: 'Dokumen Produk · Template',
    variables: ['{{fitur_utama}}', '{{metrik_sukses}}'],
    snippet: `[RINGKASAN PRODUK] Spesifikasi fitur {{fitur_utama}}
[ALUR PENGGUNA] Langkah utama, skenario batas, dan spesifikasi
                antarmuka yang terstruktur.
[KRITERIA SUKSES] Terukur langsung pada {{metrik_sukses}}
                  dengan urutan prioritas P0 hingga P2.`,
  },
  {
    id: 'voice',
    label: 'Auto-Fill Suara',
    mode: 'Input Mikrofon · Pengisian Form',
    variables: ['{{gaya_bahasa}}', '{{audiens}}'],
    snippet: `[INPUT SUARA] "Buatkan prompt copywriting halaman produk untuk
              {{audiens}} dengan gaya {{gaya_bahasa}}..."
[HASIL FORM] Judul, kategori, deskripsi, dan format output
             terisi otomatis tanpa perlu mengetik panjang.`,
  },
];

interface RevealOnScrollProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

/**
 * Compositor-only scroll entrance wrapper (transform + opacity).
 * Immediately visible if prefers-reduced-motion is enabled.
 */
const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  delayMs = 0,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0, 0, 0)' : 'translate3d(0, 28px, 0)',
        transitionProperty: 'transform, opacity',
        transitionDuration: '700ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delayMs}ms`,
        willChange: visible ? 'auto' : 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterWorkspace,
  theme,
  onToggleTheme,
}) => {
  const {
    user,
    authReady,
    profileReady,
    isSigningIn,
    authError,
    signInWithGoogle,
    signOutUser,
    retryWorkspaceInit,
    clearAuthError,
  } = useAuth();

  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [voiceImgFailed, setVoiceImgFailed] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(HERO_SCENARIOS[0].id);
  const [selectedTechnique, setSelectedTechnique] = useState<'Semua' | PromptTemplateTechnique>(
    'Semua'
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    PROMPT_REQUIREMENT_TEMPLATES[0]?.id || ''
  );
  const [pastHero, setPastHero] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [heroParallaxY, setHeroParallaxY] = useState(0);
  const [localDark, setLocalDark] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  const isDark = theme ? theme === 'dark' : localDark;
  const isAuthenticatedReady = Boolean(user && profileReady);
  const isInitializing = !authReady || (Boolean(user) && !profileReady && !authError);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;

    const updateScrollMetrics = () => {
      const y = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = docHeight > 0 ? Math.min(1, Math.max(0, y / docHeight)) : 0;
      const heroCutoff = Math.max(420, window.innerHeight - 96);
      setPastHero(y > heroCutoff);
      setScrollProgress(progress);
      if (!reducedMotion) {
        setHeroParallaxY(Math.min(32, y * 0.06));
      }
      rafId = 0;
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateScrollMetrics);
      }
    };

    updateScrollMetrics();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
      return;
    }
    const next = !localDark;
    setLocalDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handlePrimaryAction = (targetView: 'dashboard' | 'generate' | 'prd' = 'dashboard') => {
    if (isAuthenticatedReady && onEnterWorkspace) {
      onEnterWorkspace(targetView);
      return;
    }
    void signInWithGoogle();
  };

  const activeScenario = useMemo(
    () => HERO_SCENARIOS.find((s) => s.id === activeScenarioId) || HERO_SCENARIOS[0],
    [activeScenarioId]
  );

  const techniques = useMemo<Array<'Semua' | PromptTemplateTechnique>>(() => {
    const unique = Array.from(new Set(PROMPT_REQUIREMENT_TEMPLATES.map((t) => t.technique)));
    return ['Semua', ...unique.slice(0, 5)];
  }, []);

  const visibleTemplates = useMemo(() => {
    if (selectedTechnique === 'Semua') return PROMPT_REQUIREMENT_TEMPLATES;
    return PROMPT_REQUIREMENT_TEMPLATES.filter((t) => t.technique === selectedTechnique);
  }, [selectedTechnique]);

  const activeTemplate = useMemo(() => {
    return (
      visibleTemplates.find((t) => t.id === activeTemplateId) ||
      visibleTemplates[0] ||
      PROMPT_REQUIREMENT_TEMPLATES[0]
    );
  }, [visibleTemplates, activeTemplateId]);

  const previewLines = useMemo(() => {
    if (!activeTemplate) return '';
    return activeTemplate.templateContent.split('\n').slice(0, 14).join('\n');
  }, [activeTemplate]);

  const containerClass = 'w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10';

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-200">
      {/* Top Bar — Strict 3-Zone Contract with Extra-Wide Side Margins & Scroll Progress */}
      <header
        className={`fixed top-0 inset-x-0 z-40 h-16 transition-colors duration-200 ${
          pastHero
            ? 'bg-white/92 dark:bg-slate-950/92 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80'
            : 'bg-[#070B14]/70 backdrop-blur-md border-b border-white/10'
        }`}
      >
        <div className={`${containerClass} h-full flex items-center justify-between gap-8`}>
          <a
            href="#top"
            className={`font-heading text-lg font-bold tracking-tight whitespace-nowrap shrink-0 transition-colors ${
              pastHero ? 'text-slate-900 dark:text-white' : 'text-white'
            }`}
          >
            PromptForge
          </a>

          <nav
            aria-label="Navigasi utama"
            className={`hidden md:flex items-center gap-8 text-sm font-medium transition-colors ${
              pastHero ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300'
            }`}
          >
            <a
              href="#fitur"
              className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                pastHero ? 'hover:text-slate-900 dark:hover:text-white' : 'hover:text-white'
              }`}
            >
              Fitur
            </a>
            <a
              href="#modul"
              className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                pastHero ? 'hover:text-slate-900 dark:hover:text-white' : 'hover:text-white'
              }`}
            >
              Modul Studio
            </a>
            <a
              href="#template"
              className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                pastHero ? 'hover:text-slate-900 dark:hover:text-white' : 'hover:text-white'
              }`}
            >
              Template
            </a>
            <a
              href="#cara-kerja"
              className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                pastHero ? 'hover:text-slate-900 dark:hover:text-white' : 'hover:text-white'
              }`}
            >
              Cara Kerja
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => handlePrimaryAction('dashboard')}
              disabled={isSigningIn || isInitializing}
              id="landing-nav-cta"
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer ${
                pastHero
                  ? 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-white hover:bg-slate-100 text-slate-950'
              }`}
            >
              {isSigningIn
                ? 'Memproses...'
                : isAuthenticatedReady
                  ? 'Buka Workspace'
                  : 'Mulai Sekarang'}
            </button>
          </div>
        </div>

        {/* GPU Scroll Progress Hairline */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-emerald-500"
          style={{
            transform: `scaleX(${scrollProgress})`,
            transition: 'transform 60ms linear',
          }}
        />
      </header>

      <main id="top">
        {/* Section 1: Single-Viewport Desktop Animated Hero */}
        <section className="relative overflow-hidden bg-[#070B14] text-white pt-24 pb-16 sm:pt-28 sm:pb-20 lg:h-[100dvh] lg:min-h-[620px] lg:max-h-[920px] lg:pt-20 lg:pb-8 flex items-center">
          <HeroAnimatedBackdrop />

          <div className={`relative z-10 w-full ${containerClass}`}>
            {/* Wide Left-Right Separation: col-span-5 left + empty gutter column + col-span-6 right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-y-0 lg:gap-x-12 items-center">
              {/* Left Proposition Column */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div className="space-y-5 lg:space-y-6">
                  <p className="text-xs font-medium tracking-wide text-emerald-300/90">
                    Prompt Engineering Studio
                    <span aria-hidden="true" className="mx-2.5 text-slate-600">
                      ·
                    </span>
                    <span className="text-slate-300">Cepat, Rapi &amp; Terstruktur</span>
                  </p>

                  <h1
                    className="font-heading font-extrabold tracking-tight text-white leading-[1.07]"
                    style={{ fontSize: 'clamp(2.15rem, 3.6vw, 3.45rem)', textWrap: 'balance' }}
                  >
                    Rancang Master Prompt dan Dokumen PRD Lebih Cepat.
                  </h1>

                  <p className="text-base sm:text-[17px] text-slate-300 leading-relaxed max-w-xl">
                    Tulis atau ucapkan ide lewat mikrofon, susun menjadi instruksi AI yang presisi dengan variabel otomatis, lalu uji hasilnya langsung di Playground.
                  </p>

                  {isInitializing && (
                    <div className="p-4 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md flex items-center gap-3 max-w-md">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                      <p className="text-xs font-medium text-slate-200">
                        Menyiapkan ruang kerja...
                      </p>
                    </div>
                  )}

                  {authError && (
                    <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/30 text-xs text-red-200 space-y-3 max-w-md">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{authError}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            clearAuthError();
                            if (user) {
                              void retryWorkspaceInit();
                            } else {
                              void signInWithGoogle();
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Coba Lagi
                        </button>
                        {user && (
                          <button
                            type="button"
                            onClick={() => void signOutUser()}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-red-100 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Keluar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Primary Action Row */}
                  <div className="flex flex-wrap items-center gap-7 pt-2">
                    <button
                      type="button"
                      onClick={() => handlePrimaryAction('dashboard')}
                      disabled={isSigningIn || isInitializing}
                      id="google-login-btn"
                      className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
                    >
                      {isSigningIn ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <span>{isAuthenticatedReady ? 'Buka Workspace' : 'Mulai Sekarang'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <a
                      href="#template"
                      className="text-sm font-medium text-slate-300 hover:text-white underline-offset-4 hover:underline transition-colors whitespace-nowrap"
                    >
                      Lihat template bawaan
                    </a>
                  </div>
                </div>

                {/* Clean Unboxed Feature Line */}
                <div className="pt-7 mt-7 lg:pt-8 lg:mt-8 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  <span>Streaming Real-Time</span>
                  <span aria-hidden="true">·</span>
                  <span>Auto-Fill Suara</span>
                  <span aria-hidden="true">·</span>
                  <span>Deteksi Variabel Otomatis</span>
                  <span aria-hidden="true">·</span>
                  <span>Playground Multi-Model</span>
                </div>
              </div>

              {/* Right Interactive Showcase Column with Subtle Scroll Parallax */}
              <div
                className="lg:col-span-6 lg:col-start-7 flex flex-col"
                style={{
                  transform: `translate3d(0, ${-heroParallaxY}px, 0)`,
                  willChange: 'transform',
                }}
              >
                <div className="rounded-2xl overflow-hidden border border-white/12 bg-slate-900/75 backdrop-blur-xl flex flex-col justify-between">
                  {/* Editorial Media Frame */}
                  <div className="relative h-44 sm:h-48 lg:h-44 xl:h-52 w-full overflow-hidden border-b border-white/10 bg-slate-900">
                    {!heroImgFailed ? (
                      <img
                        src={heroWorkspaceImg}
                        alt="Meja kerja studio desain perangkat lunak minimalis dengan pencahayaan alami"
                        referrerPolicy="no-referrer"
                        onError={() => setHeroImgFailed(true)}
                        className="w-full h-full object-cover opacity-85"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950 flex items-center justify-center">
                        <Sparkles className="w-9 h-9 text-emerald-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/35 to-transparent" />
                    <div className="absolute bottom-3.5 inset-x-6 flex items-center justify-between gap-4">
                      <span className="text-xs font-medium text-slate-200">
                        {activeScenario.mode}
                      </span>
                      <span className="font-mono text-xs text-emerald-300 tabular-nums">
                        {activeScenario.variables.length} variabel terdeteksi
                      </span>
                    </div>
                  </div>

                  {/* Interactive Scenario Tabs + Live Prompt Preview */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-4">
                      <div
                        role="tablist"
                        aria-label="Contoh fitur prompt"
                        className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.05] border border-white/10 w-fit max-w-full overflow-x-auto"
                      >
                        {HERO_SCENARIOS.map((sc) => {
                          const selected = sc.id === activeScenario.id;
                          return (
                            <button
                              key={sc.id}
                              type="button"
                              role="tab"
                              aria-selected={selected}
                              onClick={() => setActiveScenarioId(sc.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                selected
                                  ? 'bg-white text-slate-950'
                                  : 'text-slate-300 hover:text-white'
                              }`}
                            >
                              {sc.label}
                            </button>
                          );
                        })}
                      </div>

                      <pre className="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-200 whitespace-pre-wrap overflow-x-auto">
                        {activeScenario.snippet}
                      </pre>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="font-mono text-emerald-300/95 truncate">
                        {activeScenario.variables.join('  ·  ')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handlePrimaryAction(activeScenario.id === 'prd' ? 'prd' : 'generate')
                        }
                        className="text-slate-200 hover:text-white font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        <span>Coba fitur ini</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Core Capabilities — Spacious Asymmetric Bento Grid with Scroll Reveal */}
        <section
          id="fitur"
          className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 py-24 sm:py-32"
        >
          <div className={`${containerClass} space-y-16`}>
            <RevealOnScroll>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end">
                <div className="lg:col-span-6 space-y-3">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Fitur Utama
                  </p>
                  <h2
                    className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    Satu ruang kerja bersih untuk menyusun, menguji, dan menyempurnakan prompt.
                  </h2>
                </div>
                <div className="lg:col-span-5 lg:col-start-8">
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    Semua alat prompt engineering dikumpulkan dalam satu tampilan yang rapi—mulai dari generator streaming, pengisian suara, hingga evaluasi dan ekspor dokumen.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            {/* Asymmetric 12-Column Bento with Wide Gutters & Staggered Scroll Reveals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              {/* 01 — Wide Primary Capability */}
              <RevealOnScroll delayMs={40} className="lg:col-span-7 flex">
                <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 p-8 sm:p-10 flex flex-col justify-between gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                        01. Generator Prompt &amp; Streaming Cepat
                      </h3>
                      <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                      Hasil prompt langsung mengalir secara real-time dalam hitungan detik. Anda juga bisa menghasilkan 3 variasi strategi sekaligus, membersihkan kalimat meta, dan mengaudit struktur instruksi sebelum dipakai.
                    </p>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        Streaming Langsung
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Teks muncul instan tanpa menunggu seluruh dokumen selesai.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        Injeksi Variabel
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Deteksi otomatis sintaks <code className="font-mono">{`{{variabel}}`}</code> menjadi form input.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        3 Variasi Strategi
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Bandingkan gaya ketat, kreatif, dan step-by-step dari satu ide.
                      </p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>

              {/* 02 — Voice Auto-Fill with Visual */}
              <RevealOnScroll delayMs={120} className="lg:col-span-5 flex">
                <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 overflow-hidden flex flex-col justify-between">
                  <div className="aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-b border-slate-200 dark:border-slate-800">
                    {!voiceImgFailed ? (
                      <img
                        src={voiceStudioImg}
                        alt="Mikrofon kondensor studio minimalis di atas meja batu"
                        referrerPolicy="no-referrer"
                        onError={() => setVoiceImgFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                        <Mic className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-8 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                        02. Auto-Fill dari Suara
                      </h3>
                      <Mic className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Ucapkan ide lewat mikrofon tanpa perlu mengetik panjang. Suara ditranskrip otomatis lalu dipetakan langsung ke seluruh kolom form Prompt maupun PRD.
                    </p>
                  </div>
                </div>
              </RevealOnScroll>

              {/* 03 — PRD Studio */}
              <RevealOnScroll delayMs={80} className="lg:col-span-5 flex">
                <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 p-8 sm:p-10 flex flex-col justify-between gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                        03. PRD Studio &amp; Ekspor Dokumen
                      </h3>
                      <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Susun Product Requirements Document lengkap mulai dari rumusan masalah, alur pengguna, fitur prioritas, hingga spesifikasi prompt siap ekspor ke Markdown dan PDF.
                    </p>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-5 flex items-center justify-between">
                    <span>Format Markdown &amp; PDF</span>
                    <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                      {PROMPT_REQUIREMENT_TEMPLATES.length} template bawaan
                    </span>
                  </div>
                </div>
              </RevealOnScroll>

              {/* 04 — Playground, Optimizer & Media */}
              <RevealOnScroll delayMs={160} className="lg:col-span-7 flex">
                <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 p-8 sm:p-10 flex flex-col justify-between gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                        04. Playground Multi-Model, Optimizer &amp; Media Studio
                      </h3>
                      <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                      Bandingkan beberapa variasi prompt secara berdampingan di Playground, tingkatkan kualitas instruksi lewat Optimizer &amp; Translator, serta buat konsep visual di Media Studio.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6 border-t border-slate-200 dark:border-slate-800 pt-6">
                    <div>
                      <p className="font-heading text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                        {PROMPT_REQUIREMENT_TEMPLATES.length}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Template Struktur
                      </p>
                    </div>
                    <div>
                      <p className="font-heading text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                        3
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Varian Uji Paralel
                      </p>
                    </div>
                    <div>
                      <p className="font-heading text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                        4
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Format Ekspor File
                      </p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* Section 3: Studio Modules Breakdown with Scroll Reveal */}
        <section
          id="modul"
          className="border-t border-slate-200/80 dark:border-slate-800/80 py-24 sm:py-28"
        >
          <div className={`${containerClass} space-y-14`}>
            <RevealOnScroll>
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Modul di Dalam Aplikasi
                </p>
                <h2
                  className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Alat pelengkap untuk merapikan seluruh alur kerja prompt Anda.
                </h2>
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
              <RevealOnScroll delayMs={40}>
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <Wand2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                    Prompt Optimizer &amp; Audit
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Periksa kejelasan konteks, batasan negatif, serta struktur output, lalu sempurnakan atau terjemahkan prompt dalam satu klik.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delayMs={110}>
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                    Injeksi Variabel Dinamis
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Setiap tanda kurung ganda otomatis menjadi kolom isian agar prompt yang sama mudah digunakan ulang untuk berbagai proyek.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delayMs={180}>
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                    Media Studio Visual
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Rancang prompt visual dengan pilihan gaya fotografi, rasio aspek, pencahayaan, dan pergerakan kamera secara langsung.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delayMs={250}>
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <FolderKanban className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                    Library, Folder &amp; Riwayat
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Kelompokkan prompt ke folder koleksi, tandai favorit, lacak riwayat perubahan, dan cari cepat dengan pintasan keyboard.
                  </p>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* Section 4: Interactive Built-In Template Library Preview */}
        <section
          id="template"
          className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 py-24 sm:py-32"
        >
          <div className={`${containerClass} space-y-14`}>
            <RevealOnScroll>
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="max-w-xl space-y-3">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Pustaka Template Bawaan
                  </p>
                  <h2
                    className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    Mulai dari struktur prompt siap pakai yang sudah teruji.
                  </h2>
                </div>

                {/* Interactive Segmented Filter Tabs */}
                <div
                  role="tablist"
                  aria-label="Filter teknik template"
                  className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto max-w-full"
                >
                  {techniques.map((tech) => {
                    const isActive = selectedTechnique === tech;
                    return (
                      <button
                        key={tech}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => {
                          setSelectedTechnique(tech);
                          const firstMatch =
                            tech === 'Semua'
                              ? PROMPT_REQUIREMENT_TEMPLATES[0]
                              : PROMPT_REQUIREMENT_TEMPLATES.find((t) => t.technique === tech);
                          if (firstMatch) setActiveTemplateId(firstMatch.id);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tech}
                      </button>
                    );
                  })}
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayMs={100}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-stretch">
                {/* Template Selector List */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 divide-y divide-slate-200/70 dark:divide-slate-800 overflow-hidden">
                  {visibleTemplates.map((tpl) => {
                    const isSelected = activeTemplate?.id === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setActiveTemplateId(tpl.id)}
                        className={`w-full text-left p-6 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/35'
                            : 'hover:bg-white dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-heading text-sm font-semibold text-slate-900 dark:text-white">
                            {tpl.name}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                            {tpl.variables.length} var
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2.5">
                          {tpl.technique}
                          <span aria-hidden="true" className="mx-1.5">
                            ·
                          </span>
                          {tpl.useCase.split(',')[0]}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Live Template Preview Panel */}
                {activeTemplate && (
                  <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 p-8 sm:p-10 flex flex-col justify-between gap-6">
                    <div className="space-y-5">
                      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-5">
                        <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                          {activeTemplate.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                          {activeTemplate.technique}
                          <span aria-hidden="true" className="mx-2">
                            ·
                          </span>
                          {activeTemplate.useCase}
                        </p>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-800 dark:text-slate-200 mr-2">
                          Variabel otomatis:
                        </span>
                        <span className="font-mono text-emerald-700 dark:text-emerald-400">
                          {activeTemplate.variables.map((v) => `{{${v.name}}}`).join('  ·  ')}
                        </span>
                      </div>

                      <div className="rounded-xl bg-[#0B1120] text-slate-200 p-6 overflow-x-auto border border-slate-800">
                        <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                          {previewLines}
                        </pre>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Tersedia langsung di PRD Studio.
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePrimaryAction('prd')}
                        disabled={isSigningIn || isInitializing}
                        className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Gunakan Template Ini</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* Section 5: Workflow Steps + Focused Product CTA */}
        <section
          id="cara-kerja"
          className="border-t border-slate-200/80 dark:border-slate-800/80 py-24 sm:py-32"
        >
          <div className={`${containerClass} space-y-20`}>
            <RevealOnScroll>
              <div className="max-w-xl space-y-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Cara Kerja
                </p>
                <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Tiga langkah dari ide mentah ke prompt siap pakai.
                </h2>
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
              <RevealOnScroll delayMs={40}>
                <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
                    01
                  </p>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                    Tulis atau Rekam Ide
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ketik gambaran singkat atau gunakan tombol mikrofon untuk mengisi parameter prompt secara otomatis tanpa mengetik satu per satu.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delayMs={130}>
                <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
                    02
                  </p>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                    Isi Variabel &amp; Uji di Playground
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Setiap placeholder <code className="font-mono text-xs">{`{{variabel}}`}</code> otomatis menjadi kolom isi. Uji hasilnya secara berdampingan di Playground sebelum digunakan.
                  </p>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delayMs={220}>
                <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
                    03
                  </p>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                    Simpan &amp; Kelola di Library
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Organisir prompt terbaik ke dalam folder proyek, tandai favorit, atau ekspor ke format Markdown, TXT, JSON, maupun PDF kapan saja.
                  </p>
                </div>
              </RevealOnScroll>
            </div>

            {/* Clean Closing CTA Block — Focused Strictly on Product Action */}
            <RevealOnScroll delayMs={80}>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 sm:p-14 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <h2
                    className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    Siap mulai menyusun prompt yang lebih terarah?
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                    Buka studio sekarang untuk mencoba generator streaming cepat, Auto-Fill suara, PRD Studio, dan pustaka template bawaan.
                  </p>
                </div>

                <div className="lg:col-span-4 lg:col-start-9 flex lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handlePrimaryAction('dashboard')}
                    disabled={isSigningIn || isInitializing}
                    className="w-full sm:w-auto px-7 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
                  >
                    <span>{isAuthenticatedReady ? 'Buka Workspace' : 'Mulai Sekarang'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-[#FAFAFA] dark:bg-slate-950">
        <div
          className={`${containerClass} py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400`}
        >
          <div className="flex items-center gap-4">
            <span className="font-heading font-bold text-slate-900 dark:text-white text-sm">
              PromptForge
            </span>
            <span aria-hidden="true">·</span>
            <span>© {new Date().getFullYear()} PromptForge Studio</span>
          </div>

          <div className="flex flex-wrap items-center gap-7">
            <a href="#fitur" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Fitur
            </a>
            <a href="#modul" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Modul Studio
            </a>
            <a href="#template" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Template
            </a>
            <a href="#cara-kerja" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Cara Kerja
            </a>
            <button
              type="button"
              onClick={handleToggleTheme}
              className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
