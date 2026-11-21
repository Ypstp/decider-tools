import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Eye, HelpCircle, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { HistoryEntry, SavedPreset } from '../../types';
import { TranslationSet } from '../../i18n/translations';
import { playSound } from '../../utils/sound';
import { launchConfetti } from '../../utils/confetti';
import { HistoryPanel } from '../HistoryPanel';
import { SavedPresetsBar } from '../SavedPresetsBar';
import { CopyResultButton } from '../CopyResultButton';
import { ToolActionHandle } from './WheelTool';

interface CardsToolProps {
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

interface MysteryCard {
  id: string;
  label: string;
  flipped: boolean;
  pickedFirst: boolean;
}

const DEFAULT_CARDS = [
  'Pizza Night',
  'Movie Marathon',
  'Bowling',
  'Ice Cream',
  'Board Games',
  'Late Walk',
];

const CARD_PRESETS: { label: string; items: string[] }[] = [
  {
    label: 'Rewards',
    items: ['Coffee Treat', 'Skip a Chore', 'Pick the Movie', 'Extra Break', 'Dessert', 'Wildcard'],
  },
  {
    label: 'Dinner',
    items: ['Pizza', 'Sushi', 'Burgers', 'Tacos', 'Pasta', 'Salad'],
  },
  {
    label: 'Tasks',
    items: ['Task A', 'Task B', 'Task C', 'Task D'],
  },
  {
    label: 'Numbers 1–6',
    items: ['1', '2', '3', '4', '5', '6'],
  },
];

function shuffleArray<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(items: string[], dealIndex: number): MysteryCard[] {
  const shuffled = shuffleArray(items);
  return shuffled.map((label, idx) => ({
    id: `${dealIndex}-${idx}-${label}`,
    label,
    flipped: false,
    pickedFirst: false,
  }));
}

export const CardsTool = forwardRef<ToolActionHandle, CardsToolProps>(
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
    const [rawText, setRawText] = useState(() => initialItems || DEFAULT_CARDS.join('\n'));
    const [dealIndex, setDealIndex] = useState(1);
    const [eliminateMode, setEliminateMode] = useState(false);
    const [removedItems, setRemovedItems] = useState<string[]>([]);
    const [lastPicked, setLastPicked] = useState<string | null>(null);

    const options = useMemo(
      () =>
        rawText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 16),
      [rawText]
    );

    const [deck, setDeck] = useState<MysteryCard[]>(() => buildDeck(DEFAULT_CARDS, 1));

    const dealNewDeck = useCallback((itemsToDeal: string[], nextDealIdx: number) => {
      setDeck(buildDeck(itemsToDeal, nextDealIdx));
      setLastPicked(null);
    }, []);

    useEffect(() => {
      if (initialItems) {
        setRawText(initialItems);
        setRemovedItems([]);
        const parsed = initialItems
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 16);
        const nextIdx = dealIndex + 1;
        setDealIndex(nextIdx);
        dealNewDeck(parsed, nextIdx);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialItems]);

