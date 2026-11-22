import React from 'react';
import {
  Sparkles,
  Cloud,
  Mic,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Layers,
  Zap,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthGate: React.FC = () => {
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

  const isInitializing = !authReady || (Boolean(user) && !profileReady && !authError);

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Left Showcase Panel */}
        <div className="lg:col-span-7 bg-slate-900 text-white p-7 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="font-heading font-extrabold text-base tracking-tight text-white">
                  PromptForge AI Studio
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  Generate Prompt by Walzetass • Cloud Multi-User Edition
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold leading-tight tracking-tight text-white">
                Bangun Master Prompt, PRD &amp; Media AI dalam Satu Cloud Workspace.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Masuk dengan akun Google Anda untuk mengakses Prompt Builder generasi terbaru bertenaga Gemini 4, Auto-Fill berbasis suara, dan penyimpanan Firebase Cloud real-time yang terisolasi aman per akun.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Gemini 4 Live Stream</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Generasi Master Prompt real-time, 3 variasi strategi sekaligus, dan deteksi variabel dinamis.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Mic className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Voice Auto-Fill AI</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cukup ucapkan ide Anda lewat mikrofon — AI langsung mentranskrip dan mengisi seluruh form otomatis.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-sky-400">
                  <Cloud className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">100% Firebase Cloud</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Seluruh prompt, draf, PRD, aset media, dan riwayat tersinkronisasi instan di Cloud Firestore.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-bold text-white">Multi-User Workspace</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Setiap pengguna mendapatkan ruang kerja pribadi yang aman dan dapat diakses dari perangkat mana pun.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Dilindungi oleh Firebase Authentication &amp; Strict Per-User Security Rules</span>
          </div>
        </div>

        {/* Right Sign-In Card */}
        <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
          {isInitializing ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-heading font-bold text-slate-900 dark:text-slate-100">
                  {user ? 'Menyiapkan Firebase Cloud Workspace...' : 'Memeriksa Sesi Login...'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user
                    ? `Menyinkronkan data pribadi untuk ${user.email || 'akun Google Anda'}`
                    : 'Mohon tunggu sebentar'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Akses Workspace Cloud</span>
                </span>
                <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-slate-100 pt-1">
                  Masuk ke Akun Anda
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Gunakan akun Google Anda untuk mulai membuat prompt, menyimpan library ke Firebase, dan menyinkronkan proyek lintas perangkat.
                </p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-xs text-red-700 dark:text-red-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{authError}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthError();
                        if (user) {
                          retryWorkspaceInit();
                        } else {
                          signInWithGoogle();
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      Coba Lagi
                    </button>
                    {user && (
                      <button
                        type="button"
                        onClick={signOutUser}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Ganti Akun</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={isSigningIn}
                id="google-login-btn"
                className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer group"
              >
                {isSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghubungkan ke Google...</span>
                  </>
                ) : (
                  <>
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
                    <span>Masuk dengan Google</span>
                    <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Siapa pun dapat masuk menggunakan akun Google masing-masing. Semua data Prompt Library, Draf, PRD, dan Media Studio Anda disimpan terpisah secara aman di Firebase Firestore.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
