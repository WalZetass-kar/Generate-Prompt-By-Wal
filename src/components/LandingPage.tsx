import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  Mic,
  ShieldCheck,
  AlertCircle,
  Loader2,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  FileText,
  Layers,
  FlaskConical,
  Check,
  Lock,
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
    label: 'Arsitektur API',
    mode: 'Prompt Builder · Streaming',
    variables: ['{{nama_produk}}', '{{target_pengguna}}', '{{stack_backend}}'],
    snippet: `[PERAN] Principal Software Architect untuk {{nama_produk}}
[TUGAS] Rancang kontrak REST API, validasi skema, dan kontrol akses
        untuk {{target_pengguna}} menggunakan {{stack_backend}}.
[BATASAN] Hindari penjelasan pengantar; keluarkan spesifikasi teknis
          siap eksekusi dalam struktur modular.`,
  },
  {
    id: 'prd',
    label: 'Dokumen PRD',
    mode: 'PRD Studio · Template',
    variables: ['{{fitur_utama}}', '{{metrik_sukses}}'],
    snippet: `[RINGKASAN PRODUK] Spesifikasi modul {{fitur_utama}}
[ALUR PENGGUNA] Langkah onboarding, validasi state kosong, dan
                penanganan error yang eksplisit.
[KRITERIA SUKSES] Terukur secara objektif pada {{metrik_sukses}}
                  dengan daftar prioritas P0 hingga P2.`,
  },
  {
    id: 'voice',
    label: 'Voice Auto-Fill',
    mode: 'Transkrip Suara · Otomatis',
    variables: ['{{gaya_bahasa}}', '{{audiens}}'],
    snippet: `[INPUT SUARA] "Buatkan prompt copywriting halaman produk SaaS
              untuk {{audiens}} dengan nada {{gaya_bahasa}}..."
[PEMETAAN FORM] Judul, kategori, struktur output, dan batasan
                negatif terisi otomatis dalam satu klik.`,
  },
];

