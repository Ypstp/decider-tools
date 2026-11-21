import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { TranslationSet } from '../i18n/translations';
import { playSound } from '../utils/sound';

interface CopyResultButtonProps {
  text: string;
  soundEnabled: boolean;
  t: TranslationSet;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function CopyResultButton({
  text,
  soundEnabled,
  t,
  label,
  compact = false,
  className = '',
}: CopyResultButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      playSound('copy', soundEnabled);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      title={copied ? t.copied : label || t.copyResult}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'min-h-9 px-3 py-1.5 text-xs'
      } ${className}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="whitespace-nowrap">{copied ? t.copied : label || t.copyResult}</span>
    </button>
  );
}
