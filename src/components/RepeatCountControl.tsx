import { TranslationSet } from '../i18n/translations';
import { playSound } from '../utils/sound';

interface RepeatCountControlProps {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  soundEnabled: boolean;
  t: TranslationSet;
}

const QUICK_COUNTS = [1, 3, 5, 10];

export function RepeatCountControl({
  value,
  onChange,
  disabled = false,
  soundEnabled,
  t,
}: RepeatCountControlProps) {
  const handleCustomChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      onChange(1);
      return;
    }
    onChange(Math.min(100, Math.max(1, parsed)));
  };

  return (
    <div data-guide="repeat-count" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t.repeatCount}
        </span>
        <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {value}×
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="grid flex-1 grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
          {QUICK_COUNTS.map((cnt) => (
            <button
              key={cnt}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(cnt);
                playSound('click', soundEnabled);
              }}
              className={`min-h-9 rounded-lg py-2 sm:py-1.5 font-mono text-xs font-bold transition-colors disabled:opacity-50 ${
                value === cnt
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {cnt}×
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          max={100}
          disabled={disabled}
          aria-label={t.repeatCount}
          value={value}
          onChange={(e) => handleCustomChange(e.target.value)}
          className="h-10 sm:h-9 w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 text-center font-mono text-base sm:text-xs font-bold tabular-nums text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
        />
      </div>
    </div>
  );
}
