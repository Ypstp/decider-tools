import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { HistoryEntry } from '../../types';
import { TranslationSet } from '../../i18n/translations';
import { playSound } from '../../utils/sound';
import { launchConfetti } from '../../utils/confetti';
import { HistoryPanel } from '../HistoryPanel';
import { RepeatCountControl } from '../RepeatCountControl';
import { BatchStatsCard } from '../BatchStatsCard';
import { CopyResultButton } from '../CopyResultButton';
import { getMostFrequentWinner } from '../../utils/batchWinner';
import { ToolActionHandle } from './WheelTool';

type DiceSides = 4 | 6 | 8 | 10 | 12 | 20;

interface DieState {
  value: number;
  displayValue: number;
  held: boolean;
  rotX: number;
  rotY: number;
  rotZ: number;
  spinCount: number;
}

interface DiceToolProps {
  soundEnabled: boolean;
  history: HistoryEntry[];
  onRecord: (text: string, detail?: string) => void;
  onClearHistory: () => void;
  t: TranslationSet;
}

const D6_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 },
};

function createInitialDice(count: number): DieState[] {
  return Array.from({ length: count }, () => ({
    value: 1,
    displayValue: 1,
    held: false,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    spinCount: 0,
  }));
}

function PipGrid({ face }: { face: number }) {
  const layouts: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const active = layouts[face] || [];
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 place-items-center p-2.5">
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={`h-3.5 w-3.5 rounded-full ${
            active.includes(i)
              ? face === 1
                ? 'bg-blue-600'
                : 'bg-slate-800'
              : 'bg-transparent'
          }`}
        />
      ))}
    </div>
  );
}

function PolyhedralShape({
  sides,
  held,
  rolling,
}: {
  sides: Exclude<DiceSides, 6>;
  held: boolean;
  rolling: boolean;
}) {
  const strokeColor = held
    ? 'stroke-amber-500'
    : rolling
    ? 'stroke-blue-500'
    : 'stroke-slate-300 dark:stroke-slate-600';

  if (sides === 4) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md">
        <polygon
          points="50,8 92,86 8,86"
          className={`fill-white dark:fill-slate-800 ${strokeColor}`}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <line x1="50" y1="8" x2="50" y2="86" className="stroke-slate-200/70 dark:stroke-slate-700/60" strokeWidth="1.5" />
      </svg>
    );
  }
  if (sides === 8) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md">
        <polygon
          points="50,6 92,50 50,94 8,50"
          className={`fill-white dark:fill-slate-800 ${strokeColor}`}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <polygon
          points="50,6 76,50 50,94 24,50"
          className="fill-none stroke-slate-200/80 dark:stroke-slate-700/70"
          strokeWidth="1.5"
        />
        <line x1="8" y1="50" x2="92" y2="50" className="stroke-slate-200/80 dark:stroke-slate-700/70" strokeWidth="1.5" />
      </svg>
    );
  }
  if (sides === 10) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md">
        <polygon
          points="50,6 90,42 50,94 10,42"
          className={`fill-white dark:fill-slate-800 ${strokeColor}`}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <polyline
          points="10,42 50,58 90,42"
          className="fill-none stroke-slate-200/80 dark:stroke-slate-700/70"
          strokeWidth="1.5"
        />
        <line x1="50" y1="6" x2="50" y2="58" className="stroke-slate-200/60 dark:stroke-slate-700/50" strokeWidth="1.5" />
      </svg>
    );
  }
  if (sides === 12) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md">
        <polygon
          points="50,6 91,36 75,86 25,86 9,36"
          className={`fill-white dark:fill-slate-800 ${strokeColor}`}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <polygon
          points="50,24 72,41 64,68 36,68 28,41"
          className="fill-none stroke-slate-200/80 dark:stroke-slate-700/70"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  // D20 icosahedron silhouette + internal facet lines
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-md">
      <polygon
        points="50,5 90,28 90,72 50,95 10,72 10,28"
        className={`fill-white dark:fill-slate-800 ${strokeColor}`}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <polygon
        points="50,21 76,66 24,66"
        className="fill-none stroke-slate-200/85 dark:stroke-slate-700/75"
        strokeWidth="1.5"
      />
      <line x1="50" y1="5" x2="50" y2="21" className="stroke-slate-200/75 dark:stroke-slate-700/70" strokeWidth="1.5" />
      <line x1="90" y1="28" x2="50" y2="21" className="stroke-slate-200/75 dark:stroke-slate-700/70" strokeWidth="1.5" />
      <line x1="10" y1="28" x2="50" y2="21" className="stroke-slate-200/75 dark:stroke-slate-700/70" strokeWidth="1.5" />
      <line x1="90" y1="72" x2="76" y2="66" className="stroke-slate-200/75 dark:stroke-slate-700/70" strokeWidth="1.5" />
      <line x1="10" y1="72" x2="24" y2="66" className="stroke-slate-200/75 dark:stroke-slate-700/70" strokeWidth="1.5" />
      <line x1="50" y1="95" x2="76" y2="66" className="stroke-slate-200/75 dark:stroke-slate-700/70" strokeWidth="1.5" />
      <line x1="50" y1="95" x2="24" y2="66" className="stroke-slate-200/75 dark:stroke-slate-700/70" strokeWidth="1.5" />
    </svg>
  );
}

