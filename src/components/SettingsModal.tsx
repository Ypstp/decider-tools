import { useState, useEffect } from 'react';
import {
  X,
  Keyboard,
  Volume2,
  Globe,
  Palette,
  HelpCircle,
  Music,
  Play,
  Disc,
  Circle,
  Gamepad2,
  Leaf,
} from 'lucide-react';
import { AccentColor, AppSettings, LanguageCode, SoundTheme } from '../types';
import { TranslationSet } from '../i18n/translations';
import { playSound, setSoundTheme } from '../utils/sound';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenGuide: () => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  t: TranslationSet;
}

const ACCENTS: { id: AccentColor; swatch: string; labelKey: keyof TranslationSet }[] = [
  { id: 'cobalt', swatch: '#2563eb', labelKey: 'cobalt' },
  { id: 'emerald', swatch: '#059669', labelKey: 'emerald' },
  { id: 'amber', swatch: '#d97706', labelKey: 'amber' },
  { id: 'rose', swatch: '#e11d48', labelKey: 'rose' },
];

const SOUND_THEMES: {
  id: SoundTheme;
  labelKey: keyof TranslationSet;
  icon: typeof Disc;
}[] = [
  { id: 'classic', labelKey: 'soundClassic', icon: Disc },
  { id: 'minimal', labelKey: 'soundMinimal', icon: Circle },
  { id: 'arcade', labelKey: 'soundArcade', icon: Gamepad2 },
  { id: 'nature', labelKey: 'soundNature', icon: Leaf },
];

export function SettingsModal({
  open,
  onClose,
  onOpenGuide,
  settings,
  onUpdateSettings,
  t,
}: SettingsModalProps) {
  const [capturingKey, setCapturingKey] = useState(false);

  useEffect(() => {
    if (!open) setCapturingKey(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (capturingKey) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key !== 'Escape') {
          const formatted = e.key === ' ' ? 'Space' : e.key;
          onUpdateSettings({ shortcut: formatted });
        }
        setCapturingKey(false);
        return;
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, capturingKey, onClose, onUpdateSettings]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="settings-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t.settingsTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
          {/* Language */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Globe className="h-4 w-4 text-slate-400" />
              <label htmlFor="settings-lang">{t.language}</label>
            </div>
            <select
              id="settings-lang"
              value={settings.lang}
              onChange={(e) => onUpdateSettings({ lang: e.target.value as LanguageCode })}
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
            </select>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Volume2 className="h-4 w-4 text-slate-400" />
              <label htmlFor="settings-sound">{t.soundEffects}</label>
            </div>
            <button
              id="settings-sound"
              type="button"
              role="switch"
              aria-checked={settings.sound}
              onClick={() => onUpdateSettings({ sound: !settings.sound })}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                settings.sound ? 'dt-btn-primary' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                  settings.sound ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Master Volume Slider */}
          <div className="flex flex-col gap-2.5 py-4">
            <div className="flex items-center justify-between">
              <label htmlFor="settings-volume" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t.masterVolume}
              </label>
              <span className="font-mono text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
                {settings.volume}%
              </span>
            </div>
            <input
              id="settings-volume"
              type="range"
              min={0}
              max={100}
              value={settings.volume}
              disabled={!settings.sound}
              onChange={(e) => onUpdateSettings({ volume: parseInt(e.target.value, 10) })}
              onMouseUp={() => playSound('click', settings.sound)}
              onTouchEnd={() => playSound('click', settings.sound)}
              className="dt-accent-control w-full disabled:opacity-45"
            />
          </div>

          {/* Sound Theme Selector */}
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                <Music className="h-4 w-4 text-slate-400" />
                <span>{t.soundTheme}</span>
              </div>
              <button
                type="button"
                disabled={!settings.sound}
                onClick={() => {
                  setSoundTheme(settings.soundTheme || 'classic');
                  playSound('win', settings.sound);
                }}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Play className="h-3 w-3" />
                <span>{t.previewSound}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={t.soundTheme}>
              {SOUND_THEMES.map((item) => {
                const active = (settings.soundTheme || 'classic') === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setSoundTheme(item.id);
                      onUpdateSettings({ soundTheme: item.id });
                      playSound('win', settings.sound);
                    }}
                    className={`flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-100 text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'dt-text-accent' : 'text-slate-400'}`} />
                    <span className="truncate text-[11px]">{t[item.labelKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Themes */}
          <div className="flex flex-col gap-3 py-4">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Palette className="h-4 w-4 text-slate-400" />
              <span>{t.accentTheme}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACCENTS.map((item) => {
                const active = settings.accent === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ accent: item.id });
                      playSound('click', settings.sound);
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-100 text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400'
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: item.swatch }}
                    />
                    <span className="truncate text-[11px]">{t[item.labelKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shortcut Key */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                <Keyboard className="h-4 w-4 text-slate-400" />
                <span>{t.shortcutKey}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.shortcutHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setCapturingKey(true)}
              className={`min-h-10 min-w-24 shrink-0 rounded-lg border px-3 py-2 font-mono text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${
                capturingKey
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
              }`}
            >
              {capturingKey ? t.pressAnyKey : settings.shortcut}
            </button>
          </div>

          {/* Quick Guide Replay */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                <HelpCircle className="h-4 w-4 text-slate-400" />
                <span>{t.guideTitle}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.guideReplayHint}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('click', settings.sound);
                onClose();
                onOpenGuide();
              }}
              className="min-h-10 min-w-24 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {t.guideButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
