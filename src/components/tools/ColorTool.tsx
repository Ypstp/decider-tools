import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { HistoryEntry } from '../../types';
import { TranslationSet } from '../../i18n/translations';
import { playSound } from '../../utils/sound';
import { HistoryPanel } from '../HistoryPanel';
import { ToolActionHandle } from './WheelTool';

interface ColorToolProps {
  soundEnabled: boolean;
  history: HistoryEntry[];
  onRecord: (text: string, detail?: string) => void;
  onClearHistory: () => void;
  t: TranslationSet;
}

interface ColorInfo {
  r: number;
  g: number;
  b: number;
  hex: string;
  rgb: string;
  hsl: string;
  h: number;
  s: number;
  l: number;
}

function rgbToInfo(r: number, g: number, b: number): ColorInfo {
  const hex =
    '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  const rgb = `rgb(${r}, ${g}, ${b})`;

  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  return {
    r,
    g,
    b,
    hex,
    rgb,
    hsl: `hsl(${hDeg}, ${sPct}%, ${lPct}%)`,
    h: hDeg,
    s: sPct,
    l: lPct,
  };
}

function hslToRgb(hDeg: number, sPct: number, lPct: number): ColorInfo {
  const h = (((hDeg % 360) + 360) % 360) / 360;
  const s = Math.max(0, Math.min(100, sPct)) / 100;
  const l = Math.max(0, Math.min(100, lPct)) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return rgbToInfo(v, v, v);
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return rgbToInfo(r, g, b);
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function contrastRatio(lum1: number, lum2: number): number {
  const bright = Math.max(lum1, lum2);
  const dark = Math.min(lum1, lum2);
  return (bright + 0.05) / (dark + 0.05);
}

export const ColorTool = forwardRef<ToolActionHandle, ColorToolProps>(
  ({ soundEnabled, history, onRecord, onClearHistory, t }, ref) => {
    const [color, setColor] = useState<ColorInfo>(() => rgbToInfo(0, 119, 255));
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const generate = useCallback(() => {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      const next = rgbToInfo(r, g, b);
      setColor(next);
      onRecord(next.hex, next.hsl);
      playSound('win', soundEnabled);
    }, [soundEnabled, onRecord]);

    useImperativeHandle(ref, () => ({ trigger: generate }), [generate]);

    const copyText = async (val: string, label: string) => {
      try {
        await navigator.clipboard.writeText(val);
        setCopiedField(label);
        playSound('copy', soundEnabled);
        window.setTimeout(() => setCopiedField(null), 1400);
      } catch {
        // ignore clipboard denial
      }
    };

    const lum = relativeLuminance(color.r, color.g, color.b);
    const whiteContrast = contrastRatio(lum, 1);
    const darkContrast = contrastRatio(lum, relativeLuminance(15, 23, 42));
    const useDarkInk = darkContrast > whiteContrast;

    const palette = [
      { label: 'Base', info: color },
      { label: 'Comp', info: hslToRgb(color.h + 180, color.s, color.l) },
      { label: 'Analog +30°', info: hslToRgb(color.h + 30, color.s, color.l) },
      { label: 'Tint', info: hslToRgb(color.h, color.s, Math.min(88, color.l + 22)) },
    ];

    return (
      <div className="tool-grid grid grid-cols-1 items-start gap-5 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          {/* Dynamic Contrast Color Stage */}
          <div
            data-guide="color-stage"
            className="flex min-h-[280px] sm:min-h-[380px] flex-col items-center justify-center rounded-2xl border border-slate-200 p-5 sm:p-8 text-center transition-colors duration-300 dark:border-slate-800"
            style={{ backgroundColor: color.hex }}
          >
            <button
              type="button"
              onClick={() => copyText(color.hex, 'stage')}
              className={`font-mono text-3xl font-extrabold tracking-tight transition-transform sm:hover:scale-105 sm:text-5xl ${
                useDarkInk ? 'text-slate-900' : 'text-white'
              }`}
            >
              {copiedField === 'stage' ? t.copied : color.hex}
            </button>
            <p
              className={`mt-2 max-w-full break-words font-mono text-xs font-semibold ${
                useDarkInk ? 'text-slate-800/80' : 'text-white/85'
              }`}
            >
              {color.rgb} · {color.hsl}
            </p>

            <button
              type="button"
              onClick={generate}
              className={`mt-8 inline-flex min-h-11 w-full sm:w-auto sm:min-w-44 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] ${
                useDarkInk
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              <span>{t.generate}</span>
            </button>
          </div>

          {/* Harmonious 4-Swatch Palette */}
          <div data-guide="color-palette" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <span className="mb-3 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.harmonyPalette}
            </span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {palette.map((swatch) => {
                const sLum = relativeLuminance(swatch.info.r, swatch.info.g, swatch.info.b);
                const sDark = contrastRatio(sLum, 0) > contrastRatio(sLum, 1);
                return (
                  <button
                    key={swatch.label}
                    type="button"
                    onClick={() => {
                      setColor(swatch.info);
                      copyText(swatch.info.hex, swatch.label);
                    }}
                    className="group flex h-20 flex-col items-start justify-between rounded-xl border border-slate-200/70 p-3 text-left transition-transform hover:-translate-y-0.5 dark:border-slate-700/70"
                    style={{ backgroundColor: swatch.info.hex }}
                  >
                    <span
                      className={`text-[11px] font-semibold ${
                        sDark ? 'text-slate-900/75' : 'text-white/80'
                      }`}
                    >
                      {swatch.label}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        sDark ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {copiedField === swatch.label ? t.copied : swatch.info.hex}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="tool-sidebar flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div data-guide="color-formats" className="flex flex-col gap-5">
          {/* Copyable Formats */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.colorFormats}</span>
            {[
              { key: 'HEX', val: color.hex },
              { key: 'RGB', val: color.rgb },
              { key: 'HSL', val: color.hsl },
            ].map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => copyText(row.val, row.key)}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left transition-colors hover:border-blue-500 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex min-w-0 flex-1 items-center">
                  <span className="mr-2 shrink-0 text-[11px] font-bold text-slate-400">{row.key}</span>
                  <span className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {row.val}
                  </span>
                </div>
                {copiedField === row.key ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
              </button>
            ))}
          </div>

          {/* WCAG Contrast Readout */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.contrastCheck}</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">vs #FFFFFF</div>
                <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {whiteContrast.toFixed(2)}:1
                </div>
                <div className="mt-0.5 font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {whiteContrast >= 7 ? 'AAA Pass' : whiteContrast >= 4.5 ? 'AA Pass' : 'Low Contrast'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">vs #0F172A</div>
                <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {darkContrast.toFixed(2)}:1
                </div>
                <div className="mt-0.5 font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {darkContrast >= 7 ? 'AAA Pass' : darkContrast >= 4.5 ? 'AA Pass' : 'Low Contrast'}
                </div>
              </div>
            </div>
          </div>
          </div>

          <HistoryPanel entries={history} onClear={onClearHistory} t={t} />
        </div>
      </div>
    );
  }
);

ColorTool.displayName = 'ColorTool';
