import React, { useMemo } from 'react';
import { AreaChart, Area, Tooltip, YAxis } from 'recharts';
import { PromptItem, HistoryLog } from '../types';

interface PromptUsageSparklineProps {
  prompt: PromptItem;
  history: HistoryLog[];
}

interface DayUsagePoint {
  dateKey: string;
  label: string;
  count: number;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDay(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export const PromptUsageSparkline: React.FC<PromptUsageSparklineProps> = ({
  prompt,
  history,
}) => {
  const { data, totalUsage, maxVal } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = new Map<string, DayUsagePoint>();
    const orderedKeys: string[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toLocalDateKey(d);
      orderedKeys.push(key);
      buckets.set(key, {
        dateKey: key,
        label: formatShortDay(d),
        count: 0,
      });
    }

    const incrementDay = (iso?: string) => {
      if (!iso) return;
      const parsed = new Date(iso);
      if (Number.isNaN(parsed.getTime())) return;
      const key = toLocalDateKey(parsed);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count += 1;
      }
    };

    // 1. Real Firestore history activity events for this prompt
    const matchedHistoryDays = new Set<string>();
    history.forEach((log) => {
      const matchesPrompt =
        (log.promptId && log.promptId === prompt.id) ||
        (!log.promptId && log.promptTitle === prompt.title);
      if (!matchesPrompt) return;

      const parsed = new Date(log.timestamp);
      if (!Number.isNaN(parsed.getTime())) {
        const key = toLocalDateKey(parsed);
        if (buckets.has(key)) {
          matchedHistoryDays.add(key);
        }
      }
      incrementDay(log.timestamp);
    });

    // 2. Include saved prompt versions if not already logged on the same day
    if (Array.isArray(prompt.versions)) {
      prompt.versions.forEach((ver) => {
        if (!ver?.createdAt) return;
        const parsed = new Date(ver.createdAt);
        if (Number.isNaN(parsed.getTime())) return;
        const key = toLocalDateKey(parsed);
        if (buckets.has(key) && !matchedHistoryDays.has(key)) {
          incrementDay(ver.createdAt);
        }
      });
    }

    // 3. Ensure prompt creation / latest update registers if within the 30-day window
    [prompt.createdAt, prompt.updatedAt].forEach((ts) => {
      if (!ts) return;
      const parsed = new Date(ts);
      if (Number.isNaN(parsed.getTime())) return;
      const key = toLocalDateKey(parsed);
      const bucket = buckets.get(key);
      if (bucket && bucket.count === 0) {
        bucket.count = 1;
      }
    });

    const points = orderedKeys.map((k) => buckets.get(k)!);
    const total = points.reduce((sum, pt) => sum + pt.count, 0);
    const peak = points.reduce((m, pt) => (pt.count > m ? pt.count : m), 0);

    return {
      data: points,
      totalUsage: total,
      maxVal: Math.max(peak, 2),
    };
  }, [prompt.id, prompt.title, prompt.createdAt, prompt.updatedAt, prompt.versions, history]);

  const gradientId = useMemo(
    () => `spark-${prompt.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [prompt.id]
  );

  const hasActivity = totalUsage > 0;
  const strokeColor = hasActivity ? '#10b981' : '#94a3b8';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      title={`Frekuensi pemakaian 30 hari terakhir: ${totalUsage} aktivitas`}
      aria-label={`Grafik frekuensi pemakaian 30 hari terakhir: ${totalUsage} aktivitas`}
      className="inline-flex items-center gap-1.5 shrink-0 select-none"
    >
      <div className="w-[68px] h-[22px] shrink-0">
        <AreaChart
          width={68}
          height={22}
          data={data}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={hasActivity ? 0.32 : 0.14} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, maxVal]} />
          <Tooltip
            cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '2 2' }}
            wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const point = payload[0].payload as DayUsagePoint;
              return (
                <div className="px-2 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 shadow-md text-[10px] leading-tight whitespace-nowrap">
                  <span className="text-slate-300">{point.label}: </span>
                  <span className="font-semibold text-emerald-400 tabular-nums">
                    {point.count}x
                  </span>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={strokeColor}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 2.5, fill: strokeColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </div>
      <span
        className={`text-[10px] font-mono tabular-nums ${
          hasActivity
            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
            : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        {totalUsage}x
      </span>
    </div>
  );
};
