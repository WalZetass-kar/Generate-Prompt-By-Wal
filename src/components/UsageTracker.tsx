import React, { useState } from 'react';
import {
  Activity,
  Zap,
  BarChart2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Bot,
  Sparkles,
  Layers,
  FileText,
  Play,
  Globe,
  Award
} from 'lucide-react';
import { GeminiUsageStats } from '../types';

interface UsageTrackerProps {
  usageStats: GeminiUsageStats | null;
  onRefreshUsage: () => void;
  onSimulateQuota?: (targetRequests: number) => void;
}

export const UsageTracker: React.FC<UsageTrackerProps> = ({
  usageStats,
  onRefreshUsage,
  onSimulateQuota,
}) => {
  const [customSimVal, setCustomSimVal] = useState<number>(1200);

  if (!usageStats) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
      </div>
    );
  }

  const {
    requestsToday,
    dailyLimit,
    remainingRequests,
    percentUsed,
    requestsPerMinute,
    rpmLimit,
    breakdown,
    recentLogs,
    quotaAlert80Percent,
  } = usageStats;

  // Determine progress bar color based on percentage
  const getProgressColor = () => {
    if (percentUsed >= 80) return 'bg-red-500';
    if (percentUsed >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = () => {
    if (percentUsed >= 80) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 text-xs font-bold flex items-center gap-1 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Kritis (&gt;= 80%)</span>
        </span>
      );
    }
    if (percentUsed >= 60) {
      return (
        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 text-xs font-bold flex items-center gap-1">
          <Activity className="w-3.5 h-3.5" />
          <span>Moderat (60%-79%)</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Aman (&lt; 60%)</span>
      </span>
    );
  };

  const featureIcons: Record<string, React.ReactNode> = {
    generator: <Sparkles className="w-3.5 h-3.5 text-red-500" />,
    chat: <Bot className="w-3.5 h-3.5 text-blue-500" />,
    optimizer: <Zap className="w-3.5 h-3.5 text-amber-500" />,
    wizard: <Layers className="w-3.5 h-3.5 text-purple-500" />,
    prd: <FileText className="w-3.5 h-3.5 text-emerald-500" />,
    playground: <Play className="w-3.5 h-3.5 text-pink-500" />,
    translate: <Globe className="w-3.5 h-3.5 text-indigo-500" />,
    score: <Award className="w-3.5 h-3.5 text-cyan-500" />,
  };

  const featureLabels: Record<string, string> = {
    generator: 'Master Prompt Generator',
    chat: 'AI Co-Pilot Chat',
    optimizer: 'Prompt Optimizer',
    wizard: 'AI Form Wizard',
    prd: 'PRD Generator',
    playground: 'Playground Test',
    translate: 'Prompt Translator',
    score: 'Score Evaluator',
  };

  return (
    <div className="space-y-5">
      {/* 80% Alert Warning Banner (Visible when quotaAlert80Percent is true) */}
      {quotaAlert80Percent && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-slate-800 dark:text-slate-100 shadow-2xs space-y-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-600 text-white shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-red-700 dark:text-red-400">
                  PERINGATAN KUOTA API GEMINI: MENCAPAI {percentUsed}% DARI BATAS HARIAN
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono">
                  {requestsToday} / {dailyLimit} Request
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Penggunaan kuota API Gemini harian Anda telah melebihi ambang batas <strong>80%</strong>. Sisa kuota Anda saat ini adalah <strong>{remainingRequests} request</strong>.
              </p>
              <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Sistem otomatis mengaktifkan fallback model jika kuota habis.</span>
                <span>Kuota harian diperbarui setiap pukul 00:00 UTC.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Visualizer Panel */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        {/* Panel Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Visualisasi Kuota &amp; Penggunaan Gemini API
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pemantauan real-time sisa kuota request harian dan estimasi rate limit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <button
              onClick={onRefreshUsage}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors"
              title="Perbarui Data Usage"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Big Progress Bar Gauge */}
        <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Sisa Kuota Harian</span>
            </span>
            <span className="font-mono text-slate-900 dark:text-slate-100">
              {percentUsed}% Digunakan ({requestsToday} / {dailyLimit} Req)
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${Math.min(100, percentUsed)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>0 Request</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Terpakai: {requestsToday} | Sisa: {remainingRequests} Request
            </span>
            <span>{dailyLimit} Request (Limit)</span>
          </div>
        </div>

        {/* 4 Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total Request Hari Ini
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
              {requestsToday}
            </div>
            <div className="text-[10px] text-slate-400">Batas: {dailyLimit} RPD</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Sisa Kuota Harian
            </div>
            <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {remainingRequests}
            </div>
            <div className="text-[10px] text-slate-400">{(100 - percentUsed).toFixed(1)}% Tersedia</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Request Menit Ini (RPM)
            </div>
            <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
              {requestsPerMinute} / {rpmLimit}
            </div>
            <div className="text-[10px] text-slate-400">Limit: 15 Request/menit</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Reset Kuota</span>
            </div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 pt-1">
              Setiap 00:00 UTC
            </div>
            <div className="text-[10px] text-slate-400">Reset harian otomatis</div>
          </div>
        </div>

        {/* Feature Breakdown Section */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Distribusi Request per Fitur</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {Object.entries(breakdown).map(([key, count]) => {
              const numCount = Number(count) || 0;
              const featPercent = requestsToday > 0 ? ((numCount / requestsToday) * 100).toFixed(0) : 0;
              return (
                <div
                  key={key}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {featureIcons[key] || <Sparkles className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {featureLabels[key] || key}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${featPercent}%` }}
                      />
                    </div>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-bold text-[11px] min-w-[40px] text-right">
                      {count} req
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Request Logs */}
        {recentLogs && recentLogs.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Log Request API Terakhir
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium">
                  <tr>
                    <th className="p-2.5">Waktu</th>
                    <th className="p-2.5">Fitur Action</th>
                    <th className="p-2.5">Model AI</th>
                    <th className="p-2.5 text-right">Est. Token</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentLogs.slice(0, 5).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 font-mono text-slate-500 text-[11px]">{log.timestamp}</td>
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{log.action}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">{log.model}</td>
                      <td className="p-2.5 text-right font-mono text-slate-500 text-[11px]">{log.tokensEstimated || 350}</td>
                      <td className="p-2.5 text-center">
                        {log.status === 'success' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold">
                            Berhasil
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-[10px] font-bold">
                            Quota Exceeded
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Simulation & Testing Tools */}
        {onSimulateQuota && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-red-500" />
                <span>Simulasi &amp; Pengujian Ambang Batas Kuota (Alert Tester)</span>
              </span>
              <span className="text-[10px] text-slate-400">Gunakan untuk menguji Alert 80%+</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={() => onSimulateQuota(150)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                Simulasi 10% (150 req)
              </button>
              <button
                onClick={() => onSimulateQuota(750)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                Simulasi 50% (750 req)
              </button>
              <button
                onClick={() => onSimulateQuota(1220)}
                className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-bold transition-colors shadow-xs"
              >
                Uji Alert 81.3% (1,220 req)
              </button>
              <button
                onClick={() => onSimulateQuota(1425)}
                className="px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/80 border border-red-400 dark:border-red-700 text-red-800 dark:text-red-100 font-bold transition-colors"
              >
                Simulasi 95% (1,425 req)
              </button>
              <button
                onClick={() => onSimulateQuota(0)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 transition-colors"
              >
                Reset (0 req)
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs pt-1">
              <input
                type="number"
                value={customSimVal}
                onChange={(e) => setCustomSimVal(Number(e.target.value))}
                className="w-32 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono text-xs"
                placeholder="Jumlah Request"
              />
              <button
                onClick={() => onSimulateQuota(customSimVal)}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors"
              >
                Set Custom Request
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
