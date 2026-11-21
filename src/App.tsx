import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  Compass,
  CupSoda,
  Dices,
  Disc,
  Droplet,
  Hash,
  Heart,
  HelpCircle,
  KeyRound,
  Layers,
  LayoutGrid,
  ListChecks,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  Settings,
  SlidersHorizontal,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AppSettings, GameToolId, HistoryMap, SavedPreset, ToolId } from './types';
import { i18n } from './i18n/translations';
import { playSound, setMasterVolume, setSoundTheme } from './utils/sound';
import { SettingsModal } from './components/SettingsModal';
import { GuideOverlay } from './components/GuideOverlay';
import { AllHistoryView } from './components/AllHistoryView';
import { decodeShareHash } from './components/SavedPresetsBar';
import { WheelTool, ToolActionHandle } from './components/tools/WheelTool';
import { RouletteTool } from './components/tools/RouletteTool';
import { BottleTool } from './components/tools/BottleTool';
import { CardsTool } from './components/tools/CardsTool';
import { DiceTool } from './components/tools/DiceTool';
import { CoinTool } from './components/tools/CoinTool';
import { ShellTool } from './components/tools/ShellTool';
import { NumberTool } from './components/tools/NumberTool';
import { ChoiceTool } from './components/tools/ChoiceTool';
import { PasswordTool } from './components/tools/PasswordTool';
import { ColorTool } from './components/tools/ColorTool';

const STORAGE_SETTINGS_KEY = 'dt_settings_v2';
const STORAGE_HISTORY_KEY = 'dt_history_v2';
const STORAGE_PRESETS_KEY = 'dt_presets_v1';
const STORAGE_FAVORITES_KEY = 'dt_favorites_v1';
const STORAGE_GUIDE_SEEN_KEY = 'dt_guide_seen_v1';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  lang: 'en',
  sound: true,
  volume: 80,
  soundTheme: 'classic',
  accent: 'cobalt',
  shortcut: 'Space',
};

