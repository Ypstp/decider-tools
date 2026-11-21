import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  CircleDollarSign,
  Compass,
  CupSoda,
  Dices,
  Disc,
  Droplet,
  Hash,
  KeyRound,
  Layers,
  ListChecks,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { GameToolId, HistoryEntry, HistoryMap } from '../types';
import { TranslationSet } from '../i18n/translations';
import { playSound } from '../utils/sound';

interface AllHistoryViewProps {
  history: HistoryMap;
  soundEnabled: boolean;
  onClearAll: () => void;
  onClearGame: (toolId: GameToolId) => void;
  onOpenTool: (toolId: GameToolId) => void;
  t: TranslationSet;
}

const TOOL_ORDER: { id: GameToolId; icon: typeof Disc }[] = [
  { id: 'wheel', icon: Disc },
  { id: 'roulette', icon: SlidersHorizontal },
  { id: 'bottle', icon: Compass },
  { id: 'cards', icon: Layers },
  { id: 'dice', icon: Dices },
  { id: 'coin', icon: CircleDollarSign },
  { id: 'shell', icon: CupSoda },
  { id: 'number', icon: Hash },
  { id: 'choice', icon: ListChecks },
  { id: 'password', icon: KeyRound },
  { id: 'color', icon: Droplet },
];

const TOOL_ICON_MAP: Record<GameToolId, typeof Disc> = {
  wheel: Disc,
  roulette: SlidersHorizontal,
  bottle: Compass,
  cards: Layers,
  dice: Dices,
  coin: CircleDollarSign,
  shell: CupSoda,
  number: Hash,
  choice: ListChecks,
  password: KeyRound,
  color: Droplet,
};

interface CombinedEntry extends HistoryEntry {
  toolId: GameToolId;
  orderFallback: number;
}

