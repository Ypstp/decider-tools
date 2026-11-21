import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { HistoryEntry, SavedPreset } from '../../types';
import { TranslationSet } from '../../i18n/translations';
import { playSound } from '../../utils/sound';
import { launchConfetti } from '../../utils/confetti';
import { HistoryPanel } from '../HistoryPanel';
import { SavedPresetsBar } from '../SavedPresetsBar';
import { RepeatCountControl } from '../RepeatCountControl';
import { BatchStatsCard } from '../BatchStatsCard';
import { CopyResultButton } from '../CopyResultButton';
import { getMostFrequentWinner } from '../../utils/batchWinner';
import { ToolActionHandle } from './WheelTool';

interface RouletteToolProps {
  soundEnabled: boolean;
  history: HistoryEntry[];
  onRecord: (text: string, detail?: string) => void;
  onClearHistory: () => void;
  initialItems?: string;
  presets: SavedPreset[];
  onSavePreset: (name: string, items: string) => void;
  onDeletePreset: (id: string) => void;
  t: TranslationSet;
}

const CARD_WIDTH = 124;
const REPEAT_CYCLES = 10;
const CARD_ACCENTS = [
  '#0077FF',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#6366F1',
  '#EC4899',
];

const ROULETTE_PRESETS = [
  { label: 'Points', items: ['10', '20', '30', '40', '50', '75', '100', '250'] },
  { label: 'Multipliers', items: ['1x', '2x', '0.5x', '3x', '5x', '1.5x', '10x'] },
  { label: 'Rewards', items: ['Coffee', 'Break 15m', 'Wildcard', 'Skip Task', 'Bonus', 'Try Again'] },
];