const TOOL_META: {
  id: GameToolId;
  icon: typeof Disc;
}[] = [
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

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SETTINGS;
  });

  const [history, setHistory] = useState<HistoryMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return {};
  });

  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PRESETS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [activeTool, setActiveTool] = useState<ToolId>(() => {
    const shared = typeof window !== 'undefined' ? decodeShareHash(window.location.hash) : null;
    return shared ? shared.tool : 'dashboard';
  });
  const [sharedItems, setSharedItems] = useState<{
    tool: 'wheel' | 'roulette' | 'choice' | 'bottle' | 'cards';
    items: string;
  } | null>(() => (typeof window !== 'undefined' ? decodeShareHash(window.location.hash) : null));

  const [favorites, setFavorites] = useState<GameToolId[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FAVORITES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [guideOpen, setGuideOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(STORAGE_GUIDE_SEEN_KEY);
    } catch {
      return false;
    }
  });

  const [stageMode, setStageMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toolRefs = useRef<Partial<Record<GameToolId, ToolActionHandle | null>>>({});
  const setToolRef = useCallback(
    (id: GameToolId) => (el: ToolActionHandle | null) => {
      toolRefs.current[id] = el;
    },
    []
  );
  const t = i18n[settings.lang];

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.lang = settings.lang;
    root.setAttribute('data-accent', settings.accent || 'cobalt');
    setMasterVolume(typeof settings.volume === 'number' ? settings.volume : 80);
    setSoundTheme(settings.soundTheme || 'classic');

    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore storage errors
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(savedPresets));
    } catch {
      // ignore storage errors
    }
  }, [savedPresets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // ignore storage errors
    }
  }, [favorites]);

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    try {
      localStorage.setItem(STORAGE_GUIDE_SEEN_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleGuide = useCallback(() => {
    setGuideOpen((prev) => {
      const next = !prev;
      if (!next) {
        try {
          localStorage.setItem(STORAGE_GUIDE_SEEN_KEY, '1');
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
    playSound('click', settings.sound);
  }, [settings.sound]);

  const toggleFavorite = useCallback(
    (toolId: GameToolId) => {
      setFavorites((prev) =>
        prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
      );
      playSound('click', settings.sound);
    },
    [settings.sound]
  );

  useEffect(() => {
    const onHashChange = () => {
      const decoded = decodeShareHash(window.location.hash);
      if (decoded) {
        setSharedItems(decoded);
        setActiveTool(decoded.tool);
        setStageMode(false);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSavePreset = useCallback(
    (tool: 'wheel' | 'roulette' | 'choice' | 'bottle' | 'cards', name: string, items: string) => {
      const next: SavedPreset = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        tool,
        name,
        items,
      };
      setSavedPresets((prev) => [next, ...prev].slice(0, 30));
    },
    []
  );

  const handleDeletePreset = useCallback((id: string) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const recordHistory = useCallback(
    (toolId: GameToolId, text: string, detail?: string) => {
      const now = Date.now();
      const entry = {
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        detail,
        time: new Date(now).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        createdAt: now,
      };
      setHistory((prev) => {
        const current = prev[toolId] || [];
        return {
          ...prev,
          [toolId]: [entry, ...current].slice(0, 30),
        };
      });
    },
    []
  );

  const clearToolHistory = useCallback(
    (toolId: GameToolId) => {
      setHistory((prev) => ({ ...prev, [toolId]: [] }));
      playSound('click', settings.sound);
    },
    [settings.sound]
  );

  const clearAllHistory = useCallback(() => {
    setHistory({});
    playSound('click', settings.sound);
  }, [settings.sound]);

  const switchTool = (tool: ToolId) => {
    setActiveTool(tool);
    setStageMode(false);
    setMobileMenuOpen(false);
    playSound('click', settings.sound);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stageMode) {
        e.preventDefault();
        setStageMode(false);
        playSound('click', settings.sound);
        return;
      }

      if (settingsOpen || guideOpen || activeTool === 'dashboard' || activeTool === 'history') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const pressed = e.key === ' ' ? 'Space' : e.key;
      if (pressed.toLowerCase() === settings.shortcut.toLowerCase()) {
        e.preventDefault();
        toolRefs.current[activeTool]?.trigger();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen, guideOpen, activeTool, settings.shortcut, stageMode, settings.sound]);

  const totalDecisions = Object.values(history).reduce(
    (sum, list) => sum + (list ? list.length : 0),
    0
  );

  const headerTitle =
    activeTool === 'history'
      ? t.historyView
      : activeTool === 'dashboard'
      ? t.dashboard
      : t[activeTool];

  const isGameTool = activeTool !== 'dashboard' && activeTool !== 'history';

  const orderedTools = [
    ...TOOL_META.filter((item) => favorites.includes(item.id)),
    ...TOOL_META.filter((item) => !favorites.includes(item.id)),
  ];

  return (
    <div
      data-stage-mode={stageMode && isGameTool ? 'true' : 'false'}
      className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#0B0F17] dark:text-slate-100"
    >
      {mobileMenuOpen && !stageMode && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!stageMode && (
        <aside
          className={`fixed top-0 left-0 z-40 flex h-dvh w-68 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out dark:border-slate-800 dark:bg-[#111622] ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } ${sidebarCollapsed ? 'md:-translate-x-full' : 'md:translate-x-0'}`}
        >
          <div className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-5 dark:border-slate-800">
            <button
              type="button"
              onClick={() => switchTool('dashboard')}
              className="flex min-w-0 items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <svg width="28" height="28" viewBox="0 0 32 32" className="shrink-0">
                <circle cx="16" cy="16" r="14" style={{ fill: 'var(--dt-accent)' }} />
                <path d="M16 2v14h14A14 14 0 0 0 16 2z" fill="#ffffff" opacity="0.85" />
                <path d="M16 30V16H2a14 14 0 0 0 14 14z" fill="#0f172a" opacity="0.35" />
                <circle cx="16" cy="16" r="4" fill="#ffffff" />
              </svg>
              <span className="text-lg font-extrabold tracking-tight whitespace-nowrap">
                <span className="text-slate-900 dark:text-white">Decider</span>
                <span className="dt-text-accent">Tools</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileMenuOpen(false);
                } else {
                  setSidebarCollapsed(true);
                }
                playSound('click', settings.sound);
              }}
              aria-label="Collapse sidebar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <nav data-guide="sidebar-nav" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
            <button
              type="button"
              onClick={() => switchTool('dashboard')}
              className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTool === 'dashboard'
                  ? 'dt-btn-primary shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
              }`}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.dashboard}</span>
            </button>

            <button
              type="button"
              onClick={() => switchTool('history')}
              className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTool === 'history'
                  ? 'dt-btn-primary shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3 truncate">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="truncate">{t.historyView}</span>
              </span>
              {totalDecisions > 0 && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    activeTool === 'history' ? 'text-white/90' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {totalDecisions}
                </span>
              )}
            </button>

            <div className="my-2 border-t border-slate-200 dark:border-slate-800" />

            {orderedTools.map((item) => {
              const Icon = item.icon;
              const isActive = activeTool === item.id;
              const isFav = favorites.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchTool(item.id)}
                  className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'dt-btn-primary shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t[item.id]}</span>
                  </span>
                  {isFav && (
                    <Heart
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive ? 'fill-white text-white' : 'fill-red-500 text-red-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 border-t border-slate-200 p-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
                playSound('click', settings.sound);
              }}
              title={settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200"
            >
              {settings.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const nextSound = !settings.sound;
                updateSettings({ sound: nextSound });
                if (nextSound) playSound('click', true);
              }}
              title={t.soundEffects}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                settings.sound
                  ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200'
                  : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
              }`}
            >
              {settings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                toggleGuide();
                setMobileMenuOpen(false);
              }}
              title={guideOpen ? t.exitGuide : t.guideTitle}
              aria-label={guideOpen ? t.exitGuide : t.guideTitle}
              aria-pressed={guideOpen}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                guideOpen
                  ? 'dt-btn-primary border-transparent shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                playSound('click', settings.sound);
              }}
              title={t.settingsTitle}
              className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.settingsTitle}</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-200 ease-out ${
          stageMode || sidebarCollapsed ? 'md:ml-0' : 'md:ml-68'
        }`}
      >
        {!stageMode && (
          <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 border-b border-slate-200 bg-white/90 px-3 backdrop-blur-md sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-[#111622]/90">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setMobileMenuOpen((prev) => !prev);
                  } else {
                    setSidebarCollapsed((prev) => !prev);
                  }
                  playSound('click', settings.sound);
                }}
                aria-label="Toggle navigation"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
              >
                <Menu className="h-4 w-4" />
              </button>
              <h1 className="truncate text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {headerTitle}
              </h1>
            </div>

            <div
              data-guide="topbar-actions"
              className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              {isGameTool ? (
                <span className="hidden items-center gap-1.5 lg:inline-flex mr-1">
                  <span>{t.shortcutKey}:</span>
                  <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {settings.shortcut}
                  </kbd>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => switchTool('history')}
                  className="hidden sm:inline-flex items-center gap-1.5 mr-1 font-mono tabular-nums transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {totalDecisions} {t.totalActions}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const nextSound = !settings.sound;
                  updateSettings({ sound: nextSound });
                  if (nextSound) playSound('click', true);
                }}
                title={t.soundEffects}
                aria-label={t.soundEffects}
                className={`flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-colors ${
                  settings.sound
                    ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200'
                    : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                }`}
              >
                {settings.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
                  playSound('click', settings.sound);
                }}
                title={settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                aria-label={settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
              >
                {settings.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                type="button"
                data-guide="guide-toggle"
                onClick={toggleGuide}
                title={guideOpen ? t.exitGuide : t.guideTitle}
                aria-label={guideOpen ? t.exitGuide : t.guideTitle}
                aria-pressed={guideOpen}
                className={`relative z-50 flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-colors ${
                  guideOpen
                    ? 'dt-btn-primary border-transparent shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200'
                }`}
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(true);
                  playSound('click', settings.sound);
                }}
                title={t.settingsTitle}
                aria-label={t.settingsTitle}
                className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </header>
        )}

        <main
          className={`mx-auto w-full flex-1 ${
            stageMode && isGameTool ? 'max-w-7xl p-3 sm:p-6' : 'max-w-6xl p-3.5 sm:p-6 lg:p-8'
          }`}
        >
          {activeTool === 'dashboard' ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {t.dashboardSubtitle}
                </p>
                <button
                  type="button"
                  data-guide="dashboard-history"
                  onClick={() => switchTool('history')}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-white"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t.historyView}</span>
                  <span className="font-mono tabular-nums text-slate-400">({totalDecisions})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {orderedTools.map((tool, cardIdx) => {
                  const Icon = tool.icon;
                  const count = history[tool.id]?.length || 0;
                  const isFav = favorites.includes(tool.id);
                  return (
                    <div
                      key={tool.id}
                      data-guide={`dashboard-card-${tool.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => switchTool(tool.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          switchTool(tool.id);
                        }
                      }}
                      className="group relative flex cursor-pointer flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-left transition-all duration-200 sm:hover:-translate-y-1 hover:border-slate-400 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="dt-group-hover-accent flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dt-text-accent transition-colors dark:bg-slate-800">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1">
                          {count > 0 && (
                            <span className="mr-0.5 font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                              {count}
                            </span>
                          )}
                          <button
                            type="button"
                            data-guide={cardIdx === 0 ? 'dashboard-first-fav' : undefined}
                            aria-label={isFav ? t.removeFavorite : t.addFavorite}
                            title={isFav ? t.removeFavorite : t.addFavorite}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(tool.id);
                            }}
                            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                              isFav
                                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40'
                                : 'text-slate-300 hover:bg-slate-100 hover:text-red-400 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-red-400'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                          <ArrowRight className="h-4 w-4 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-700 dark:group-hover:text-slate-400" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {t[tool.id]}
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {t[`${tool.id}Desc` as keyof typeof t]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTool === 'history' ? (
            <div className="flex flex-col gap-5">
              <div>
                <button
                  type="button"
                  onClick={() => switchTool('dashboard')}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{t.backToMenu}</span>
                </button>
              </div>
              <AllHistoryView
                history={history}
                soundEnabled={settings.sound}
                onClearAll={clearAllHistory}
                onClearGame={clearToolHistory}
                onOpenTool={(id) => switchTool(id)}
                t={t}
              />
            </div>
          ) : null}

          <div className={isGameTool ? 'flex flex-col gap-5' : 'hidden'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {stageMode ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                    {headerTitle}
                  </span>
                  <kbd className="hidden rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 sm:inline-block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {settings.shortcut}
                  </kbd>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => switchTool('dashboard')}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{t.backToMenu}</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                {isGameTool && (
                  <button
                    type="button"
                    data-guide="game-fav-btn"
                    onClick={() => toggleFavorite(activeTool)}
                    aria-label={favorites.includes(activeTool) ? t.removeFavorite : t.addFavorite}
                    title={favorites.includes(activeTool) ? t.removeFavorite : t.addFavorite}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                      favorites.includes(activeTool)
                        ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-red-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${
                        favorites.includes(activeTool) ? 'fill-red-500 text-red-500' : ''
                      }`}
                    />
                  </button>
                )}
                <button
                  type="button"
                  data-guide="stage-mode-btn"
                  onClick={() => {
                    setStageMode((prev) => !prev);
                    playSound('click', settings.sound);
                  }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {stageMode ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span>{t.exitStageMode} (Esc)</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>{t.stageMode}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div data-tool-panel="wheel" className={activeTool === 'wheel' ? 'block' : 'hidden'}>
              <WheelTool
                ref={setToolRef('wheel')}
                soundEnabled={settings.sound}
                history={history.wheel || []}
                onRecord={(text, detail) => recordHistory('wheel', text, detail)}
                onClearHistory={() => clearToolHistory('wheel')}
                initialItems={sharedItems?.tool === 'wheel' ? sharedItems.items : undefined}
                presets={savedPresets}
                onSavePreset={(name, items) => handleSavePreset('wheel', name, items)}
                onDeletePreset={handleDeletePreset}
                t={t}
              />
            </div>
            <div data-tool-panel="roulette" className={activeTool === 'roulette' ? 'block' : 'hidden'}>
              <RouletteTool
                ref={setToolRef('roulette')}
                soundEnabled={settings.sound}
                history={history.roulette || []}
                onRecord={(text, detail) => recordHistory('roulette', text, detail)}
                onClearHistory={() => clearToolHistory('roulette')}
                initialItems={sharedItems?.tool === 'roulette' ? sharedItems.items : undefined}
                presets={savedPresets}
                onSavePreset={(name, items) => handleSavePreset('roulette', name, items)}
                onDeletePreset={handleDeletePreset}
                t={t}
              />
            </div>
            <div data-tool-panel="bottle" className={activeTool === 'bottle' ? 'block' : 'hidden'}>
              <BottleTool
                ref={setToolRef('bottle')}
                soundEnabled={settings.sound}
                history={history.bottle || []}
                onRecord={(text, detail) => recordHistory('bottle', text, detail)}
                onClearHistory={() => clearToolHistory('bottle')}
                initialItems={sharedItems?.tool === 'bottle' ? sharedItems.items : undefined}
                presets={savedPresets}
                onSavePreset={(name, items) => handleSavePreset('bottle', name, items)}
                onDeletePreset={handleDeletePreset}
                t={t}
              />
            </div>
            <div data-tool-panel="cards" className={activeTool === 'cards' ? 'block' : 'hidden'}>
              <CardsTool
                ref={setToolRef('cards')}
                soundEnabled={settings.sound}
                history={history.cards || []}
                onRecord={(text, detail) => recordHistory('cards', text, detail)}
                onClearHistory={() => clearToolHistory('cards')}
                initialItems={sharedItems?.tool === 'cards' ? sharedItems.items : undefined}
                presets={savedPresets}
                onSavePreset={(name, items) => handleSavePreset('cards', name, items)}
                onDeletePreset={handleDeletePreset}
                t={t}
              />
            </div>
            <div data-tool-panel="dice" className={activeTool === 'dice' ? 'block' : 'hidden'}>
              <DiceTool
                ref={setToolRef('dice')}
                soundEnabled={settings.sound}
                history={history.dice || []}
                onRecord={(text, detail) => recordHistory('dice', text, detail)}
                onClearHistory={() => clearToolHistory('dice')}
                t={t}
              />
            </div>
            <div data-tool-panel="coin" className={activeTool === 'coin' ? 'block' : 'hidden'}>
              <CoinTool
                ref={setToolRef('coin')}
                soundEnabled={settings.sound}
                history={history.coin || []}
                onRecord={(text, detail) => recordHistory('coin', text, detail)}
                onClearHistory={() => clearToolHistory('coin')}
                t={t}
              />
            </div>
            <div data-tool-panel="shell" className={activeTool === 'shell' ? 'block' : 'hidden'}>
              <ShellTool
                ref={setToolRef('shell')}
                isActive={activeTool === 'shell'}
                theme={settings.theme}
                soundEnabled={settings.sound}
                history={history.shell || []}
                onRecord={(text, detail) => recordHistory('shell', text, detail)}
                onClearHistory={() => clearToolHistory('shell')}
                t={t}
              />
            </div>
            <div data-tool-panel="number" className={activeTool === 'number' ? 'block' : 'hidden'}>
              <NumberTool
                ref={setToolRef('number')}
                soundEnabled={settings.sound}
                history={history.number || []}
                onRecord={(text, detail) => recordHistory('number', text, detail)}
                onClearHistory={() => clearToolHistory('number')}
                t={t}
              />
            </div>
            <div data-tool-panel="choice" className={activeTool === 'choice' ? 'block' : 'hidden'}>
              <ChoiceTool
                ref={setToolRef('choice')}
                soundEnabled={settings.sound}
                history={history.choice || []}
                onRecord={(text, detail) => recordHistory('choice', text, detail)}
                onClearHistory={() => clearToolHistory('choice')}
                initialItems={sharedItems?.tool === 'choice' ? sharedItems.items : undefined}
                presets={savedPresets}
                onSavePreset={(name, items) => handleSavePreset('choice', name, items)}
                onDeletePreset={handleDeletePreset}
                t={t}
              />
            </div>
            <div data-tool-panel="password" className={activeTool === 'password' ? 'block' : 'hidden'}>
              <PasswordTool
                ref={setToolRef('password')}
                soundEnabled={settings.sound}
                history={history.password || []}
                onRecord={(text, detail) => recordHistory('password', text, detail)}
                onClearHistory={() => clearToolHistory('password')}
                t={t}
              />
            </div>
            <div data-tool-panel="color" className={activeTool === 'color' ? 'block' : 'hidden'}>
              <ColorTool
                ref={setToolRef('color')}
                soundEnabled={settings.sound}
                history={history.color || []}
                onRecord={(text, detail) => recordHistory('color', text, detail)}
                onClearHistory={() => clearToolHistory('color')}
                t={t}
              />
            </div>
          </div>
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenGuide={() => setGuideOpen(true)}
        settings={settings}
        onUpdateSettings={updateSettings}
        t={t}
      />

      <GuideOverlay
        open={guideOpen}
        onClose={closeGuide}
        activeTool={activeTool}
        orderedToolIds={orderedTools.map((tool) => tool.id)}
        lang={settings.lang}
        soundEnabled={settings.sound}
        t={t}
      />
    </div>
  );
}