export function AllHistoryView({
  history,
  soundEnabled,
  onClearAll,
  onClearGame,
  onOpenTool,
  t,
}: AllHistoryViewProps) {
  const [filter, setFilter] = useState<'all' | GameToolId>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const combined: CombinedEntry[] = [];
  TOOL_ORDER.forEach(({ id }) => {
    const entries = history[id] || [];
    entries.forEach((entry, idx) => {
      combined.push({
        ...entry,
        toolId: id,
        orderFallback: idx,
      });
    });
  });

  combined.sort((a, b) => {
    const ta = a.createdAt ?? 0;
    const tb = b.createdAt ?? 0;
    if (ta !== tb) return tb - ta;
    return a.orderFallback - b.orderFallback;
  });

  const filtered = filter === 'all' ? combined : combined.filter((e) => e.toolId === filter);

  // Probability & Streak Insights computed across recorded logs
  const insights = useMemo(() => {
    // 1. Coin flip split
    const coinEntries = history.coin || [];
    const coinMap = new Map<string, number>();
    coinEntries.forEach((e) => {
      const cleanLabel = e.text.replace(/\s*\(\d+[–-]\d+\)$/, '').trim();
      if (!cleanLabel) return;
      coinMap.set(cleanLabel, (coinMap.get(cleanLabel) || 0) + 1);
    });
    const coinSides = Array.from(coinMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    const coinTotal = coinSides.reduce((sum, [, c]) => sum + c, 0);

    // 2. Dice roll frequency distribution
    const diceEntries = history.dice || [];
    const diceMap = new Map<number, number>();
    diceEntries.forEach((e) => {
      const match = e.text.match(/:\s*(-?\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        diceMap.set(val, (diceMap.get(val) || 0) + 1);
      }
    });
    const diceBuckets = Array.from(diceMap.entries()).sort((a, b) => a[0] - b[0]);
    const diceMaxCount = diceBuckets.reduce((m, [, c]) => Math.max(m, c), 1);

    // 3. Most picked winners across Wheel, Roulette, Choice, Bottle, Cards
    const winnerMap = new Map<string, number>();
    (['wheel', 'roulette', 'choice', 'bottle', 'cards'] as GameToolId[]).forEach((id) => {
      (history[id] || []).forEach((e) => {
        if (e.detail && e.detail.includes('teams')) return;
        const name = e.text.trim();
        if (!name) return;
        winnerMap.set(name, (winnerMap.get(name) || 0) + 1);
      });
    });
    const topWinners = Array.from(winnerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const winnerTotal = Array.from(winnerMap.values()).reduce((s, v) => s + v, 0);

    // 4. 3D Cup & Ball accuracy
    const shellEntries = history.shell || [];
    let shellWins = 0;
    let shellTotal = 0;
    shellEntries.forEach((e) => {
      if (e.text.startsWith('Found!')) {
        shellWins++;
        shellTotal++;
      } else if (e.text.startsWith('Missed')) {
        shellTotal++;
      }
    });
    const shellRate = shellTotal > 0 ? Math.round((shellWins / shellTotal) * 100) : 0;

    return {
      coinSides,
      coinTotal,
      diceBuckets,
      diceMaxCount,
      diceTotal: diceEntries.length,
      topWinners,
      winnerTotal,
      shellWins,
      shellTotal,
      shellRate,
    };
  }, [history]);

  const handleCopy = async (entry: CombinedEntry) => {
    try {
      await navigator.clipboard.writeText(entry.text);
      setCopiedId(entry.id);
      playSound('copy', soundEnabled);
      window.setTimeout(() => setCopiedId(null), 1300);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">{t.historyViewDesc}</p>
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (filter === 'all') onClearAll();
              else onClearGame(filter);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{filter === 'all' ? t.clearAllHistory : `${t.clearHistory} (${t[filter]})`}</span>
          </button>
        )}
      </div>

      {/* Probability & Streak Stats */}
      {combined.length > 0 && (
        <section
          data-guide="history-insights"
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            <BarChart3 className="h-4 w-4 dt-text-accent" />
            <span>{t.insightsTitle}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Coin Flip Balance */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>{t.coinSplit}</span>
                <span className="font-mono tabular-nums text-slate-400">{insights.coinTotal}</span>
              </div>
              {insights.coinTotal === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">{t.noHistory}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    {insights.coinSides.map(([label, count], idx) => {
                      const pct = (count / insights.coinTotal) * 100;
                      return (
                        <div
                          key={label}
                          style={{ width: `${pct}%` }}
                          className={idx === 0 ? 'dt-btn-primary' : 'bg-amber-500'}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    {insights.coinSides.map(([label, count], idx) => {
                      const pct = Math.round((count / insights.coinTotal) * 100);
                      return (
                        <span key={label} className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              idx === 0 ? 'dt-btn-primary' : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-sans font-semibold text-slate-700 dark:text-slate-200">
                            {label}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {count} ({pct}%)
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3D Cup & Ball Accuracy */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>{t.shellAccuracy}</span>
                <span className="font-mono tabular-nums text-slate-400">
                  {insights.shellWins}/{insights.shellTotal}
                </span>
              </div>
              {insights.shellTotal === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">{t.noHistory}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-2xl font-extrabold tabular-nums dt-text-accent">
                      {insights.shellRate}%
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t.winRate}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${insights.shellRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dice Roll Distribution */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>{t.diceDistribution}</span>
                <span className="font-mono tabular-nums text-slate-400">{insights.diceTotal}</span>
              </div>
              {insights.diceBuckets.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">{t.noHistory}</p>
              ) : (
                <div className="flex items-end gap-1.5 pt-2" style={{ height: '72px' }}>
                  {insights.diceBuckets.slice(0, 12).map(([val, count]) => {
                    const heightPct = Math.max(16, Math.round((count / insights.diceMaxCount) * 100));
                    return (
                      <div key={val} className="flex flex-1 flex-col items-center justify-end gap-1 h-full">
                        <div
                          className="w-full max-w-6 rounded-t-md dt-btn-primary opacity-90"
                          style={{ height: `${heightPct}%` }}
                          title={`${val}: ${count}`}
                        />
                        <span className="font-mono text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Most Picked Winners */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>{t.topWinners}</span>
                <span className="font-mono tabular-nums text-slate-400">{insights.winnerTotal}</span>
              </div>
              {insights.topWinners.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">{t.noHistory}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {insights.topWinners.map(([name, count]) => {
                    const pct = Math.round((count / Math.max(1, insights.winnerTotal)) * 100);
                    return (
                      <li key={name} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                          {name}
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {count}× ({pct}%)
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Filter Tabs */}
      <div
        data-guide="history-filters"
        className="flex flex-nowrap gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 sm:flex-wrap dark:border-slate-800 dark:bg-slate-900"
      >
        <button
          type="button"
          onClick={() => {
            setFilter('all');
            playSound('click', soundEnabled);
          }}
          className={`inline-flex min-h-10 sm:min-h-8 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'dt-btn-primary'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <span>{t.allGames}</span>
          <span className="font-mono text-[11px] tabular-nums opacity-80">{combined.length}</span>
        </button>

        {TOOL_ORDER.map(({ id, icon: Icon }) => {
          const count = history[id]?.length || 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setFilter(id);
                playSound('click', soundEnabled);
              }}
              className={`inline-flex min-h-10 sm:min-h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === id
                  ? 'dt-btn-primary'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{t[id]}</span>
              {count > 0 && (
                <span className="font-mono text-[11px] tabular-nums opacity-75">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Unified Timeline List */}
      <div
        data-guide="history-list"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            {t.noHistory}
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((entry) => {
              const Icon = TOOL_ICON_MAP[entry.toolId];
              return (
                <li
                  key={`${entry.toolId}-${entry.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 py-3.5 first:pt-1 last:pb-1"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dt-text-accent dark:bg-slate-800">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                        {entry.text}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{t[entry.toolId]}</span>
                        {entry.detail && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate font-mono">{entry.detail}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{entry.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(entry)}
                      title={t.copy}
                      className="inline-flex h-10 sm:h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 sm:px-2.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:text-white"
                    >
                      {copiedId === entry.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedId === entry.id ? t.copied : t.copy}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTool(entry.toolId)}
                      title={t.jumpToTool}
                      className="inline-flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:text-white"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
