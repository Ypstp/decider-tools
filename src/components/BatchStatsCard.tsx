import { Trophy, X } from 'lucide-react';
import { TranslationSet } from '../i18n/translations';
import { CopyResultButton } from './CopyResultButton';

interface BatchStatsCardProps {
  runs: string[];
  onDismiss?: () => void;
  diceTotals?: number[];
  soundEnabled?: boolean;
  t: TranslationSet;
}

export function BatchStatsCard({
  runs,
  onDismiss,
  diceTotals,
  soundEnabled = true,
  t,
}: BatchStatsCardProps) {
  if (runs.length === 0) return null;

  const counts = new Map<string, number>();
  runs.forEach((label) => {
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;
  const topWinners = sorted.filter((entry) => entry[1] === maxCount);
  const topLabel =
    topWinners.length === 1
      ? topWinners[0][0]
      : topWinners.map((entry) => entry[0]).slice(0, 3).join(' / ');

  let avgStr = '';
  let minMaxStr = '';
  if (diceTotals && diceTotals.length > 0) {
    const sum = diceTotals.reduce((a, b) => a + b, 0);
    avgStr = (sum / diceTotals.length).toFixed(1);
    minMaxStr = `${Math.min(...diceTotals)} / ${Math.max(...diceTotals)}`;
  }

  const copySummary = [
    `${t.batchStatsTitle} (${runs.length}×)`,
    `${t.topWinnerLabel}: ${topLabel} (${maxCount}×, ${Math.round((maxCount / runs.length) * 100)}%)`,
    diceTotals && diceTotals.length > 0 ? `${t.averageLabel}: ${avgStr} · ${t.minMaxLabel}: ${minMaxStr}` : null,
    sorted.map(([label, c]) => `- ${label}: ${c}× (${Math.round((c / runs.length) * 100)}%)`).join('\n'),
    `${t.allResultsLabel}: ${runs.map((r, i) => `#${i + 1} ${r}`).join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="mt-6 w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-left dark:border-slate-800 dark:bg-slate-950/60">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            {t.batchStatsTitle}
          </span>
          <span className="font-mono text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            ({runs.length}×)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <CopyResultButton
            text={copySummary}
            soundEnabled={soundEnabled}
            t={t}
            compact
          />
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={t.close}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Overall Summary */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {t.topWinnerLabel}
            </div>
            <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
              {topLabel}
            </div>
          </div>
        </div>

        {diceTotals && diceTotals.length > 0 ? (
          <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
            <div>
              <span className="text-slate-400">{t.averageLabel}: </span>
              <strong className="text-slate-900 dark:text-white">{avgStr}</strong>
            </div>
            <div>
              <span className="text-slate-400">{t.minMaxLabel}: </span>
              <strong className="text-slate-900 dark:text-white">{minMaxStr}</strong>
            </div>
          </div>
        ) : (
          <div className="font-mono text-xs font-bold tabular-nums dt-text-accent">
            {maxCount}× ({Math.round((maxCount / runs.length) * 100)}%)
          </div>
        )}
      </div>

      {/* Frequency Breakdown */}
      <div className="mt-3 flex max-h-44 flex-col gap-2 overflow-y-auto pr-1">
        {sorted.map(([label, count]) => {
          const pct = Math.round((count / runs.length) * 100);
          const barWidth = Math.max(6, Math.round((count / maxCount) * 100));
          return (
            <div key={label} className="flex items-center gap-2 sm:gap-2.5 text-xs">
              <span className="w-20 sm:w-28 shrink-0 truncate font-semibold text-slate-700 dark:text-slate-200">
                {label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${barWidth}%`, backgroundColor: 'var(--dt-accent)' }}
                />
              </div>
              <span className="w-15 sm:w-16 shrink-0 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {count}× ({pct}%)
              </span>
            </div>
          );
        })}
      </div>

      {/* Individual Results Sequence */}
      <div className="mt-3 border-t border-slate-200 pt-2.5 dark:border-slate-800">
        <div className="mb-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          {t.allResultsLabel}
        </div>
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {runs.map((res, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <span className="text-[10px] text-slate-400">#{idx + 1}</span>
              <span>{res}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