export const DiceTool = forwardRef<ToolActionHandle, DiceToolProps>(
  ({ soundEnabled, history, onRecord, onClearHistory, t }, ref) => {
    const [diceCount, setDiceCount] = useState(2);
    const [diceSides, setDiceSides] = useState<DiceSides>(6);
    const [modifier, setModifier] = useState(0);
    const [dice, setDice] = useState<DieState[]>(() => createInitialDice(2));
    const [isRolling, setIsRolling] = useState(false);
    const [hasRolled, setHasRolled] = useState(false);
    const [repeatCount, setRepeatCount] = useState(1);
    const [batchRuns, setBatchRuns] = useState<string[]>([]);
    const [batchTotals, setBatchTotals] = useState<number[]>([]);

    const cycleIntervalRef = useRef<number | null>(null);
    const finishTimeoutRef = useRef<number | null>(null);
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;

    useEffect(() => {
      return () => {
        if (cycleIntervalRef.current) window.clearInterval(cycleIntervalRef.current);
        if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current);
      };
    }, []);

    const handleCountChange = (nextCount: number) => {
      if (isRolling) return;
      setDiceCount(nextCount);
      setDice((prev) => {
        if (nextCount <= prev.length) return prev.slice(0, nextCount);
        return [...prev, ...createInitialDice(nextCount - prev.length)];
      });
      playSound('click', soundEnabled);
    };

    const handleSidesChange = (nextSides: DiceSides) => {
      if (isRolling) return;
      setDiceSides(nextSides);
      setDice(createInitialDice(diceCount));
      setHasRolled(false);
      playSound('click', soundEnabled);
    };

    const toggleHold = (idx: number) => {
      if (isRolling || !hasRolled) return;
      setDice((prev) => prev.map((d, i) => (i === idx ? { ...d, held: !d.held } : d)));
      playSound('click', soundEnabled);
    };

    const unlockAll = () => {
      if (isRolling) return;
      setDice((prev) => prev.map((d) => ({ ...d, held: false })));
      playSound('click', soundEnabled);
    };

    const roll = useCallback(() => {
      if (isRolling) return;
      const anyUnheld = dice.some((d) => !d.held);
      if (!anyUnheld) return;

      const totalRuns = Math.max(1, repeatCount);
      setIsRolling(true);
      setBatchRuns([]);
      setBatchTotals([]);
      playSound('dice', soundRef.current);

      // Simulate all throws upfront so the visual dice land on the most frequent total
      const simulatedThrows: { vals: number[]; total: number }[] = [];
      for (let i = 0; i < totalRuns; i++) {
        const vals = dice.map((d) =>
          d.held ? d.value : Math.floor(Math.random() * diceSides) + 1
        );
        const total = vals.reduce((a, b) => a + b, 0) + modifier;
        simulatedThrows.push({ vals, total });
      }

      const labels = simulatedThrows.map((tItem) => `${tItem.total}`);
      const totals = simulatedThrows.map((tItem) => tItem.total);
      const winnerInfo = getMostFrequentWinner(labels);
      const winningThrow =
        simulatedThrows.find((tItem) => `${tItem.total}` === winnerInfo.primary) ||
        simulatedThrows[0];
      const finalValues = winningThrow.vals;

      const nextDice = dice.map((d, idx) => {
        if (d.held) return d;
        const val = finalValues[idx];
        const nextSpin = d.spinCount + 1;
        if (diceSides === 6) {
          const target = D6_ROTATIONS[val];
          const baseTurnX = Math.ceil(d.rotX / 360) * 360 + 720;
          const baseTurnY = Math.ceil(d.rotY / 360) * 360 + 720;
          return {
            value: val,
            displayValue: val,
            held: false,
            rotX: baseTurnX + target.x,
            rotY: baseTurnY + target.y,
            rotZ: 0,
            spinCount: nextSpin,
          };
        }

        const nextRotX = Math.ceil(d.rotX / 360) * 360 + 360 * 2;
        const nextRotY = Math.ceil(d.rotY / 360) * 360 + 360 * 2;
        const nextRotZ = d.rotZ + (idx % 2 === 0 ? 360 : -360);
        return {
          value: val,
          displayValue: Math.floor(Math.random() * diceSides) + 1,
          held: false,
          rotX: nextRotX,
          rotY: nextRotY,
          rotZ: nextRotZ,
          spinCount: nextSpin,
        };
      });

      setDice(nextDice);

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reducedMotion ? 180 : 950;

      if (diceSides !== 6 && !reducedMotion) {
        if (cycleIntervalRef.current) window.clearInterval(cycleIntervalRef.current);
        cycleIntervalRef.current = window.setInterval(() => {
          setDice((prev) =>
            prev.map((d) =>
              d.held ? d : { ...d, displayValue: Math.floor(Math.random() * diceSides) + 1 }
            )
          );
        }, 85);
      }

      if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = window.setTimeout(() => {
        if (cycleIntervalRef.current) {
          window.clearInterval(cycleIntervalRef.current);
          cycleIntervalRef.current = null;
        }
        setDice((prev) => prev.map((d) => ({ ...d, displayValue: d.value })));
        setIsRolling(false);
        setHasRolled(true);

        const modLabel =
          modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : '';
        simulatedThrows.forEach((tItem) => {
          onRecord(`${diceCount}D${diceSides}: ${tItem.total}`, `[${tItem.vals.join(', ')}]${modLabel}`);
        });

        if (totalRuns > 1) {
          setBatchRuns(labels);
          setBatchTotals(totals);
          launchConfetti();
        }

        playSound('win', soundRef.current);
      }, duration);
    }, [isRolling, dice, repeatCount, diceSides, diceCount, modifier, onRecord]);

    useImperativeHandle(ref, () => ({ trigger: roll }), [roll]);

    const rawSum = dice.reduce((acc, d) => acc + d.value, 0);
    const total = rawSum + modifier;

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        <div className="tool-stage flex min-h-[360px] sm:min-h-[440px] lg:min-h-[520px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
          {/* Dice Arena */}
          <div data-guide="dice-stage" className="flex flex-wrap items-center justify-center gap-5 py-4 sm:gap-8 sm:py-6">
            {dice.map((d, idx) =>
              diceSides === 6 ? (
                <div key={idx} className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => (hasRolled ? toggleHold(idx) : roll())}
                    title={hasRolled ? t.clickToHold : t.rollDice}
                    className={`dice-scene relative flex h-[104px] w-[104px] cursor-pointer items-center justify-center rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-blue-500 ${
                      d.held
                        ? 'ring-2 ring-amber-500 ring-offset-4 ring-offset-white dark:ring-offset-slate-900'
                        : ''
                    }`}
                  >
                    <div
                      className="dice-cube relative h-[104px] w-[104px]"
                      style={{ transform: `rotateX(${d.rotX}deg) rotateY(${d.rotY}deg)` }}
                    >
                      {[1, 6, 3, 4, 2, 5].map((face) => (
                        <div
                          key={face}
                          className={`dice-face dice-face-${face} absolute inset-0 rounded-2xl border border-slate-300 bg-white shadow-inner`}
                        >
                          <PipGrid face={face} />
                        </div>
                      ))}
                    </div>
                  </button>
                  {hasRolled && (
                    <button
                      type="button"
                      onClick={() => toggleHold(idx)}
                      className={`inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        d.held
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {d.held ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      <span>{d.held ? t.held : `D6 · ${d.value}`}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div key={idx} className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => (hasRolled ? toggleHold(idx) : roll())}
                    title={hasRolled ? t.clickToHold : t.rollDice}
                    className="dice-scene relative flex h-[112px] w-[112px] cursor-pointer items-center justify-center rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"
                  >
                    <div
                      className="relative flex h-full w-full items-center justify-center transition-transform duration-900 ease-[cubic-bezier(0.18,0.89,0.25,1.08)]"
                      style={{
                        transform: `rotateX(${d.rotX}deg) rotateY(${d.rotY}deg) rotateZ(${d.rotZ}deg) ${
                          isRolling && !d.held ? 'scale(1.12)' : 'scale(1)'
                        }`,
                      }}
                    >
                      <PolyhedralShape
                        sides={diceSides}
                        held={d.held}
                        rolling={isRolling && !d.held}
                      />
                      <div
                        className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center ${
                          diceSides === 4 ? 'pt-4' : ''
                        }`}
                      >
                        <span
                          className={`font-mono text-2xl font-extrabold tabular-nums transition-colors ${
                            isRolling && !d.held
                              ? 'text-blue-600 dark:text-blue-400'
                              : d.value === diceSides && hasRolled
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {d.displayValue}
                        </span>
                      </div>
                    </div>
                  </button>
                  {hasRolled && (
                    <button
                      type="button"
                      onClick={() => toggleHold(idx)}
                      className={`inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        d.held
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {d.held ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      <span>{d.held ? t.held : `D${diceSides} · ${d.value}`}</span>
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span>{t.clickToHold}</span>
            {dice.some((d) => d.held) && (
              <button
                type="button"
                disabled={isRolling}
                onClick={unlockAll}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                {t.unlockAll}
              </button>
            )}
          </div>

          <div className="mt-5 flex min-h-12 flex-wrap items-center justify-center gap-3 text-center">
            {hasRolled ? (
              <>
                <div className="flex items-baseline gap-2.5 font-mono">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t.totalSum}:
                  </span>
                  <span className="text-3xl font-extrabold tabular-nums dt-text-accent">
                    {total}
                  </span>
                  {modifier !== 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({rawSum} {modifier > 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`})
                    </span>
                  )}
                </div>
                <CopyResultButton
                  text={`${diceCount}D${diceSides}: ${total} [${dice.map((d) => d.value).join(', ')}]${
                    modifier !== 0 ? ` (${modifier > 0 ? `+${modifier}` : modifier})` : ''
                  }`}
                  soundEnabled={soundEnabled}
                  t={t}
                />
              </>
            ) : (
              <span className="text-sm font-medium text-slate-400 dark:text-slate-500">—</span>
            )}
          </div>

          <button
            type="button"
            data-guide="dice-action"
            disabled={isRolling || dice.every((d) => d.held)}
            onClick={roll}
            className="mt-5 inline-flex min-h-11 w-full sm:w-auto sm:min-w-48 items-center justify-center gap-2 rounded-xl dt-btn-primary px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {repeatCount > 1 ? `${t.rollDice} (${repeatCount}×)` : t.rollDice}
          </button>

          <BatchStatsCard
            runs={batchRuns}
            onDismiss={() => {
              setBatchRuns([]);
              setBatchTotals([]);
            }}
            diceTotals={batchTotals}
            soundEnabled={soundEnabled}
            t={t}
          />
        </div>

        {/* Sidebar */}
        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div data-guide="dice-type" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.diceType}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {([4, 6, 8, 10, 12, 20] as DiceSides[]).map((sides) => (
                <button
                  key={sides}
                  type="button"
                  disabled={isRolling}
                  onClick={() => handleSidesChange(sides)}
                  className={`rounded-lg border py-2 font-mono text-xs font-bold transition-colors ${
                    diceSides === sides
                      ? 'dt-btn-primary border-transparent'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200'
                  }`}
                >
                  D{sides}
                </button>
              ))}
            </div>
          </div>

          <div data-guide="dice-count" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.diceCount}
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {diceCount}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={isRolling}
                  onClick={() => handleCountChange(n)}
                  className={`rounded-lg py-1.5 font-mono text-xs font-bold transition-colors ${
                    diceCount === n
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div data-guide="dice-modifier" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.modifier}
              </span>
              <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {modifier >= 0 ? `+${modifier}` : modifier}
              </span>
            </div>
            <input
              type="range"
              min={-10}
              max={10}
              value={modifier}
              onChange={(e) => setModifier(parseInt(e.target.value, 10))}
              className="dt-accent-control w-full"
            />
          </div>

          <RepeatCountControl
            value={repeatCount}
            onChange={setRepeatCount}
            disabled={isRolling}
            soundEnabled={soundEnabled}
            t={t}
          />

          <HistoryPanel entries={history} onClear={onClearHistory} t={t} />
        </div>
      </div>
    );
  }
);

DiceTool.displayName = 'DiceTool';
