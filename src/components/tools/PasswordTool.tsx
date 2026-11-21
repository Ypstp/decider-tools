import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Check, Copy, RefreshCw, ShieldCheck } from 'lucide-react';
import { HistoryEntry } from '../../types';
import { TranslationSet } from '../../i18n/translations';
import { playSound } from '../../utils/sound';
import { HistoryPanel } from '../HistoryPanel';
import { ToolActionHandle } from './WheelTool';

type PasswordMode = 'chars' | 'passphrase';

interface PasswordToolProps {
  soundEnabled: boolean;
  history: HistoryEntry[];
  onRecord: (text: string, detail?: string) => void;
  onClearHistory: () => void;
  t: TranslationSet;
}

const WORD_LIST = [
  'amber', 'anchor', 'apricot', 'atlas', 'autumn', 'bamboo', 'beacon', 'breeze',
  'canyon', 'cedar', 'cinder', 'cobalt', 'compass', 'copper', 'coral', 'crimson',
  'crystal', 'cypress', 'dawn', 'delta', 'dolphin', 'ember', 'emerald', 'falcon',
  'fable', 'fjord', 'forest', 'fossil', 'frost', 'galaxy', 'garden', 'glacier',
  'granite', 'harbor', 'hazel', 'horizon', 'indigo', 'island', 'ivory', 'jasper',
  'juniper', 'kestrel', 'lagoon', 'lantern', 'larch', 'laurel', 'lemon', 'linden',
  'lunar', 'maple', 'marble', 'meadow', 'meteor', 'mirror', 'mist', 'monarch',
  'nebula', 'nectar', 'nimbus', 'north', 'oak', 'obsidian', 'olive', 'onyx',
  'opal', 'orbit', 'orchid', 'osprey', 'otter', 'pacific', 'pebble', 'pelican',
  'pepper', 'phoenix', 'pine', 'planet', 'plover', 'prism', 'quartz', 'quiver',
  'raven', 'redwood', 'ridge', 'ripple', 'river', 'saffron', 'sapphire', 'saturn',
  'scarlet', 'sequoia', 'shadow', 'sierra', 'silver', 'slate', 'solstice', 'sparrow',
  'spruce', 'starlight', 'summit', 'sundial', 'sunset', 'tangerine', 'tempo', 'thistle',
  'thunder', 'timber', 'topaz', 'tundra', 'velvet', 'vermilion', 'voyager', 'walnut',
  'willow', 'winter', 'zephyr', 'zenith',
];

function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  let val = 0;
  do {
    window.crypto.getRandomValues(array);
    val = array[0];
  } while (val >= limit);
  return val % max;
}

