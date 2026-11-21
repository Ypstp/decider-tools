import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { HistoryEntry, SavedPreset } from '../../types';
import { TranslationSet } from '../../i18n/translations';
import { playSound } from '../../utils/sound';
import { launchConfetti } from '../../utils/confetti';
import { getMostFrequentWinner } from '../../utils/batchWinner';
import { HistoryPanel } from '../HistoryPanel';
import { SavedPresetsBar } from '../SavedPresetsBar';
import { RepeatCountControl } from '../RepeatCountControl';
import { BatchStatsCard } from '../BatchStatsCard';
import { CopyResultButton } from '../CopyResultButton';
import { ToolActionHandle } from './WheelTool';

interface BottleToolProps {
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

const DEFAULT_PLAYERS = [
  'Player 1',
  'Player 2',
  'Player 3',
  'Player 4',
  'Player 5',
  'Player 6',
];

const BOTTLE_PRESETS: { label: string; items: string[] }[] = [
  {
    label: '6 Players',
    items: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'],
  },
  {
    label: 'Squad',
    items: ['Alex', 'Maya', 'Leo', 'Sofia', 'Noah', 'Chloe', 'Ethan', 'Zoe'],
  },
  {
    label: 'Chores',
    items: ['Dishes', 'Trash', 'Cooking', 'Vacuuming', 'Groceries'],
  },
  {
    label: 'Truth / Dare',
    items: ['Truth', 'Dare', 'Double Dare', 'Skip Turn', 'Ask Someone', 'Wildcard'],
  },
];

const SEAT_COLORS = [
  '#2563EB',
  '#059669',
  '#D97706',
  '#E11D48',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#65A30D',
];

export const BottleTool = forwardRef<ToolActionHandle, BottleToolProps>(
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
    const [rawText, setRawText] = useState(() => initialItems || DEFAULT_PLAYERS.join('\n'));
    const [durationMs, setDurationMs] = useState(4000);
    const [repeatCount, setRepeatCount] = useState(1);
    const [eliminateMode, setEliminateMode] = useState(false);
    const [removedItems, setRemovedItems] = useState<string[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [angleDeg, setAngleDeg] = useState(0);
    const [winner, setWinner] = useState<string | null>(null);
    const [winnerSeatIdx, setWinnerSeatIdx] = useState<number | null>(null);
    const [batchRuns, setBatchRuns] = useState<string[]>([]);

    const angleRef = useRef(0);
    const animFrameRef = useRef<number | null>(null);
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;

    const options = useMemo(
      () =>
        rawText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 16),
      [rawText]
    );

    useEffect(() => {
      if (initialItems) {
        setRawText(initialItems);
        setRemovedItems([]);
        setWinner(null);
        setWinnerSeatIdx(null);
      }
    }, [initialItems]);

    useEffect(() => {
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, []);

    const spin = useCallback(() => {
      if (isSpinning || options.length < 2) return;
      const totalRuns = Math.max(1, repeatCount);

      setIsSpinning(true);
      setWinner(null);
      setWinnerSeatIdx(null);
      setBatchRuns([]);
      playSound('spin', soundRef.current);

      // Simulate all draws upfront so the single bottle spin points at the overall most-frequent winner
      let pool = [...options];
      const preResults: string[] = [];
      const newlyRemoved: string[] = [];

      for (let i = 0; i < totalRuns; i++) {
        if (eliminateMode && pool.length < 2) {
          if (pool.length === 1) preResults.push(pool[0]);
          break;
        }
        const pickIdx = Math.floor(Math.random() * pool.length);
        const pick = pool[pickIdx];
        preResults.push(pick);
        if (eliminateMode && pool.length > 1) {
          pool = pool.filter((_, idx) => idx !== pickIdx);
          newlyRemoved.push(pick);
        }
      }

      const winnerInfo = getMostFrequentWinner(preResults);
      const targetSeatIdx = Math.max(0, options.indexOf(winnerInfo.primary));
      const seatStepDeg = 360 / options.length;
      const desiredModDeg = (targetSeatIdx * seatStepDeg + (Math.random() - 0.5) * Math.min(12, seatStepDeg * 0.25) + 360) % 360;

      const startAngle = angleRef.current;
      const startMod = ((startAngle % 360) + 360) % 360;
      const extraMod = (desiredModDeg - startMod + 360) % 360;
      const fullTurns = durationMs === 2000 ? 5 : durationMs === 6000 ? 11 : 8;
      const deltaAngle = fullTurns * 360 + extraMod;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const effectiveDuration = reducedMotion ? 220 : durationMs;
      const startTime = performance.now();
      let lastSeatSector = Math.floor(((startMod + seatStepDeg / 2) % 360) / seatStepDeg);

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / effectiveDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3.5);
        const current = startAngle + deltaAngle * easeOut;

        angleRef.current = current;
        setAngleDeg(current);

        const norm = ((current % 360) + 360) % 360;
        const sector = Math.floor(((norm + seatStepDeg / 2) % 360) / seatStepDeg);
        if (sector !== lastSeatSector) {
          lastSeatSector = sector;
          playSound('tick', soundRef.current, (1 - progress) * 0.35);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          angleRef.current = current % 360;
          setIsSpinning(false);
          setWinnerSeatIdx(targetSeatIdx);

          if (totalRuns > 1) {
            setWinner(winnerInfo.displayLabel);
            setBatchRuns(preResults);
            preResults.forEach((res) => onRecord(res, `${options.length} players`));
          } else {
            const singleWinner = preResults[0];
            setWinner(singleWinner);
            onRecord(singleWinner, `${options.length} players`);
          }

          if (newlyRemoved.length > 0) {
            setRemovedItems((prev) => [...prev, ...newlyRemoved]);
            setRawText(pool.join('\n'));
            setWinnerSeatIdx(null);
          }

          playSound('win', soundRef.current);
          launchConfetti();
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    }, [isSpinning, options, repeatCount, durationMs, eliminateMode, onRecord]);

    useImperativeHandle(ref, () => ({ trigger: spin }), [spin]);

    const handleShuffle = () => {
      if (isSpinning || options.length < 2) return;
      const copy = [...options];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setRawText(copy.join('\n'));
      setWinner(null);
      setWinnerSeatIdx(null);
      playSound('click', soundEnabled);
    };

    const handleRestore = () => {
      if (removedItems.length === 0) return;
      setRawText([...options, ...removedItems].join('\n'));
      setRemovedItems([]);
      setWinnerSeatIdx(null);
      playSound('click', soundEnabled);
    };

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        {/* Stage */}
        <div className="tool-stage flex min-h-[400px] sm:min-h-[480px] lg:min-h-[540px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
          {/* Circular Ring Table */}
          <div data-guide="bottle-stage" className="relative my-2 flex h-[min(82vw,340px)] w-[min(82vw,340px)] items-center justify-center sm:h-[380px] sm:w-[380px]">
            {/* Outer subtle table ring */}
            <div className="absolute inset-7 rounded-full border-2 border-dashed border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60 sm:inset-10" />
            <div className="absolute inset-14 rounded-full border border-slate-200/70 dark:border-slate-800/70 sm:inset-20" />

            {/* Player Seats around Perimeter */}
            {options.map((label, idx) => {
              const theta = (idx * 2 * Math.PI) / options.length - Math.PI / 2;
              const radiusPct = 41.5;
              const xPct = 50 + Math.cos(theta) * radiusPct;
              const yPct = 50 + Math.sin(theta) * radiusPct;
              const isWinner = winnerSeatIdx === idx;
              const seatColor = SEAT_COLORS[idx % SEAT_COLORS.length];

              return (
                <div
                  key={`${idx}-${label}`}
                  style={{ left: `${xPct}%`, top: `${yPct}%` }}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                >
                  <div
                    className={`flex max-w-[78px] items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-bold shadow-xs transition-all duration-200 sm:max-w-[116px] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs ${
                      isWinner
                        ? 'scale-110 dt-border-accent dt-bg-accent-soft dt-text-accent shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span
                      className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: seatColor }}
                    />
                    <span className="truncate">{label}</span>
                  </div>
                </div>
              );
            })}

            {/* Center Spinning Bottle */}
            <button
              type="button"
              onClick={spin}
              disabled={isSpinning || options.length < 2}
              aria-label={t.spinBottle}
              className="relative z-20 flex h-28 w-28 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed sm:h-44 sm:w-44"
            >
              <div
                className="flex h-full w-full items-center justify-center will-change-transform"
                style={{ transform: `rotate(${angleDeg}deg)` }}
              >
                <svg
                  viewBox="0 0 80 180"
                  className="h-24 w-12 drop-shadow-lg sm:h-40 sm:w-20"
                  aria-hidden="true"
                >
                  {/* Cork / Cap */}
                  <rect x="33" y="8" width="14" height="10" rx="2" fill="#F59E0B" />
                  {/* Neck lip */}
                  <rect x="31" y="17" width="18" height="5" rx="2.5" fill="#047857" />
                  {/* Neck */}
                  <path d="M33 22 L47 22 L49 52 L31 52 Z" fill="#10B981" />
                  {/* Shoulder & Body */}
                  <path
                    d="M31 52 C22 58 18 68 18 82 L18 158 C18 166 24 172 32 172 L48 172 C56 172 62 166 62 158 L62 82 C62 68 58 58 49 52 Z"
                    fill="#059669"
                    stroke="#064E3B"
                    strokeWidth="2.5"
                  />
                  {/* Glass Highlight */}
                  <path
                    d="M25 84 L25 154"
                    stroke="#A7F3D0"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                  {/* Center Label */}
                  <rect
                    x="24"
                    y="92"
                    width="32"
                    height="44"
                    rx="4"
                    fill="#F8FAFC"
                    opacity="0.95"
                  />
                  {/* Arrow indicator on label pointing toward neck */}
                  <path
                    d="M40 100 L48 112 L43 112 L43 126 L37 126 L37 112 L32 112 Z"
                    fill="#0F172A"
                  />
                </svg>
              </div>
            </button>
          </div>

          {/* Winner & Copy Result */}
          <div className="mt-4 flex min-h-12 flex-wrap items-center justify-center gap-3 text-center">
            {winner ? (
              <>
                <div className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight dt-text-accent sm:text-3xl">
                  <Sparkles className="h-6 w-6 shrink-0" />
                  <span>{winner}</span>
                </div>
                <CopyResultButton text={winner} soundEnabled={soundEnabled} t={t} />
              </>
            ) : (
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {isSpinning
                  ? t.spinning
                  : `${options.length} ${t.optionsList.split(' ')[0].toLowerCase()} · ${t.bottleHint}`}
              </span>
            )}
          </div>

          <button
            type="button"
            data-guide="bottle-action"
            disabled={isSpinning || options.length < 2}
            onClick={spin}
            className="mt-5 inline-flex min-h-11 w-full sm:w-auto sm:min-w-48 items-center justify-center gap-2 rounded-xl dt-btn-primary px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {isSpinning
              ? t.spinning
              : repeatCount > 1
              ? `${t.spinBottle} (${repeatCount}×)`
              : t.spinBottle}
          </button>

          <BatchStatsCard
            runs={batchRuns}
            onDismiss={() => setBatchRuns([])}
            soundEnabled={soundEnabled}
            t={t}
          />
        </div>

        {/* Sidebar */}
        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <SavedPresetsBar
            tool="bottle"
            currentText={rawText}
            presets={presets}
            soundEnabled={soundEnabled}
            onSavePreset={onSavePreset}
            onLoadPreset={(items) => {
              setRawText(items);
              setRemovedItems([]);
              setWinner(null);
              setWinnerSeatIdx(null);
            }}
            onDeletePreset={onDeletePreset}
            t={t}
          />

          <div data-guide="bottle-presets" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.presets}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {BOTTLE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    setRawText(preset.items.join('\n'));
                    setRemovedItems([]);
                    setWinner(null);
                    setWinnerSeatIdx(null);
                    playSound('click', soundEnabled);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div data-guide="bottle-options" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="bottle-options" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.optionsList}
              </label>
              <button
                type="button"
                disabled={isSpinning || options.length < 2}
                onClick={handleShuffle}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>{t.shuffle}</span>
              </button>
            </div>
            <textarea
              id="bottle-options"
              value={rawText}
              disabled={isSpinning}
              onChange={(e) => {
                setRawText(e.target.value);
                setWinnerSeatIdx(null);
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

          <div data-guide="bottle-duration" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.spinDuration}
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              {[
                { label: t.fast, ms: 2000 },
                { label: t.normal, ms: 4000 },
                { label: t.suspense, ms: 6000 },
              ].map((opt) => (
                <button
                  key={opt.ms}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    setDurationMs(opt.ms);
                    playSound('click', soundEnabled);
                  }}
                  className={`rounded-lg px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    durationMs === opt.ms
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div data-guide="bottle-eliminate" className="flex flex-col gap-2">
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

BottleTool.displayName = 'BottleTool';
