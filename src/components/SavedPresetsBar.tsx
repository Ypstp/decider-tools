import { useState } from 'react';
import { BookmarkPlus, Check, Share2, X } from 'lucide-react';
import { SavedPreset } from '../types';
import { TranslationSet } from '../i18n/translations';
import { playSound } from '../utils/sound';

interface SavedPresetsBarProps {
  tool: 'wheel' | 'roulette' | 'choice' | 'bottle' | 'cards';
  currentText: string;
  presets: SavedPreset[];
  soundEnabled: boolean;
  onSavePreset: (name: string, items: string) => void;
  onLoadPreset: (items: string) => void;
  onDeletePreset: (id: string) => void;
  t: TranslationSet;
}

export function encodeShareHash(tool: string, items: string): string {
  const payload = JSON.stringify({ tool, items });
  const bytes = new TextEncoder().encode(payload);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return `share=${btoa(bin)}`;
}

export function decodeShareHash(
  hash: string
): { tool: 'wheel' | 'roulette' | 'choice' | 'bottle' | 'cards'; items: string } | null {
  try {
    const clean = hash.startsWith('#') ? hash.slice(1) : hash;
    if (!clean.startsWith('share=')) return null;
    const b64 = clean.slice(6);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (
      parsed &&
      (parsed.tool === 'wheel' ||
        parsed.tool === 'roulette' ||
        parsed.tool === 'choice' ||
        parsed.tool === 'bottle' ||
        parsed.tool === 'cards') &&
      typeof parsed.items === 'string'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function SavedPresetsBar({
  tool,
  currentText,
  presets,
  soundEnabled,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  t,
}: SavedPresetsBarProps) {
  const [nameInput, setNameInput] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const toolPresets = presets.filter((p) => p.tool === tool);

  const handleSave = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !currentText.trim()) return;
    onSavePreset(trimmed, currentText);
    setNameInput('');
    playSound('copy', soundEnabled);
  };

  const handleShare = async () => {
    const hash = encodeShareHash(tool, currentText);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    window.history.replaceState(null, '', `#${hash}`);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      playSound('copy', soundEnabled);
      window.setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
    }
  };

  return (
    <div
      data-guide="saved-presets"
      className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t.savedPresets}
          </span>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
            {t.savedPresetsHint}
          </p>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          {linkCopied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Share2 className="h-3 w-3" />
          )}
          <span>{linkCopied ? t.linkCopied : t.shareLink}</span>
        </button>
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={nameInput}
          maxLength={24}
          placeholder={t.presetNamePlaceholder}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          className="h-10 sm:h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-base sm:text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="button"
          disabled={!nameInput.trim() || !currentText.trim()}
          onClick={handleSave}
          className="inline-flex h-10 sm:h-9 shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-semibold dt-btn-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          <span>{t.savePreset}</span>
        </button>
      </div>

      {toolPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {toolPresets.map((preset) => (
            <div
              key={preset.id}
              className="inline-flex max-w-full items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={() => {
                  onLoadPreset(preset.items);
                  playSound('click', soundEnabled);
                }}
                className="min-h-9 truncate px-2.5 py-1.5 font-semibold text-slate-700 transition-colors hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
              >
                {preset.name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${preset.name}`}
                onClick={() => {
                  onDeletePreset(preset.id);
                  playSound('click', soundEnabled);
                }}
                className="flex min-h-9 min-w-8 items-center justify-center border-l border-slate-200 px-2 py-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