export const RouletteTool = forwardRef<ToolActionHandle, RouletteToolProps>(
  (
    {
      soundEnabled,
      history,
      onRecord,
      onClearHistory,
      initialItems,
      presets,
      onSavePreset,
      onDeletePreset,
      t,
    },
    ref
  ) => {
    const [rawText, setRawText] = useState(initialItems || '10\n20\n30\n40\n50\n75\n100\n250');
    const [eliminateMode, setEliminateMode] = useState(false);
    const [removedItems, setRemovedItems] = useState<string[]>([]);
    const [winner, setWinner] = useState<string | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [offsetPx, setOffsetPx] = useState(0);
    const [repeatCount, setRepeatCount] = useState(1);
    const [batchRuns, setBatchRuns] = useState<string[]>([]);

    const viewportRef = useRef<HTMLDivElement | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;

    const items = rawText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const stripItems = items.length > 0
      ? Array.from({ length: REPEAT_CYCLES }, () => items).flat()
      : [];

    useEffect(() => {
      if (initialItems) {
        setRawText(initialItems);
        setRemovedItems([]);
        setOffsetPx(0);
      }
    }, [initialItems]);

    useEffect(() => {
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, []);

    const spin = useCallback(() => {
      if (isSpinning || items.length < 2) return;
      const viewportWidth = viewportRef.current?.clientWidth || 560;
      const totalRuns = Math.max(1, repeatCount);

      setIsSpinning(true);
      setWinner(null);
      setBatchRuns([]);
      setOffsetPx(0);
      playSound('spin', soundRef.current);

      let pool = [...items];
      const preResults: string[] = [];
      const newlyRemoved: string[] = [];

      for (let i = 0; i < totalRuns; i++) {
        if (eliminateMode && pool.length < 2) {
          if (pool.length === 1) preResults.push(pool[0]);
          break;
        }
        const idxPick = Math.floor(Math.random() * pool.length);
        const pick = pool[idxPick];
        preResults.push(pick);
        if (eliminateMode && pool.length > 1) {
          pool = pool.filter((_, idx) => idx !== idxPick);
          newlyRemoved.push(pick);
        }
      }

      const winnerInfo = getMostFrequentWinner(preResults);
      const pickedIdx = Math.max(0, items.indexOf(winnerInfo.primary));

      const targetCycle = 6;
      const targetStripIndex = targetCycle * items.length + pickedIdx;
      const jitter = (Math.random() - 0.5) * (CARD_WIDTH * 0.55);
      const targetOffset =
        targetStripIndex * CARD_WIDTH + CARD_WIDTH / 2 - viewportWidth / 2 + jitter;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reducedMotion ? 250 : 3800;
      const startTime = performance.now();
      let lastCardBoundary = -1;

      const frame = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3.6);
        const currentOffset = targetOffset * ease;
        setOffsetPx(currentOffset);

        const currentCenterCard = Math.floor((currentOffset + viewportWidth / 2) / CARD_WIDTH);
        if (currentCenterCard !== lastCardBoundary) {
          lastCardBoundary = currentCenterCard;
          playSound('tick', soundRef.current, (1 - progress) * 0.35);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(frame);
        } else {
          setIsSpinning(false);

          if (totalRuns > 1) {
            setWinner(winnerInfo.displayLabel);
            setBatchRuns(preResults);
            preResults.forEach((res) => onRecord(res, `${items.length} items`));
          } else {
            const singleWinner = preResults[0];
            setWinner(singleWinner);
            onRecord(singleWinner, `${items.length} items`);
          }

          if (newlyRemoved.length > 0) {
            setRemovedItems((prev) => [...prev, ...newlyRemoved]);
            setRawText(pool.join('\n'));
          }

          playSound('win', soundRef.current);
          launchConfetti();
        }
      };

      animFrameRef.current = requestAnimationFrame(frame);
    }, [isSpinning, items, repeatCount, onRecord, eliminateMode]);

    useImperativeHandle(ref, () => ({ trigger: spin }), [spin]);

    const handleRestore = () => {
      if (removedItems.length === 0) return;
      setRawText([...items, ...removedItems].join('\n'));
      setRemovedItems([]);
      playSound('click', soundEnabled);
    };

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        <div className="tool-stage flex min-h-[340px] sm:min-h-[440px] lg:min-h-[520px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
          {/* Roulette Track */}
          <div data-guide="roulette-stage" className="w-full max-w-2xl">
            <div
              ref={viewportRef}
              className="relative h-32 sm:h-36 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-800 dark:bg-slate-950"
            >
              {/* Center Needle */}
              <div
                className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-0.5 -translate-x-1/2 shadow-sm"
                style={{ backgroundColor: 'var(--dt-accent)' }}
              >
                <div
                  className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45"
                  style={{ backgroundColor: 'var(--dt-accent)' }}
                />
                <div
                  className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45"
                  style={{ backgroundColor: 'var(--dt-accent)' }}
                />
              </div>

              {/* Left / Right edge fade */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-950" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-slate-100 to-transparent dark:from-slate-950" />

              {/* Track Strip */}
              <div
                className="flex h-full will-change-transform"
                style={{ transform: `translate3d(-${offsetPx}px, 0, 0)` }}
              >
                {stripItems.map((item, idx) => {
                  const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
                  return (
                    <div
                      key={idx}
                      style={{ width: `${CARD_WIDTH}px` }}
                      className="flex h-full shrink-0 flex-col items-center justify-center border-r border-slate-200/80 bg-white px-3 text-center dark:border-slate-800/80 dark:bg-slate-900"
                    >
                      <span
                        className="mb-2 h-1.5 w-8 rounded-full"
                        style={{ backgroundColor: accent }}
                      />
                      <span className="line-clamp-2 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 flex min-h-12 flex-wrap items-center justify-center gap-3 text-center">
            {winner ? (
              <>
                <div className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight dt-text-accent sm:text-3xl">
                  <Sparkles className="h-6 w-6 shrink-0" />
                  <span>{winner}</span>
                </div>
                <CopyResultButton text={winner} soundEnabled={soundEnabled} t={t} />
              </>
            ) : (
              <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                {isSpinning ? t.spinning : `${items.length} ${t.itemsList.split(' ')[0].toLowerCase()}`}
              </span>
            )}
          </div>

          <button
            type="button"
            data-guide="roulette-action"
            disabled={isSpinning || items.length < 2}
            onClick={spin}
            className="mt-5 inline-flex min-h-11 w-full sm:w-auto sm:min-w-48 items-center justify-center gap-2 rounded-xl dt-btn-primary px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {isSpinning
              ? t.spinning
              : repeatCount > 1
              ? `${t.spinRoulette} (${repeatCount}×)`
              : t.spinRoulette}
          </button>

          <BatchStatsCard
            runs={batchRuns}
            onDismiss={() => setBatchRuns([])}
            soundEnabled={soundEnabled}
            t={t}
          />
        </div>

        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <SavedPresetsBar
            tool="roulette"
            currentText={rawText}
            presets={presets}
            soundEnabled={soundEnabled}
            onSavePreset={onSavePreset}
            onLoadPreset={(loaded) => {
              setRawText(loaded);
              setRemovedItems([]);
              setOffsetPx(0);
            }}
            onDeletePreset={onDeletePreset}
            t={t}
          />
          <div data-guide="roulette-presets" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.presets}</span>
            <div className="grid grid-cols-3 gap-2">
              {ROULETTE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    setRawText(preset.items.join('\n'));
                    setRemovedItems([]);
                    setOffsetPx(0);
                    playSound('click', soundEnabled);
                  }}
                  className="truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div data-guide="roulette-options" className="flex flex-col gap-2">
            <label htmlFor="roulette-items" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.itemsList}
            </label>
            <textarea
              id="roulette-items"
              value={rawText}
              disabled={isSpinning}
              onChange={(e) => {
                setRawText(e.target.value);
                setOffsetPx(0);
              }}
              rows={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
            />
          </div>

          <RepeatCountControl
            value={repeatCount}
            onChange={setRepeatCount}
            disabled={isSpinning}
            soundEnabled={soundEnabled}
            t={t}
          />

          <div data-guide="roulette-eliminate" className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t.eliminateWinner}
              </span>
              <input
                type="checkbox"
                checked={eliminateMode}
                onChange={(e) => setEliminateMode(e.target.checked)}
                className="dt-accent-control h-4 w-4"
              />
            </label>
            {removedItems.length > 0 && (
              <button
                type="button"
                onClick={handleRestore}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>
                  {t.restoreRemoved} ({removedItems.length} {t.removedCount})
                </span>
              </button>
            )}
          </div>

          <HistoryPanel entries={history} onClear={onClearHistory} t={t} />
        </div>
      </div>
    );
  }
);

RouletteTool.displayName = 'RouletteTool';