export const PasswordTool = forwardRef<ToolActionHandle, PasswordToolProps>(
  ({ soundEnabled, history, onRecord, onClearHistory, t }, ref) => {
    const [mode, setMode] = useState<PasswordMode>('chars');
    const [length, setLength] = useState(16);
    const [wordCount, setWordCount] = useState(4);
    const [useUpper, setUseUpper] = useState(true);
    const [useLower, setUseLower] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);
    const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
    const [password, setPassword] = useState('');
    const [entropyBits, setEntropyBits] = useState(0);
    const [copied, setCopied] = useState(false);

    const generate = useCallback(() => {
      playSound('click', soundEnabled);
      setCopied(false);

      if (mode === 'passphrase') {
        const picked: string[] = [];
        for (let i = 0; i < wordCount; i++) {
          const w = WORD_LIST[secureRandomInt(WORD_LIST.length)];
          picked.push(w.charAt(0).toUpperCase() + w.slice(1));
        }
        const suffixNum = secureRandomInt(90) + 10;
        const result = `${picked.join('-')}-${suffixNum}`;
        const bits = Math.round(wordCount * Math.log2(WORD_LIST.length) + Math.log2(90));
        setPassword(result);
        setEntropyBits(bits);
        onRecord('••••••••' + result.slice(-4), `${wordCount} words · ${bits} bits`);
        return;
      }

      const ambiguous = new Set(['0', 'O', '1', 'l', 'I']);
      const filterStr = (s: string) =>
        excludeAmbiguous ? [...s].filter((c) => !ambiguous.has(c)).join('') : s;

      const pools: string[] = [];
      if (useUpper) pools.push(filterStr('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
      if (useLower) pools.push(filterStr('abcdefghijklmnopqrstuvwxyz'));
      if (useNumbers) pools.push(filterStr('0123456789'));
      if (useSymbols) pools.push('!@#$%^&*()-_=+[]{};:,.<>?');

      const activePools = pools.filter((p) => p.length > 0);
      if (activePools.length === 0) {
        activePools.push(filterStr('abcdefghijklmnopqrstuvwxyz'));
      }

      const combined = activePools.join('');
      const chars: string[] = [];

      // Guarantee at least 1 character from each selected character class
      for (const pool of activePools) {
        if (chars.length < length) {
          chars.push(pool[secureRandomInt(pool.length)]);
        }
      }
      while (chars.length < length) {
        chars.push(combined[secureRandomInt(combined.length)]);
      }

      // Fisher-Yates shuffle with CSPRNG
      for (let i = chars.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }

      const result = chars.join('');
      const bits = Math.round(length * Math.log2(combined.length));
      setPassword(result);
      setEntropyBits(bits);
      onRecord('••••••••' + result.slice(-4), `${length} chars · ${bits} bits`);
    }, [mode, wordCount, length, useUpper, useLower, useNumbers, useSymbols, excludeAmbiguous, soundEnabled, onRecord]);

    useImperativeHandle(ref, () => ({ trigger: generate }), [generate]);

    const copyPassword = async () => {
      if (!password) return;
      try {
        await navigator.clipboard.writeText(password);
        setCopied(true);
        playSound('copy', soundEnabled);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        // Clipboard permission denied fallback ignored
      }
    };

    const strengthInfo =
      entropyBits >= 90
        ? { label: t.veryStrong, color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', pct: 100 }
        : entropyBits >= 64
        ? { label: t.strong, color: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400', pct: 75 }
        : entropyBits >= 42
        ? { label: t.fair, color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', pct: 50 }
        : { label: t.weak, color: 'bg-red-500', text: 'text-red-600 dark:text-red-400', pct: 25 };

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        <div className="tool-stage flex min-h-[340px] sm:min-h-[440px] lg:min-h-[520px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 lg:p-10 dark:border-slate-800 dark:bg-slate-900">
          <div data-guide="password-stage" className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6 text-center dark:border-slate-800 dark:bg-slate-950/60">
            <div className="min-h-14 break-all font-mono text-lg font-bold tracking-wide text-slate-900 select-all sm:text-2xl dark:text-slate-100">
              {password || '—'}
            </div>

            {password && (
              <div className="mt-5 flex flex-col gap-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strengthInfo.color}`}
                    style={{ width: `${strengthInfo.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={`inline-flex items-center gap-1.5 ${strengthInfo.text}`}>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {strengthInfo.label}
                  </span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {entropyBits} bits {t.strength.toLowerCase()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div data-guide="password-actions" className="mt-6 flex w-full sm:w-auto flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={generate}
              className="inline-flex min-h-11 flex-1 sm:flex-none sm:min-w-44 items-center justify-center gap-2 rounded-xl dt-btn-primary px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{t.generate}</span>
            </button>
            <button
              type="button"
              disabled={!password}
              onClick={copyPassword}
              className="inline-flex min-h-11 flex-1 sm:flex-none sm:min-w-36 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? t.copied : t.copy}</span>
            </button>
          </div>
        </div>

        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div data-guide="password-controls" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.passwordMode}</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setMode('chars')}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'chars'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.charactersMode}
              </button>
              <button
                type="button"
                onClick={() => setMode('passphrase')}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'passphrase'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t.passphraseMode}
              </button>
            </div>
          </div>

          {mode === 'chars' ? (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.passwordLength}</span>
                  <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {length}
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(parseInt(e.target.value, 10))}
                  className="dt-accent-control w-full"
                />
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { label: t.uppercase, checked: useUpper, set: setUseUpper },
                  { label: t.lowercase, checked: useLower, set: setUseLower },
                  { label: t.numbers, checked: useNumbers, set: setUseNumbers },
                  { label: t.symbols, checked: useSymbols, set: setUseSymbols },
                  { label: t.excludeAmbiguous, checked: excludeAmbiguous, set: setExcludeAmbiguous },
                ].map((opt) => (
                  <label
                    key={opt.label}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {opt.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.set(e.target.checked)}
                      className="dt-accent-control h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.wordCount}</span>
                <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {wordCount}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={8}
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
                className="dt-accent-control w-full"
              />
            </div>
          )}
          </div>

          <HistoryPanel entries={history} onClear={onClearHistory} t={t} />
        </div>
      </div>
    );
  }
);

PasswordTool.displayName = 'PasswordTool';
