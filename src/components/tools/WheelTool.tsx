import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw, Shuffle, Sparkles } from 'lucide-react';
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

export interface ToolActionHandle {
  trigger: () => void;
}

interface WheelToolProps {
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

const SLICE_COLORS = [
  '#0077FF',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#6366F1',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

const PRESETS: { label: string; items: string[] }[] = [
  { label: 'Dinner', items: ['Pizza', 'Sushi', 'Tacos', 'Ramen', 'Burgers', 'Thai Curry'] },
  { label: 'Yes / No', items: ['Yes', 'No', 'Maybe', 'Ask Again', 'Definitely', 'Not Today'] },
  { label: '1 – 8', items: ['1', '2', '3', '4', '5', '6', '7', '8'] },
  { label: 'Movie Night', items: ['Sci-Fi', 'Comedy', 'Thriller', 'Action', 'Documentary', 'Mystery'] },
];

export const WheelTool = forwardRef<ToolActionHandle, WheelToolProps>(
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
    const [rawText, setRawText] = useState(
      initialItems || 'Pizza\nSushi\nTacos\nRamen\nBurgers\nThai Curry'
    );
    const [removedItems, setRemovedItems] = useState<string[]>([]);
    const [eliminateMode, setEliminateMode] = useState(false);
    const [durationMs, setDurationMs] = useState(4000);
    const [winner, setWinner] = useState<string | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [pointerTilt, setPointerTilt] = useState(0);
    const [repeatCount, setRepeatCount] = useState(1);
    const [batchRuns, setBatchRuns] = useState<string[]>([]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const angleRef = useRef(0);
    const animFrameRef = useRef<number | null>(null);
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;

    const options = rawText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const drawWheel = useCallback(
      (angle: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const displaySize = 360;
        if (canvas.width !== displaySize * dpr) {
          canvas.width = displaySize * dpr;
          canvas.height = displaySize * dpr;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.scale(dpr, dpr);
        const cx = displaySize / 2;
        const cy = displaySize / 2;
        const radius = displaySize / 2 - 14;

        ctx.clearRect(0, 0, displaySize, displaySize);

        if (options.length === 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = '#334155';
          ctx.fill();
          ctx.restore();
          return;
        }

        const arc = (Math.PI * 2) / options.length;

        // Draw slices
        options.forEach((opt, i) => {
          const start = angle + i * arc;
          const end = start + arc;

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, start, end);
          ctx.closePath();
          ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
          ctx.fill();

          ctx.lineWidth = 2;
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.stroke();

          // Label
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(start + arc / 2);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          const fontSize = options.length > 12 ? 11 : options.length > 8 ? 12.5 : 14;
          ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
          ctx.shadowColor = 'rgba(0,0,0,0.35)';
          ctx.shadowBlur = 3;
          const truncated = opt.length > 16 ? opt.slice(0, 15) + '…' : opt;
          ctx.fillText(truncated, radius - 22, 0);
          ctx.restore();
        });

        // Outer metallic rim & pegs
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.stroke();

        for (let i = 0; i < options.length; i++) {
          const pegAngle = angle + i * arc;
          const px = cx + Math.cos(pegAngle) * (radius - 2);
          const py = cy + Math.sin(pegAngle) * (radius - 2);
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(15,23,42,0.45)';
          ctx.stroke();
        }

        // Center hub
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0F172A';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#0077FF';
        ctx.fill();

        ctx.restore();
      },
      [options]
    );

    useEffect(() => {
      drawWheel(angleRef.current);
    }, [drawWheel]);

    useEffect(() => {
      if (initialItems) {
        setRawText(initialItems);
        setRemovedItems([]);
      }
    }, [initialItems]);

    useEffect(() => {
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, []);

    const getSliceIndexAtTopPointer = (angle: number, count: number): number => {
      const arc = (Math.PI * 2) / count;
      const pointerAngle = -Math.PI / 2;
      const relative = (((pointerAngle - angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(relative / arc) % count;
    };

    const spin = useCallback(() => {
      if (isSpinning || options.length < 2) return;
      const totalRuns = Math.max(1, repeatCount);

      setIsSpinning(true);
      setWinner(null);
      setBatchRuns([]);
      playSound('spin', soundRef.current);

      // Simulate all draws up front so the single visual spin lands on the overall most-frequent winner
      let pool = [...options];
      const preResults: string[] = [];
      const newlyRemoved: string[] = [];

      for (let i = 0; i < totalRuns; i++) {
        if (eliminateMode && pool.length < 2) {
          if (pool.length === 1 && preResults.length === 0) {
            preResults.push(pool[0]);
          } else if (pool.length === 1 && i > 0) {
            preResults.push(pool[0]);
          }
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
      const targetSliceIdx = Math.max(0, options.indexOf(winnerInfo.primary));

      const startAngle = angleRef.current;
      const twoPi = Math.PI * 2;
      const arc = twoPi / options.length;
      const pointerAngle = -Math.PI / 2;
      const desiredRelative = (targetSliceIdx + 0.18 + Math.random() * 0.64) * arc;
      const desiredMod = (((pointerAngle - desiredRelative) % twoPi) + twoPi) % twoPi;
      const startMod = ((startAngle % twoPi) + twoPi) % twoPi;
      const extraMod = (((desiredMod - startMod) % twoPi) + twoPi) % twoPi;

      const fullTurns = durationMs === 2000 ? 6 : durationMs === 6000 ? 14 : 10;
      const deltaAngle = twoPi * fullTurns + extraMod;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const effectiveDuration = reducedMotion ? 250 : durationMs;

      const startTime = performance.now();
      let lastSliceIdx = getSliceIndexAtTopPointer(startAngle, options.length);
      let bounceTimeout: number | null = null;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / effectiveDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3.4);
        const currentAngle = startAngle + deltaAngle * easeOut;

        angleRef.current = currentAngle;
        drawWheel(currentAngle);

        const currentSliceIdx = getSliceIndexAtTopPointer(currentAngle, options.length);
        if (currentSliceIdx !== lastSliceIdx) {
          lastSliceIdx = currentSliceIdx;
          playSound('tick', soundRef.current, (1 - progress) * 0.4);
          setPointerTilt(-22);
          if (bounceTimeout) window.clearTimeout(bounceTimeout);
          bounceTimeout = window.setTimeout(() => setPointerTilt(0), 65);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          angleRef.current = currentAngle % twoPi;
          setPointerTilt(0);
          setIsSpinning(false);

          if (totalRuns > 1) {
            setWinner(winnerInfo.displayLabel);
            setBatchRuns(preResults);
            preResults.forEach((res) => onRecord(res, `${options.length} slices`));
          } else {
            const singleWinner = preResults[0];
            setWinner(singleWinner);
            onRecord(singleWinner, `${options.length} slices`);
          }

          if (newlyRemoved.length > 0) {
            setRemovedItems((prev) => [...prev, ...newlyRemoved]);
            setRawText(pool.join('\n'));
          }

          playSound('win', soundRef.current);
          launchConfetti();
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    }, [isSpinning, options, repeatCount, durationMs, drawWheel, onRecord, eliminateMode]);

    useImperativeHandle(ref, () => ({ trigger: spin }), [spin]);

    const handleShuffle = () => {
      if (isSpinning || options.length < 2) return;
      const copy = [...options];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setRawText(copy.join('\n'));
      playSound('click', soundEnabled);
    };

    const handleRestore = () => {
      if (removedItems.length === 0) return;
      const merged = [...options, ...removedItems];
      setRawText(merged.join('\n'));
      setRemovedItems([]);
      playSound('click', soundEnabled);
    };

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        {/* Stage */}
        <div className="tool-stage flex min-h-[380px] sm:min-h-[460px] lg:min-h-[520px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
          <div data-guide="wheel-stage" className="relative mx-auto my-2 flex items-center justify-center">
            {/* Top Pointer with physical peg deflection */}
            <div
              className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 transition-transform duration-75"
              style={{ transform: `rotate(${pointerTilt}deg)`, transformOrigin: '50% 4px' }}
            >
              <svg width="32" height="36" viewBox="0 0 32 36" className="drop-shadow-md">
                <path
                  d="M16 34L4 6C3.1 3.9 4.6 1.5 6.9 1.5H25.1C27.4 1.5 28.9 3.9 28 6L16 34Z"
                  style={{ fill: 'var(--dt-accent)' }}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
              </svg>
            </div>

            <canvas
              ref={canvasRef}
              onClick={spin}
              className="aspect-square h-[min(78vw,340px)] w-[min(78vw,340px)] cursor-pointer rounded-full shadow-xl sm:h-[360px] sm:w-[360px]"
              aria-label={t.spinWheel}
            />
          </div>

          <div className="mt-6 flex min-h-12 flex-wrap items-center justify-center gap-3 text-center">
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
                  : `${options.length} ${t.optionsList.split(' ')[0].toLowerCase()} · ${t.clickWheelHint}`}
              </span>
            )}
          </div>

          <button
            type="button"
            data-guide="wheel-action"
            disabled={isSpinning || options.length < 2}
            onClick={spin}
            className="mt-5 inline-flex min-h-11 w-full sm:w-auto sm:min-w-48 items-center justify-center gap-2 rounded-xl dt-btn-primary px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {isSpinning
              ? t.spinning
              : repeatCount > 1
              ? `${t.spinWheel} (${repeatCount}×)`
              : t.spinWheel}
          </button>

          <BatchStatsCard
            runs={batchRuns}
            onDismiss={() => setBatchRuns([])}
            soundEnabled={soundEnabled}
            t={t}
          />
        </div>

        {/* Sidebar Controls */}
        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <SavedPresetsBar
            tool="wheel"
            currentText={rawText}
            presets={presets}
            soundEnabled={soundEnabled}
            onSavePreset={onSavePreset}
            onLoadPreset={(items) => {
              setRawText(items);
              setRemovedItems([]);
            }}
            onDeletePreset={onDeletePreset}
            t={t}
          />
          {/* Quick Presets */}
          <div data-guide="wheel-presets" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.presets}</span>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => {
                    setRawText(preset.items.join('\n'));
                    setRemovedItems([]);
                    playSound('click', soundEnabled);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options Input */}
          <div data-guide="wheel-options" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="wheel-options" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
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
              id="wheel-options"
              value={rawText}
              disabled={isSpinning}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
            />
          </div>

          {/* Repeat Count */}
          <RepeatCountControl
            value={repeatCount}
            onChange={setRepeatCount}
            disabled={isSpinning}
            soundEnabled={soundEnabled}
            t={t}
          />

          {/* Spin Duration */}
          <div data-guide="wheel-duration" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.spinDuration}</span>
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

          {/* Elimination Toggle */}
          <div data-guide="wheel-eliminate" className="flex flex-col gap-2">
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

WheelTool.displayName = 'WheelTool';
