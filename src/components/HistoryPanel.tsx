import { Trash2 } from 'lucide-react';
import { HistoryEntry } from '../types';
import { TranslationSet } from '../i18n/translations';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onClear: () => void;
  t: TranslationSet;
}

export function HistoryPanel({ entries, onClear, t }: HistoryPanelProps) {
  return (
    <div data-guide="tool-history" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
          {t.history} ({entries.length})
        </span>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t.clearHistory}</span>
          </button>
        )}
      </div>

      <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
        {entries.length === 0 ? (
          <p className="py-5 text-center text-xs text-slate-500 dark:text-slate-400">
            {t.noHistory}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {entry.text}
                  </div>
                  {entry.detail && (
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {entry.detail}
                    </div>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                  {entry.time}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
