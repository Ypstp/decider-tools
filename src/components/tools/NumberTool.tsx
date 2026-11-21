import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { HistoryEntry } from '../../types';
import { TranslationSet } from '../../i18n/translations';
import { playSound } from '../../utils/sound';
import { HistoryPanel } from '../HistoryPanel';
import { CopyResultButton } from '../CopyResultButton';
import { ToolActionHandle } from './WheelTool';

interface NumberToolProps {
  soundEnabled: boolean;
  history: HistoryEntry[];
  onRecord: (text: string, detail?: string) => void;
  onClearHistory: () => void;
  t: TranslationSet;
}

export const NumberTool = forwardRef<ToolActionHandle, NumberToolProps>(
  ({ soundEnabled, history, onRecord, onClearHistory, t }, ref) => {
    const [minInput, setMinInput] = useState('1');
    const [maxInput, setMaxInput] = useState('100');
    const [drawCount, setDrawCount] = useState(1);
    const [uniqueOnly, setUniqueOnly] = useState(false);
    const [sortResults, setSortResults] = useState(false);
    const [usedNumbers, setUsedNumbers] = useState<number[]>([]);
    const [results, setResults] = useState<number[] | null>(null);
    const [isRolling, setIsRolling] = useState(false);

    const timerRef = useRef<number | null>(null);
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;

    const parsedMin = Number.isFinite(parseInt(minInput, 10)) ? parseInt(minInput, 10) : 1;
    const parsedMax = Number.isFinite(parseInt(maxInput, 10)) ? parseInt(maxInput, 10) : 100;
    const low = Math.min(parsedMin, parsedMax);
    const high = Math.max(parsedMin, parsedMax);
    const totalRange = high - low + 1;

    const remainingCount = uniqueOnly
      ? Math.max(0, totalRange - usedNumbers.filter((n) => n >= low && n <= high).length)
      : totalRange;

    useEffect(() => {
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    }, []);

    const resetPool = () => {
      setUsedNumbers([]);
      playSound('click', soundEnabled);
    };

    const generate = useCallback(() => {
      if (isRolling) return;
      if (uniqueOnly && remainingCount === 0) return;

      setIsRolling(true);
      playSound('spin', soundRef.current);

      const safeCount = uniqueOnly
        ? Math.min(drawCount, remainingCount)
        : Math.min(drawCount, 10);

      let finalDraws: number[] = [];

      if (uniqueOnly) {
        const usedSet = new Set(usedNumbers);
        const pool: number[] = [];
        // Cap explicit pool enumeration at 20,000 for performance; otherwise sample
        if (totalRange <= 20000) {
          for (let n = low; n <= high; n++) {
            if (!usedSet.has(n)) pool.push(n);
          }
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }
          finalDraws = pool.slice(0, safeCount);
        } else {
          const picked = new Set<number>();
          while (picked.size < safeCount) {
            const candidate = Math.floor(Math.random() * totalRange) + low;
            if (!usedSet.has(candidate)) picked.add(candidate);
          }
          finalDraws = Array.from(picked);
        }
      } else {
        for (let i = 0; i < safeCount; i++) {
          finalDraws.push(Math.floor(Math.random() * totalRange) + low);
        }
      }

      if (sortResults) {
        finalDraws.sort((a, b) => a - b);
      }

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) {
        setResults(finalDraws);
        if (uniqueOnly) setUsedNumbers((prev) => [...prev, ...finalDraws]);
        setIsRolling(false);
        onRecord(finalDraws.join(', '), `${low}–${high}`);
        playSound('win', soundRef.current);
        return;
      }

      let ticks = 0;
      const maxTicks = 10;
      timerRef.current = window.setInterval(() => {
        ticks++;
        setResults(
          Array.from({ length: safeCount }, () => Math.floor(Math.random() * totalRange) + low)
        );
        playSound('tick', soundRef.current, ticks * 0.04);

        if (ticks >= maxTicks) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          setResults(finalDraws);
          if (uniqueOnly) setUsedNumbers((prev) => [...prev, ...finalDraws]);
          setIsRolling(false);
          onRecord(finalDraws.join(', '), `${low}–${high}`);
          playSound('win', soundRef.current);
        }
      }, 45);
    }, [isRolling, uniqueOnly, remainingCount, drawCount, usedNumbers, totalRange, low, high, sortResults, onRecord]);

    useImperativeHandle(ref, () => ({ trigger: generate }), [generate]);

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        <div className="tool-stage flex min-h-[340px] sm:min-h-[440px] lg:min-h-[520px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
          <div data-guide="number-stage" className="flex min-h-36 flex-wrap items-center justify-center gap-3">
            {results === null ? (
              <span className="font-mono text-6xl font-extrabold tabular-nums text-slate-300 dark:text-slate-700">
                ?
              </span>
            ) : results.length === 1 ? (
              <span className="font-mono text-6xl font-extrabold tabular-nums dt-text-accent sm:text-7xl">
                {results[0]}
              </span>
            ) : (
              results.map((num, idx) => (
                <div
                  key={idx}
                  className="flex min-w-16 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 font-mono text-2xl font-extrabold tabular-nums text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300"
                >
                  {num}
                </div>
              ))
            )}
          </div>

          {results !== null && !isRolling && (
            <div className="mt-4">
              <CopyResultButton
                text={results.join(', ')}
                soundEnabled={soundEnabled}
                t={t}
              />
            </div>
          )}

          {uniqueOnly && (
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono tabular-nums">
                {t.remainingPool}: {remainingCount} / {totalRange}
              </span>
              {usedNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={resetPool}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{t.resetPool}</span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            data-guide="number-action"
            disabled={isRolling || (uniqueOnly && remainingCount === 0)}
            onClick={generate}
            className="mt-8 inline-flex min-h-11 w-full sm:w-auto sm:min-w-48 items-center justify-center gap-2 rounded-xl dt-btn-primary px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {t.generate}
          </button>
        </div>

        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div data-guide="number-range" className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="num-min" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.minValue}
              </label>
              <input
                id="num-min"
                type="number"
                value={minInput}
                onChange={(e) => {
                  setMinInput(e.target.value);
                  setUsedNumbers([]);
                }}
                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-base sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="num-max" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.maxValue}
              </label>
              <input
                id="num-max"
                type="number"
                value={maxInput}
                onChange={(e) => {
                  setMaxInput(e.target.value);
                  setUsedNumbers([]);
                }}
                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-base sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
              />
            </div>
          </div>

          <div data-guide="number-count" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.drawCount}</span>
              <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {drawCount}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={drawCount}
              onChange={(e) => setDrawCount(parseInt(e.target.value, 10))}
              className="dt-accent-control w-full"
            />
          </div>

          <div data-guide="number-unique" className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t.uniqueOnly}</span>
              <input
                type="checkbox"
                checked={uniqueOnly}
                onChange={(e) => {
                  setUniqueOnly(e.target.checked);
                  setUsedNumbers([]);
                }}
                className="dt-accent-control h-4 w-4"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t.sortResults}</span>
              <input
                type="checkbox"
                checked={sortResults}
                onChange={(e) => setSortResults(e.target.checked)}
                className="dt-accent-control h-4 w-4"
              />
            </label>
          </div>

          <HistoryPanel entries={history} onClear={onClearHistory} t={t} />
        </div>
      </div>
    );
  }
);

NumberTool.displayName = 'NumberTool';
