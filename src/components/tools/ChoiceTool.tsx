import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw, Shuffle, Users } from 'lucide-react';
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

type ChoiceMode = 'single' | 'teams';

interface ChoiceToolProps {
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

export const ChoiceTool = forwardRef<ToolActionHandle, ChoiceToolProps>(
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
      initialItems || 'Pizza\nBurger\nSushi\nTacos\nPasta\nSalad'
    );
    const [mode, setMode] = useState<ChoiceMode>('single');
    const [teamCount, setTeamCount] = useState(2);
    const [eliminateMode, setEliminateMode] = useState(false);
    const [removedItems, setRemovedItems] = useState<string[]>([]);
    const [displayPick, setDisplayPick] = useState<string | null>(null);
    const [teams, setTeams] = useState<string[][] | null>(null);
    const [isPicking, setIsPicking] = useState(false);
    const [repeatCount, setRepeatCount] = useState(1);
    const [batchRuns, setBatchRuns] = useState<string[]>([]);

    const timerRef = useRef<number | null>(null);
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;

    const options = rawText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    useEffect(() => {
      if (initialItems) {
        setRawText(initialItems);
        setRemovedItems([]);
      }
    }, [initialItems]);

    useEffect(() => {
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    }, []);

    const execute = useCallback(() => {
      if (isPicking || options.length === 0) return;

      if (mode === 'teams') {
        setBatchRuns([]);
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const buckets: string[][] = Array.from({ length: teamCount }, () => []);
        shuffled.forEach((item, idx) => {
          buckets[idx % teamCount].push(item);
        });
        setTeams(buckets);
        setDisplayPick(null);
        playSound('win', soundRef.current);
        onRecord(
          buckets.map((b, i) => `${t.teamLabel} ${i + 1}: ${b.join(', ')}`).join(' | '),
          `${options.length} → ${teamCount} teams`
        );
        return;
      }

      const totalRuns = Math.max(1, repeatCount);
      setBatchRuns([]);

      if (options.length === 1 && totalRuns === 1) {
        setDisplayPick(options[0]);
        onRecord(options[0]);
        playSound('win', soundRef.current);
        return;
      }

      setIsPicking(true);
      setTeams(null);
      playSound('spin', soundRef.current);

      let pool = [...options];
      const preResults: string[] = [];
      const newlyRemoved: string[] = [];

      for (let i = 0; i < totalRuns; i++) {
        if (eliminateMode && pool.length === 1 && newlyRemoved.length >= options.length - 1) {
          if (i === 0 || options.length > 1) {
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
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const finishPick = () => {
        setIsPicking(false);

        if (totalRuns > 1) {
          setDisplayPick(winnerInfo.displayLabel);
          setBatchRuns(preResults);
          preResults.forEach((res) => onRecord(res, `${options.length} options`));
        } else {
          const singleWinner = preResults[0];
          setDisplayPick(singleWinner);
          onRecord(singleWinner, `${options.length} options`);
        }

        if (newlyRemoved.length > 0) {
          setRemovedItems((prev) => [...prev, ...newlyRemoved]);
          setRawText(pool.join('\n'));
        }

        playSound('win', soundRef.current);
        launchConfetti();
      };

      if (reducedMotion || options.length === 1) {
        finishPick();
        return;
      }

      let ticks = 0;
      const totalTicks = 14;
      timerRef.current = window.setInterval(() => {
        ticks++;
        const preview = options[Math.floor(Math.random() * options.length)];
        setDisplayPick(preview);
        playSound('tick', soundRef.current, ticks * 0.03);

        if (ticks >= totalTicks) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          finishPick();
        }
      }, 65);
    }, [isPicking, options, mode, teamCount, repeatCount, t.teamLabel, onRecord, eliminateMode]);

    useImperativeHandle(ref, () => ({ trigger: execute }), [execute]);

    const handleRestore = () => {
      if (removedItems.length === 0) return;
      setRawText([...options, ...removedItems].join('\n'));
      setRemovedItems([]);
      playSound('click', soundEnabled);
    };

    const handleShuffleList = () => {
      if (options.length < 2) return;
      const copy = [...options];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setRawText(copy.join('\n'));
      playSound('click', soundEnabled);
    };

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        <div className="tool-stage flex min-h-[340px] sm:min-h-[440px] lg:min-h-[520px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
          <div data-guide="choice-stage" className="flex w-full flex-col items-center">
          {mode === 'single' ? (
            <div className="flex min-h-32 sm:min-h-36 w-full flex-wrap items-center justify-center gap-3 px-2 sm:px-4 text-center">
              {displayPick ? (
                <>
                  <span
                    className={`max-w-full break-words text-3xl font-extrabold tracking-tight transition-transform sm:text-5xl ${
                      isPicking
                        ? 'scale-95 text-slate-400 dark:text-slate-500'
                        : 'scale-100 dt-text-accent'
                    }`}
                  >
                    {displayPick}
                  </span>
                  {!isPicking && (
                    <CopyResultButton text={displayPick} soundEnabled={soundEnabled} t={t} />
                  )}
                </>
              ) : (
                <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  {options.length} {t.optionsList.split(' ')[0].toLowerCase()}
                </span>
              )}
            </div>
          ) : (
            <div className="flex w-full max-w-2xl flex-col items-center gap-4">
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                {teams ? (
                  teams.map((members, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <div className="mb-2 flex items-center justify-between text-xs font-bold dt-text-accent">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {t.teamLabel} {idx + 1}
                        </span>
                        <span className="font-mono tabular-nums text-slate-400">{members.length}</span>
                      </div>
                      <ul className="flex flex-col gap-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                        {members.map((m, mIdx) => (
                          <li key={mIdx} className="truncate">
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                    {options.length} → {teamCount} {t.teamCount.toLowerCase()}
                  </div>
                )}
              </div>
              {teams && (
                <CopyResultButton
                  text={teams
                    .map((members, idx) => `${t.teamLabel} ${idx + 1}: ${members.join(', ')}`)
                    .join('\n')}
                  soundEnabled={soundEnabled}
                  t={t}
                />
              )}
            </div>
          )}
          </div>

          <button
            type="button"
            data-guide="choice-action"
            disabled={isPicking || options.length === 0}
            onClick={execute}
            className="mt-8 inline-flex min-h-11 w-full sm:w-auto sm:min-w-48 items-center justify-center gap-2 rounded-xl dt-btn-primary px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {mode === 'teams'
              ? t.teamSplitMode
              : repeatCount > 1
              ? `${t.pickRandom} (${repeatCount}×)`
              : t.pickRandom}
          </button>

          {mode === 'single' && (
            <BatchStatsCard
              runs={batchRuns}
              onDismiss={() => setBatchRuns([])}
              soundEnabled={soundEnabled}
              t={t}
            />
          )}
        </div>

        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <SavedPresetsBar
            tool="choice"
            currentText={rawText}
            presets={presets}
            soundEnabled={soundEnabled}
            onSavePreset={onSavePreset}
            onLoadPreset={(loaded) => {
              setRawText(loaded);
              setRemovedItems([]);
            }}
            onDeletePreset={onDeletePreset}
            t={t}
          />
          <div data-guide="choice-mode" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.passwordMode}</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setMode('single');
                  playSound('click', soundEnabled);
                }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'single'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.singlePickMode}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('teams');
                  playSound('click', soundEnabled);
                }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'teams'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.teamSplitMode}
              </button>
            </div>
          </div>

          {mode === 'teams' && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.teamCount}</span>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
                {[2, 3, 4].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setTeamCount(cnt);
                      playSound('click', soundEnabled);
                    }}
                    className={`rounded-lg py-1.5 font-mono text-xs font-bold transition-colors ${
                      teamCount === cnt
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div data-guide="choice-options" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="choice-options" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.optionsList}
              </label>
              <button
                type="button"
                onClick={handleShuffleList}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>{t.shuffle}</span>
              </button>
            </div>
            <textarea
              id="choice-options"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
            />
          </div>

          {mode === 'single' && (
            <RepeatCountControl
              value={repeatCount}
              onChange={setRepeatCount}
              disabled={isPicking}
              soundEnabled={soundEnabled}
              t={t}
            />
          )}

          {mode === 'single' && (
            <div data-guide="choice-eliminate" className="flex flex-col gap-2">
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
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>
                    {t.restoreRemoved} ({removedItems.length} {t.removedCount})
                  </span>
                </button>
              )}
            </div>
          )}

          <HistoryPanel entries={history} onClear={onClearHistory} t={t} />
        </div>
      </div>
    );
  }
);

ChoiceTool.displayName = 'ChoiceTool';
