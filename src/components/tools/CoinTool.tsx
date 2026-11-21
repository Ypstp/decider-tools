import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { HistoryEntry } from '../../types';
import { TranslationSet } from '../../i18n/translations';
import { playSound } from '../../utils/sound';
import { launchConfetti } from '../../utils/confetti';
import { HistoryPanel } from '../HistoryPanel';
import { RepeatCountControl } from '../RepeatCountControl';
import { BatchStatsCard } from '../BatchStatsCard';
import { CopyResultButton } from '../CopyResultButton';
import { ToolActionHandle } from './WheelTool';

type CoinStyle = 'standard' | 'currency' | 'oracle' | 'custom';
type SeriesFormat = 1 | 3 | 5;

interface CoinToolProps {
  soundEnabled: boolean;
  history: HistoryEntry[];
  onRecord: (text: string, detail?: string) => void;
  onClearHistory: () => void;
  t: TranslationSet;
}

export const CoinTool = forwardRef<ToolActionHandle, CoinToolProps>(
  ({ soundEnabled, history, onRecord, onClearHistory, t }, ref) => {
    const [coinStyle, setCoinStyle] = useState<CoinStyle>('standard');
    const [customSideA, setCustomSideA] = useState('Pizza');
    const [customSideB, setCustomSideB] = useState('Sushi');
    const [seriesFormat, setSeriesFormat] = useState<SeriesFormat>(1);
    const [rotY, setRotY] = useState(0);
    const [isFlipping, setIsFlipping] = useState(false);
    const [lastSide, setLastSide] = useState<'A' | 'B' | null>(null);
    const [scoreA, setScoreA] = useState(0);
    const [scoreB, setScoreB] = useState(0);
    const [repeatCount, setRepeatCount] = useState(1);
    const [batchRuns, setBatchRuns] = useState<string[]>([]);

    const flipTimeoutRef = useRef<number | null>(null);
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;

    useEffect(() => {
      return () => {
        if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current);
      };
    }, []);

    const labels =
      coinStyle === 'currency'
        ? { a: 'USD $', b: 'EUR €' }
        : coinStyle === 'oracle'
        ? { a: t.yes, b: t.no }
        : coinStyle === 'custom'
        ? {
            a: customSideA.trim() || t.heads,
            b: customSideB.trim() || t.tails,
          }
        : { a: t.heads, b: t.tails };

    const targetWins = seriesFormat === 1 ? 1 : Math.ceil(seriesFormat / 2);
    const seriesFinished = seriesFormat > 1 && (scoreA >= targetWins || scoreB >= targetWins);

    const resetSeries = () => {
      setScoreA(0);
      setScoreB(0);
      setLastSide(null);
      playSound('click', soundEnabled);
    };

    const flip = useCallback(() => {
      if (isFlipping) return;
      const totalRuns = Math.max(1, repeatCount);
      const isBatch = totalRuns > 1;

      if (!isBatch && seriesFinished) {
        setScoreA(0);
        setScoreB(0);
      }

      setIsFlipping(true);
      setBatchRuns([]);
      playSound('coin', soundRef.current);

      const preResults: string[] = [];
      let countA = 0;
      let countB = 0;
      for (let i = 0; i < totalRuns; i++) {
        if (Math.random() < 0.5) {
          countA++;
          preResults.push(labels.a);
        } else {
          countB++;
          preResults.push(labels.b);
        }
      }

      const isSideA =
        countA > countB ? true : countB > countA ? false : Math.random() < 0.5;
      setRotY((prev) => {
        const base = Math.ceil(prev / 360) * 360 + 1800;
        return base + (isSideA ? 0 : 180);
      });

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const delay = reducedMotion ? 200 : 1350;

      flipTimeoutRef.current = window.setTimeout(() => {
        setIsFlipping(false);
        const side = isSideA ? 'A' : 'B';
        setLastSide(side);
        const landedLabel = isSideA ? labels.a : labels.b;

        if (!isBatch && seriesFormat > 1) {
          const nextA = (seriesFinished ? 0 : scoreA) + (isSideA ? 1 : 0);
          const nextB = (seriesFinished ? 0 : scoreB) + (isSideA ? 0 : 1);
          setScoreA(nextA);
          setScoreB(nextB);

          if (nextA >= targetWins || nextB >= targetWins) {
            playSound('win', soundRef.current);
            launchConfetti();
            onRecord(`${landedLabel} (${nextA}–${nextB})`, `Best of ${seriesFormat}`);
          } else {
            playSound('click', soundRef.current);
            onRecord(landedLabel, `${nextA}–${nextB}`);
          }
          return;
        }

        preResults.forEach((res) => onRecord(res));
        if (isBatch) {
          setBatchRuns(preResults);
          launchConfetti();
        }
        playSound('win', soundRef.current);
      }, delay);
    }, [
      isFlipping,
      repeatCount,
      seriesFinished,
      labels.a,
      labels.b,
      seriesFormat,
      scoreA,
      scoreB,
      targetWins,
      onRecord,
    ]);

    useImperativeHandle(ref, () => ({ trigger: flip }), [flip]);

    const frontStyle =
      coinStyle === 'currency'
        ? 'border-emerald-400 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white'
        : coinStyle === 'oracle'
        ? 'border-blue-400 bg-gradient-to-br from-blue-500 to-indigo-700 text-white'
        : coinStyle === 'custom'
        ? 'border-indigo-400 bg-gradient-to-br from-indigo-500 to-blue-700 text-white'
        : 'border-amber-300 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950';

    const backStyle =
      coinStyle === 'currency'
        ? 'border-blue-400 bg-gradient-to-br from-blue-600 to-blue-800 text-white'
        : coinStyle === 'oracle'
        ? 'border-rose-400 bg-gradient-to-br from-rose-500 to-rose-700 text-white'
        : coinStyle === 'custom'
        ? 'border-teal-400 bg-gradient-to-br from-teal-500 to-emerald-700 text-white'
        : 'border-slate-300 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-900';

    const faceTextSize = (txt: string) =>
      txt.length > 14 ? 'text-sm' : txt.length > 8 ? 'text-lg' : 'text-2xl';

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        <div className="tool-stage flex min-h-[360px] sm:min-h-[440px] lg:min-h-[520px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
          {/* Scoreboard when Best-of-3/5 is active */}
          {seriesFormat > 1 && (
            <div className="mb-5 sm:mb-6 flex max-w-full flex-wrap items-center justify-center gap-3 sm:gap-5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 sm:px-5 sm:py-2.5 font-mono text-sm dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex min-w-0 items-center gap-2">
                <span className="max-w-24 sm:max-w-28 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {labels.a}
                </span>
                <span className="text-lg font-extrabold tabular-nums dt-text-accent">
                  {scoreA}
                </span>
              </div>
              <span className="text-xs text-slate-400">·</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {scoreB}
                </span>
                <span className="max-w-28 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {labels.b}
                </span>
              </div>
              {(scoreA > 0 || scoreB > 0) && (
                <button
                  type="button"
                  onClick={resetSeries}
                  title={t.resetSeries}
                  className="ml-1 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Clickable 3D Coin */}
          <button
            type="button"
            data-guide="coin-stage"
            onClick={flip}
            aria-label={t.flipCoin}
            className={`coin-scene relative my-3 sm:my-4 h-36 w-36 sm:h-44 sm:w-44 cursor-pointer rounded-full transition-transform duration-500 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-blue-500 ${
              isFlipping ? '-translate-y-7 scale-110' : 'translate-y-0 scale-100'
            }`}
          >
            <div
              className="coin-3d relative h-full w-full"
              style={{ transform: `rotateY(${rotY}deg)` }}
            >
              <div
                className={`coin-face absolute inset-0 flex items-center justify-center rounded-full border-[6px] px-4 text-center font-extrabold tracking-tight break-words shadow-xl ${faceTextSize(
                  labels.a
                )} ${frontStyle}`}
              >
                <span className="line-clamp-3">{labels.a}</span>
              </div>
              <div
                className={`coin-face coin-face-back absolute inset-0 flex items-center justify-center rounded-full border-[6px] px-4 text-center font-extrabold tracking-tight break-words shadow-xl ${faceTextSize(
                  labels.b
                )} ${backStyle}`}
              >
                <span className="line-clamp-3">{labels.b}</span>
              </div>
            </div>
          </button>

          <div className="mt-6 flex min-h-12 flex-wrap items-center justify-center gap-3 text-center">
            {lastSide ? (
              <>
                <div className="text-2xl font-extrabold tracking-tight dt-text-accent sm:text-3xl">
                  {lastSide === 'A' ? labels.a : labels.b}
                </div>
                <CopyResultButton
                  text={lastSide === 'A' ? labels.a : labels.b}
                  soundEnabled={soundEnabled}
                  t={t}
                />
              </>
            ) : (
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {isFlipping ? '···' : t.clickCoinHint}
              </span>
            )}
          </div>

          <button
            type="button"
            data-guide="coin-action"
            disabled={isFlipping}
            onClick={flip}
            className="mt-5 inline-flex min-h-11 w-full sm:w-auto sm:min-w-48 items-center justify-center gap-2 rounded-xl dt-btn-primary px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {repeatCount > 1 ? `${t.flipCoin} (${repeatCount}×)` : t.flipCoin}
          </button>

          <BatchStatsCard
            runs={batchRuns}
            onDismiss={() => setBatchRuns([])}
            soundEnabled={soundEnabled}
            t={t}
          />
        </div>

        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div data-guide="coin-style" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.coinType}
            </span>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { id: 'standard', label: t.standardCoin },
                  { id: 'currency', label: t.currencyCoin },
                  { id: 'oracle', label: t.oracleCoin },
                  { id: 'custom', label: t.customCoin },
                ] as { id: CoinStyle; label: string }[]
              ).map((style) => (
                <button
                  key={style.id}
                  type="button"
                  disabled={isFlipping}
                  onClick={() => {
                    setCoinStyle(style.id);
                    setLastSide(null);
                    playSound('click', soundEnabled);
                  }}
                  className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-colors ${
                    coinStyle === style.id
                      ? 'dt-border-accent dt-bg-accent-soft dt-text-accent'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {coinStyle === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="coin-side-a"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {t.sideALabel}
                </label>
                <input
                  id="coin-side-a"
                  type="text"
                  maxLength={24}
                  disabled={isFlipping}
                  value={customSideA}
                  onChange={(e) => setCustomSideA(e.target.value)}
                  className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="coin-side-b"
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  {t.sideBLabel}
                </label>
                <input
                  id="coin-side-b"
                  type="text"
                  maxLength={24}
                  disabled={isFlipping}
                  value={customSideB}
                  onChange={(e) => setCustomSideB(e.target.value)}
                  className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-base sm:text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div data-guide="coin-series" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.seriesMode}
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              {(
                [
                  { val: 1, label: t.singleFlip },
                  { val: 3, label: t.bestOf3 },
                  { val: 5, label: t.bestOf5 },
                ] as { val: SeriesFormat; label: string }[]
              ).map((fmt) => (
                <button
                  key={fmt.val}
                  type="button"
                  disabled={isFlipping}
                  onClick={() => {
                    setSeriesFormat(fmt.val);
                    setScoreA(0);
                    setScoreB(0);
                    setLastSide(null);
                    playSound('click', soundEnabled);
                  }}
                  className={`rounded-lg px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    seriesFormat === fmt.val
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          <RepeatCountControl
            value={repeatCount}
            onChange={setRepeatCount}
            disabled={isFlipping}
            soundEnabled={soundEnabled}
            t={t}
          />

          <HistoryPanel entries={history} onClear={onClearHistory} t={t} />
        </div>
      </div>
    );
  }
);

CoinTool.displayName = 'CoinTool';
