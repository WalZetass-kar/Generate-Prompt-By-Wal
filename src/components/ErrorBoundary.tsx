import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kesalahan tidak terduga pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Gangguan Sinkronisasi Aplikasi</h2>
                <p className="text-xs text-slate-400">
                  Terjadi kendala saat mengakses sesi atau layanan cloud Firebase.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 break-words max-h-40 overflow-y-auto">
              {this.state.errorMessage}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Workspace</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