const GoogleMark: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

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
  const [selectedTechnique, setSelectedTechnique] = useState<'Semua' | PromptTemplateTechnique>('Semua');
  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    PROMPT_REQUIREMENT_TEMPLATES[0]?.id || ''
  );
  const [pastHero, setPastHero] = useState(false);
  const [localDark, setLocalDark] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  const isDark = theme ? theme === 'dark' : localDark;
  const isAuthenticatedReady = Boolean(user && profileReady);
  const isInitializing = !authReady || (Boolean(user) && !profileReady && !authError);

  useEffect(() => {
    const onScroll = () => {
      setPastHero(window.scrollY > 560);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-200">
      {/* Top Bar — Strict 3-Zone Contract with Wide Horizontal Breathing Room */}
      <header
        className={`fixed top-0 inset-x-0 z-40 h-16 transition-colors duration-200 ${
          pastHero
            ? 'bg-white/92 dark:bg-slate-950/92 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80'
            : 'bg-[#070B14]/70 backdrop-blur-md border-b border-white/10'
        }`}
      >
        <div className="max-w-[1440px] mx-auto h-full px-8 sm:px-14 lg:px-20 xl:px-28 flex items-center justify-between gap-8">
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
              pastHero
                ? 'text-slate-600 dark:text-slate-300'
                : 'text-slate-300'
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
            <a
              href="#keamanan"
              className={`hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                pastHero ? 'hover:text-slate-900 dark:hover:text-white' : 'hover:text-white'
              }`}
            >
              Keamanan
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
              {isAuthenticatedReady
                ? 'Buka Workspace'
                : isSigningIn
                  ? 'Menghubungkan...'
                  : 'Masuk dengan Google'}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Section 1: Cinema-Grade Animated Hero with Expansive Left-Right Spacing */}
        <section className="relative overflow-hidden bg-[#070B14] text-white pt-28 sm:pt-36 pb-20 sm:pb-28 lg:min-h-[88vh] flex items-center">
          <HeroAnimatedBackdrop />

          <div className="relative z-10 w-full max-w-[1440px] mx-auto px-8 sm:px-14 lg:px-20 xl:px-28">
            {/* Wide Left-Right Separation: col-span-5 on left, full empty gutter column, col-span-6 on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-14 lg:gap-y-0 lg:gap-x-12 items-stretch">
              {/* Left Proposition Column */}
              <div className="lg:col-span-5 flex flex-col justify-between py-2">
                <div className="space-y-7">
                  <p className="text-xs font-medium tracking-wide text-emerald-300/90">
                    Prompt Engineering Workspace
                    <span aria-hidden="true" className="mx-2.5 text-slate-600">
                      ·
                    </span>
                    <span className="text-slate-300">Firebase Cloud Multi-User</span>
                  </p>

                  <h1
                    className="font-heading font-extrabold tracking-tight text-white leading-[1.09]"
                    style={{ fontSize: 'clamp(2.35rem, 4.1vw, 3.65rem)', textWrap: 'balance' }}
                  >
                    Rancang Master Prompt dan Dokumen PRD Lebih Cepat.
                  </h1>

                  <p className="text-base sm:text-[17px] text-slate-300 leading-relaxed max-w-lg">
                    Tulis atau ucapkan ide lewat suara, ubah menjadi prompt terstruktur lengkap dengan variabel otomatis, lalu simpan seluruh proyek secara aman di akun Google Anda.
                  </p>

                  {isInitializing && (
                    <div className="p-4 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-md flex items-center gap-3 max-w-md">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-white">
                          {user ? 'Menyiapkan ruang kerja cloud Anda...' : 'Memeriksa sesi login...'}
                        </p>
                        {user?.email && (
                          <p className="text-slate-400 truncate mt-0.5">{user.email}</p>
                        )}
                      </div>
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
                            <span>Ganti Akun</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Primary Action Row */}
                  <div className="flex flex-wrap items-center gap-6 pt-2">
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
                          <span>Menghubungkan ke Google...</span>
                        </>
                      ) : isAuthenticatedReady ? (
                        <>
                          <span>Masuk ke Workspace</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                            <GoogleMark />
                          </span>
                          <span>Mulai dengan Akun Google</span>
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

                {/* Clean Unboxed Proof Line */}
                <div className="pt-12 mt-10 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  <span>Streaming Real-Time</span>
                  <span aria-hidden="true">·</span>
                  <span>Auto-Fill Suara</span>
                  <span aria-hidden="true">·</span>
                  <span>Deteksi Variabel Otomatis</span>
                  <span aria-hidden="true">·</span>
                  <span>Sinkronisasi Cloud</span>
                </div>
              </div>

              {/* Right Dominant Interactive Showcase Column — Separated by a Full Empty Gutter Column */}
              <div className="lg:col-span-6 lg:col-start-7 flex flex-col">
                <div className="h-full rounded-2xl overflow-hidden border border-white/12 bg-slate-900/75 backdrop-blur-xl flex flex-col justify-between">
                  {/* Top Editorial Media Frame */}
                  <div className="relative h-52 sm:h-60 w-full overflow-hidden border-b border-white/10 bg-slate-900">
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
                    <div className="absolute bottom-4 inset-x-6 flex items-center justify-between gap-4">
                      <span className="text-xs font-medium text-slate-200">
                        {activeScenario.mode}
                      </span>
                      <span className="font-mono text-xs text-emerald-300 tabular-nums">
                        {activeScenario.variables.length} variabel terdeteksi
                      </span>
                    </div>
                  </div>

                  {/* Interactive Scenario Tabs + Live Structured Prompt Preview */}
                  <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
                    <div className="space-y-5">
                      <div
                        role="tablist"
                        aria-label="Contoh skenario prompt"
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
                        <span>Coba langsung</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Core Capabilities — Spacious Asymmetric Bento Grid */}
        <section
          id="fitur"
          className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 py-24 sm:py-32"
        >
          <div className="max-w-[1440px] mx-auto px-8 sm:px-14 lg:px-20 xl:px-28 space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-6 space-y-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Kemampuan Inti
                </p>
                <h2
                  className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Satu ruang kerja bersih untuk menyusun, menguji, dan merapikan prompt.
                </h2>
              </div>
              <div className="lg:col-span-5 lg:col-start-8">
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                  Workspace dimulai benar-benar kosong tanpa data contoh yang mengganggu—hanya template bawaan yang tersedia sampai Anda menyimpan prompt dan folder proyek Anda sendiri.
                </p>
              </div>
            </div>

            {/* Asymmetric 12-Column Bento with Wide Gutters */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
              {/* 01 — Wide Primary Capability */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 p-8 sm:p-10 flex flex-col justify-between gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                      01. Generator Prompt &amp; Streaming Cepat
                    </h3>
                    <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                    Hasil prompt langsung mengalir secara real-time dalam hitungan detik. Anda juga bisa membuat 3 variasi strategi sekaligus, membersihkan kalimat meta, dan mengaudit struktur instruksi sebelum disalin.
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

              {/* 02 — Voice Auto-Fill with Visual */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 overflow-hidden flex flex-col justify-between">
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
                    Cukup bicara lewat mikrofon tanpa perlu mengetik panjang. Suara ditranskrip otomatis lalu dipetakan langsung ke seluruh kolom form Prompt maupun PRD.
                  </p>
                </div>
              </div>

              {/* 03 — PRD Studio */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 p-8 sm:p-10 flex flex-col justify-between gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                      03. PRD Studio &amp; Template Bawaan
                    </h3>
                    <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Susun Product Requirements Document lengkap mulai dari masalah, arsitektur, alur pengguna, hingga spesifikasi prompt menggunakan struktur template yang sudah disiapkan.
                  </p>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-5 flex items-center justify-between">
                  <span>Export Markdown &amp; PDF</span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {PROMPT_REQUIREMENT_TEMPLATES.length} template siap pakai
                  </span>
                </div>
              </div>

              {/* 04 — Playground, Media & Private Cloud */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-900 p-8 sm:p-10 flex flex-col justify-between gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                      04. Playground Multi-Model, Media Studio &amp; Library Cloud
                    </h3>
                    <FlaskConical className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                    Uji variasi prompt secara berdampingan di Playground, hasilkan gambar dan konsep visual di Media Studio, lalu arsipkan prompt terbaik Anda ke folder proyek yang tersinkronisasi di Firebase Firestore.
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
                      100%
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Simpan Cloud Pribadi
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Interactive Built-In Template Library Preview */}
        <section
          id="template"
          className="max-w-[1440px] mx-auto px-8 sm:px-14 lg:px-20 xl:px-28 py-24 sm:py-32 space-y-14"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-xl space-y-3">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Pustaka Template Bawaan
              </p>
              <h2
                className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Library Anda dimulai kosong. Template struktur siap dipakai kapan saja.
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            {/* Template Selector List */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {visibleTemplates.map((tpl) => {
                const isSelected = activeTemplate?.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setActiveTemplateId(tpl.id)}
                    className={`w-full text-left p-6 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
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
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 flex flex-col justify-between gap-6">
                <div className="space-y-5">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
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

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Tersedia langsung di PRD Studio setelah masuk.
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
        </section>

        {/* Section 4: Workflow Steps */}
        <section
          id="cara-kerja"
          className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 py-24 sm:py-28"
        >
          <div className="max-w-[1440px] mx-auto px-8 sm:px-14 lg:px-20 xl:px-28 space-y-14">
            <div className="max-w-xl space-y-3">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Cara Kerja
              </p>
              <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Tiga langkah dari ide mentah ke prompt siap pakai.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
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

              <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
                  02
                </p>
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                  Isi Variabel &amp; Uji di Playground
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Setiap placeholder <code className="font-mono text-xs">{`{{variabel}}`}</code> otomatis menjadi kolom isi. Uji langsung hasilnya di Playground multi-model sebelum disimpan.
                </p>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <p className="font-mono text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
                  03
                </p>
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                  Simpan ke Akun Google Anda
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Organisir prompt dalam folder koleksi pribadi di Firebase Cloud yang otomatis sinkron saat dibuka dari perangkat lain.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Security & Final Conversion */}
        <section
          id="keamanan"
          className="max-w-[1440px] mx-auto px-8 sm:px-14 lg:px-20 xl:px-28 py-24 sm:py-32"
        >
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 sm:p-14 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Privasi &amp; Isolasi Data Multi-User</span>
              </div>
              <h2
                className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Ruang kerja pribadi untuk setiap akun Google.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                Siapa pun dapat masuk menggunakan akun Google masing-masing. Seluruh prompt, folder, draf, riwayat, dan aset media disimpan terpisah di Cloud Firestore dengan aturan keamanan ketat per pemilik akun.
              </p>

              <div className="flex flex-wrap items-center gap-x-7 gap-y-2.5 pt-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Otentikasi Google resmi</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Aturan akses khusus pemilik akun</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Backup &amp; ekspor JSON kapan saja</span>
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 lg:col-start-9 flex lg:justify-end">
              <button
                type="button"
                onClick={() => handlePrimaryAction('dashboard')}
                disabled={isSigningIn || isInitializing}
                className="w-full sm:w-auto px-7 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
              >
                {isAuthenticatedReady ? (
                  <>
                    <span>Buka Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <GoogleMark />
                    <span>Masuk dengan Google</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-[#FAFAFA] dark:bg-slate-950">
        <div className="max-w-[1440px] mx-auto px-8 sm:px-14 lg:px-20 xl:px-28 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="font-heading font-bold text-slate-900 dark:text-white text-sm">
              PromptForge
            </span>
            <span aria-hidden="true">·</span>
            <span>© {new Date().getFullYear()} PromptForge Workspace</span>
          </div>

          <div className="flex flex-wrap items-center gap-7">
            <a href="#fitur" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Fitur
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
