import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react';
import { GameToolId, LanguageCode, ToolId } from '../types';
import { TranslationSet } from '../i18n/translations';
import { getGuideStepsForContext, GuideStepDef } from '../i18n/guideSteps';
import { playSound } from '../utils/sound';

interface GuideOverlayProps {
  open: boolean;
  onClose: () => void;
  activeTool: ToolId;
  orderedToolIds: GameToolId[];
  lang: LanguageCode;
  soundEnabled: boolean;
  t: TranslationSet;
}

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

type Placement = 'bottom' | 'top' | 'right' | 'left' | 'center';

function findTargetElement(step: GuideStepDef, activeTool: ToolId): HTMLElement | null {
  if (step.scoped && activeTool !== 'dashboard' && activeTool !== 'history') {
    const panel = document.querySelector(`[data-tool-panel="${activeTool}"]`);
    if (panel) {
      const el = panel.querySelector(step.target) as HTMLElement | null;
      if (el) return el;
    }
  }
  return document.querySelector(step.target) as HTMLElement | null;
}

function isElementVisible(el: HTMLElement | null): el is HTMLElement {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  return rect.width > 0 && rect.height > 0 && rect.right > 4 && rect.left < vw - 4;
}

export function GuideOverlay({
  open,
  onClose,
  activeTool,
  orderedToolIds,
  lang,
  soundEnabled,
  t,
}: GuideOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [measuredCardHeight, setMeasuredCardHeight] = useState(205);

  const rawSteps = useMemo(
    () => getGuideStepsForContext(activeTool, orderedToolIds, lang),
    [activeTool, orderedToolIds, lang]
  );

  // Filter to steps whose target is currently rendered and visible
  const [visibleSteps, setVisibleSteps] = useState<GuideStepDef[]>(rawSteps);

  const refreshVisibleSteps = useCallback(() => {
    if (!open) return;
    const filtered = rawSteps.filter((step) => {
      const el = findTargetElement(step, activeTool);
      return isElementVisible(el);
    });
    setVisibleSteps(filtered.length > 0 ? filtered : rawSteps);
  }, [open, rawSteps, activeTool]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    // Wait a tick for panel visibility CSS to settle when switching tools
    const id = window.requestAnimationFrame(() => {
      refreshVisibleSteps();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, activeTool, refreshVisibleSteps]);

  const safeIndex = Math.min(stepIndex, Math.max(0, visibleSteps.length - 1));
  const currentStep = visibleSteps[safeIndex];

  const measureCurrentTarget = useCallback(() => {
    if (!open || !currentStep) {
      setTargetRect(null);
      return;
    }
    const el = findTargetElement(currentStep, activeTool);
    if (!isElementVisible(el)) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, [open, currentStep, activeTool]);

  // Scroll target smoothly into view when changing steps
  useEffect(() => {
    if (!open || !currentStep) return;
    const el = findTargetElement(currentStep, activeTool);
    if (isElementVisible(el)) {
      const vh = window.innerHeight || 800;
      const r = el.getBoundingClientRect();
      el.scrollIntoView({
        behavior: 'smooth',
        block: r.height > vh * 0.55 ? 'start' : 'center',
        inline: 'nearest',
      });
    }

    let rafId = 0;
    const start = performance.now();
    const track = () => {
      measureCurrentTarget();
      if (cardRef.current) {
        const h = cardRef.current.offsetHeight;
        if (h > 0 && Math.abs(h - measuredCardHeight) > 2) {
          setMeasuredCardHeight(h);
        }
      }
      if (performance.now() - start < 450) {
        rafId = window.requestAnimationFrame(track);
      }
    };
    rafId = window.requestAnimationFrame(track);

    return () => window.cancelAnimationFrame(rafId);
  }, [open, currentStep, activeTool, safeIndex, measureCurrentTarget, measuredCardHeight]);

  // Keep rect synced on resize or scroll
  useEffect(() => {
    if (!open) return;
    const onUpdate = () => {
      refreshVisibleSteps();
      measureCurrentTarget();
    };
    window.addEventListener('resize', onUpdate);
    window.addEventListener('scroll', onUpdate, true);
    return () => {
      window.removeEventListener('resize', onUpdate);
      window.removeEventListener('scroll', onUpdate, true);
    };
  }, [open, refreshVisibleSteps, measureCurrentTarget]);

  // Keyboard support inside Guide Mode
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        if (safeIndex < visibleSteps.length - 1) {
          setStepIndex((i) => i + 1);
          playSound('click', soundEnabled);
        } else {
          playSound('win', soundEnabled);
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        if (safeIndex > 0) {
          setStepIndex((i) => i - 1);
          playSound('click', soundEnabled);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [open, safeIndex, visibleSteps.length, soundEnabled, onClose]);

  if (!open || !currentStep) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const cardWidth = Math.min(340, vw - 24);
  const estimatedCardHeight = measuredCardHeight;
  const gap = 16;
  const pad = 12;

  let placement: Placement = 'center';
  let cardTop = Math.max(pad, (vh - estimatedCardHeight) / 2);
  let cardLeft = Math.max(pad, (vw - cardWidth) / 2);

  if (targetRect) {
    const spaceBottom = vh - (targetRect.top + targetRect.height);
    const spaceTop = targetRect.top;
    const spaceRight = vw - (targetRect.left + targetRect.width);
    const spaceLeft = targetRect.left;

    if (spaceBottom >= estimatedCardHeight + gap + pad) {
      placement = 'bottom';
      cardTop = targetRect.top + targetRect.height + gap;
      cardLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (spaceTop >= estimatedCardHeight + gap + pad) {
      placement = 'top';
      cardTop = targetRect.top - estimatedCardHeight - gap;
      cardLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (spaceRight >= cardWidth + gap + pad) {
      placement = 'right';
      cardLeft = targetRect.left + targetRect.width + gap;
      cardTop = targetRect.top + targetRect.height / 2 - estimatedCardHeight / 2;
    } else if (spaceLeft >= cardWidth + gap + pad) {
      placement = 'left';
      cardLeft = targetRect.left - cardWidth - gap;
      cardTop = targetRect.top + targetRect.height / 2 - estimatedCardHeight / 2;
    } else {
      placement = targetRect.top > vh * 0.45 ? 'top' : 'bottom';
      cardTop =
        placement === 'top'
          ? Math.max(pad, targetRect.top - estimatedCardHeight - gap)
          : Math.min(vh - estimatedCardHeight - pad, targetRect.top + targetRect.height + gap);
      cardLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    }

    cardLeft = Math.min(Math.max(pad, cardLeft), vw - cardWidth - pad);
    cardTop = Math.min(Math.max(pad, cardTop), vh - estimatedCardHeight - pad);
  }

  // Compute arrow anchor along card edge pointing directly toward target center
  let arrowX = 0;
  let arrowY = 0;
  if (targetRect) {
    const targetCx = targetRect.left + targetRect.width / 2;
    const targetCy = targetRect.top + targetRect.height / 2;
    arrowX = Math.min(Math.max(24, targetCx - cardLeft), cardWidth - 24);
    arrowY = Math.min(Math.max(24, targetCy - cardTop), estimatedCardHeight - 24);
  }

  const spotlightPad = vw < 420 ? 4 : 6;
  const spotLeft = targetRect ? Math.max(2, targetRect.left - spotlightPad) : 0;
  const spotTop = targetRect ? Math.max(2, targetRect.top - spotlightPad) : 0;
  const spotWidth = targetRect
    ? Math.min(vw - spotLeft - 2, targetRect.width + spotlightPad * 2)
    : 0;
  const spotHeight = targetRect ? targetRect.height + spotlightPad * 2 : 0;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex >= visibleSteps.length - 1;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-45"
      role="dialog"
      aria-modal="false"
      aria-label={t.guideTitle}
    >
      {/* Spotlight Cutout & Glowing Ring */}
      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-2xl transition-all duration-200 ease-out"
          style={{
            top: spotTop,
            left: spotLeft,
            width: spotWidth,
            height: spotHeight,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.62)',
            border: '2.5px solid var(--dt-accent)',
          }}
        />
      ) : (
        <div
          className="pointer-events-none fixed inset-0"
          style={{ backgroundColor: 'rgba(2, 6, 23, 0.62)' }}
        />
      )}

      {/* Explanation Card with Directional Arrow */}
      <div
        ref={cardRef}
        style={{
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          width: `${cardWidth}px`,
        }}
        className="pointer-events-auto fixed z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-all duration-200 ease-out dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Directional SVG Arrow pointing to highlighted target */}
        {targetRect && placement === 'bottom' && (
          <div
            style={{ left: `${arrowX}px` }}
            className="pointer-events-none absolute -top-3.5 -translate-x-1/2"
          >
            <svg width="24" height="14" viewBox="0 0 24 14" aria-hidden="true">
              <path d="M12 0L24 14H0L12 0Z" style={{ fill: 'var(--dt-accent)' }} />
            </svg>
          </div>
        )}
        {targetRect && placement === 'top' && (
          <div
            style={{ left: `${arrowX}px` }}
            className="pointer-events-none absolute -bottom-3.5 -translate-x-1/2"
          >
            <svg width="24" height="14" viewBox="0 0 24 14" aria-hidden="true">
              <path d="M12 14L0 0H24L12 14Z" style={{ fill: 'var(--dt-accent)' }} />
            </svg>
          </div>
        )}
        {targetRect && placement === 'right' && (
          <div
            style={{ top: `${arrowY}px` }}
            className="pointer-events-none absolute -left-3.5 -translate-y-1/2"
          >
            <svg width="14" height="24" viewBox="0 0 14 24" aria-hidden="true">
              <path d="M0 12L14 0V24L0 12Z" style={{ fill: 'var(--dt-accent)' }} />
            </svg>
          </div>
        )}
        {targetRect && placement === 'left' && (
          <div
            style={{ top: `${arrowY}px` }}
            className="pointer-events-none absolute -right-3.5 -translate-y-1/2"
          >
            <svg width="14" height="24" viewBox="0 0 14 24" aria-hidden="true">
              <path d="M14 12L0 24V0L14 12Z" style={{ fill: 'var(--dt-accent)' }} />
            </svg>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold dt-text-accent">
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono tabular-nums">
              {safeIndex + 1} / {visibleSteps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
            aria-label={t.exitGuide}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <span>{t.exitGuide}</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Title & Explanation */}
        <h3 className="mt-2 text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
          {currentStep.title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {currentStep.description}
        </p>

        {/* Step Navigation */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => {
              setStepIndex((i) => Math.max(0, i - 1));
              playSound('click', soundEnabled);
            }}
            className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{t.guidePrev}</span>
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={() => {
                setStepIndex((i) => Math.min(visibleSteps.length - 1, i + 1));
                playSound('click', soundEnabled);
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl dt-btn-primary px-4 py-1.5 text-xs font-semibold shadow-xs transition-colors"
            >
              <span>{t.guideNext}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                playSound('win', soundEnabled);
                onClose();
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl dt-btn-primary px-4 py-1.5 text-xs font-semibold shadow-xs transition-colors"
            >
              <span>{t.guideDone}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