    const handleOptionsChange = (nextText: string) => {
      setRawText(nextText);
      const parsed = nextText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 16);
      const nextIdx = dealIndex + 1;
      setDealIndex(nextIdx);
      dealNewDeck(parsed, nextIdx);
    };

    const handleShuffleReset = useCallback(() => {
      if (options.length === 0) return;
      const nextIdx = dealIndex + 1;
      setDealIndex(nextIdx);
      dealNewDeck(options, nextIdx);
      playSound('click', soundEnabled);
    }, [options, dealIndex, dealNewDeck, soundEnabled]);

    const flipCard = useCallback(
      (cardId: string) => {
        const target = deck.find((c) => c.id === cardId);
        if (!target || target.flipped) return;

        const isFirstRevealThisRound = !deck.some((c) => c.pickedFirst);

        setDeck((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? { ...c, flipped: true, pickedFirst: isFirstRevealThisRound || c.pickedFirst }
              : c
          )
        );
        setLastPicked(target.label);
        playSound('cardFlip', soundEnabled);
        onRecord(target.label, `${deck.length} cards`);

        if (isFirstRevealThisRound) {
          launchConfetti();
        }

        if (eliminateMode && options.length > 1) {
          const removeIdx = options.indexOf(target.label);
          if (removeIdx !== -1) {
            setRemovedItems((prev) => [...prev, target.label]);
            setRawText(options.filter((_, idx) => idx !== removeIdx).join('\n'));
          }
        }
      },
      [deck, soundEnabled, onRecord, eliminateMode, options]
    );

    const handleRevealAll = () => {
      if (deck.every((c) => c.flipped)) return;
      setDeck((prev) => prev.map((c) => ({ ...c, flipped: true })));
      playSound('cardFlip', soundEnabled);
    };

    const handleRestore = () => {
      if (removedItems.length === 0) return;
      const merged = [...options, ...removedItems];
      setRemovedItems([]);
      handleOptionsChange(merged.join('\n'));
      playSound('click', soundEnabled);
    };

    const triggerShortcut = useCallback(() => {
      const unflipped = deck.filter((c) => !c.flipped);
      if (unflipped.length > 0) {
        const randomCard = unflipped[Math.floor(Math.random() * unflipped.length)];
        flipCard(randomCard.id);
      } else {
        handleShuffleReset();
      }
    }, [deck, flipCard, handleShuffleReset]);

    useImperativeHandle(ref, () => ({ trigger: triggerShortcut }), [triggerShortcut]);

    const flippedCount = deck.filter((c) => c.flipped).length;
    const allFlipped = deck.length > 0 && flippedCount === deck.length;

    const gridColsClass =
      deck.length <= 2
        ? 'grid-cols-2 max-w-md'
        : deck.length <= 4
        ? 'grid-cols-2 max-w-lg'
        : deck.length <= 9
        ? 'grid-cols-2 sm:grid-cols-3 max-w-2xl'
        : 'grid-cols-2 sm:grid-cols-4 max-w-3xl';

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        {/* Stage */}
        <div className="tool-stage flex min-h-[380px] sm:min-h-[460px] lg:min-h-[540px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
          {/* Status / Last Revealed */}
          <div className="mb-4 sm:mb-6 flex min-h-12 flex-wrap items-center justify-center gap-3 text-center">
            {lastPicked ? (
              <>
                <div className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight dt-text-accent sm:text-3xl">
                  <Sparkles className="h-6 w-6 shrink-0" />
                  <span>{lastPicked}</span>
                </div>
                <CopyResultButton text={lastPicked} soundEnabled={soundEnabled} t={t} />
              </>
            ) : (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.cardsReadyHint}
              </span>
            )}
          </div>

          {/* Mystery Cards Grid */}
          <div data-guide="cards-stage" className="flex w-full justify-center">
          {deck.length > 0 ? (
            <div className={`grid w-full gap-2.5 sm:gap-4 ${gridColsClass}`}>
              {deck.map((card, idx) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => flipCard(card.id)}
                  aria-label={card.flipped ? card.label : `Card ${idx + 1}`}
                  className="flip-card-scene group h-28 w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:h-36"
                >
                  <div
                    className={`flip-card-inner relative h-full w-full ${
                      card.flipped ? 'is-flipped' : 'sm:group-hover:-translate-y-1'
                    }`}
                  >
                    {/* Front (Face-Down Mystery Side) */}
                    <div className="flip-card-face absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-100 p-3 shadow-sm transition-colors group-hover:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:group-hover:border-blue-500">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl dt-bg-accent-soft dt-text-accent">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Back (Revealed Option Side) */}
                    <div
                      className={`flip-card-face flip-card-back absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center shadow-md ${
                        card.pickedFirst
                          ? 'dt-border-accent bg-white dark:bg-slate-900'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90'
                      }`}
                    >
                      <span
                        className={`line-clamp-3 text-sm font-extrabold break-words sm:text-base ${
                          card.pickedFirst
                            ? 'dt-text-accent'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {card.label}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-sm text-slate-400 dark:text-slate-500">
              {t.optionsList}
            </div>
          )}
          </div>

          {/* Stage Footer Actions */}
          <div data-guide="cards-actions" className="mt-5 sm:mt-7 flex w-full sm:w-auto flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              disabled={options.length === 0}
              onClick={handleShuffleReset}
              className="inline-flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl dt-btn-primary px-5 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shuffle className="h-4 w-4" />
              <span>{t.shuffleCards}</span>
            </button>

            <button
              type="button"
              disabled={deck.length === 0 || allFlipped}
              onClick={handleRevealAll}
              className="inline-flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Eye className="h-4 w-4" />
              <span>{t.revealAll}</span>
            </button>
          </div>

          <div className="mt-3 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {flippedCount} / {deck.length} {t.flippedCountLabel} · {t.pickCardHint}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <SavedPresetsBar
            tool="cards"
            currentText={rawText}
            presets={presets}
            soundEnabled={soundEnabled}
            onSavePreset={onSavePreset}
            onLoadPreset={(items) => {
              setRemovedItems([]);
              handleOptionsChange(items);
            }}
            onDeletePreset={onDeletePreset}
            t={t}
          />

          <div data-guide="cards-presets" className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.presets}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {CARD_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setRemovedItems([]);
                    handleOptionsChange(preset.items.join('\n'));
                    playSound('click', soundEnabled);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div data-guide="cards-options" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="cards-options" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.optionsList}
              </label>
              <button
                type="button"
                disabled={options.length < 2}
                onClick={handleShuffleReset}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>{t.shuffle}</span>
              </button>
            </div>
            <textarea
              id="cards-options"
              value={rawText}
              onChange={(e) => handleOptionsChange(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-base sm:text-sm text-slate-900 transition-colors focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
            />
          </div>

          <div data-guide="cards-eliminate" className="flex flex-col gap-2">
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

CardsTool.displayName = 'CardsTool';
