"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import type { EnterDirection } from "./landing-sections";

export const SECTION_VIEWPORT_HEIGHT = 1.55;

const SCROLL_DRIFT_PX = 148;

const SCROLL_DRIFT_START = 0.04;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

export function computeSectionVisibility(
  rect: DOMRect,
  viewportHeight: number,
): number {
  const vh = viewportHeight;

  const enterStart = vh * 0.92;
  const enterEnd = vh * 0.12;
  const exitStart = vh * 0.98;
  const exitEnd = vh * 0.22;

  let enter = 1;
  if (rect.top > enterEnd) {
    enter = smoothstep(1 - (rect.top - enterEnd) / (enterStart - enterEnd));
  }

  let exit = 1;
  if (rect.bottom < exitStart) {
    exit = smoothstep((rect.bottom - exitEnd) / (exitStart - exitEnd));
  }

  return clamp(enter * exit);
}

export function computeSectionScrollProgress(
  rect: DOMRect,
  viewportHeight: number,
  sectionHeight: number,
): number {
  const scrollable = sectionHeight - viewportHeight;
  if (scrollable <= 0) return 0;
  return clamp(-rect.top / scrollable);
}

export interface SectionScrollState {
  visibility: number;
  progress: number;
}

export function subscribeScroll(update: () => void) {
  let raf = 0;

  const onScrollOrResize = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  };

  update();
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize, { passive: true });

  return () => {
    if (raf) window.cancelAnimationFrame(raf);
    window.removeEventListener("scroll", onScrollOrResize);
    window.removeEventListener("resize", onScrollOrResize);
  };
}

export function useSectionScrollState(
  sectionRef: RefObject<HTMLElement | null>,
): SectionScrollState {
  const [state, setState] = useState<SectionScrollState>({
    visibility: 0,
    progress: 0,
  });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    return subscribeScroll(() => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      setState({
        visibility: computeSectionVisibility(rect, vh),
        progress: computeSectionScrollProgress(rect, vh, el.offsetHeight),
      });
    });
  }, [sectionRef]);

  return state;
}

export function useSectionVisibility(
  sectionRef: RefObject<HTMLElement | null>,
) {
  return useSectionScrollState(sectionRef).visibility;
}

function scrollDrift(
  progress: number,
  from: EnterDirection,
  motionStrength: number,
): { x: number; y: number; scale: number } {
  const t = smoothstep(progress);
  const px = t * SCROLL_DRIFT_PX * motionStrength;
  const scale = 1 + t * 0.025 * motionStrength;

  switch (from) {
    case "left":
      return { x: px, y: px * 0.22, scale };
    case "right":
      return { x: -px, y: px * 0.22, scale };
    case "bottom":
      return { x: px * 0.12, y: -px, scale };
    default:
      return { x: px * 0.12, y: -px, scale };
  }
}

function exitOffset(visibility: number, from: EnterDirection): { x: number; y: number } {
  if (visibility >= 0.88) return { x: 0, y: 0 };

  const blend = 1 - visibility / 0.88;
  const px = blend * 32;

  switch (from) {
    case "left":
      return { x: -px, y: -px * 0.2 };
    case "right":
      return { x: px, y: -px * 0.2 };
    case "bottom":
      return { x: 0, y: px };
    default:
      return { x: 0, y: -px };
  }
}

export function sectionFadeStyle(visibility: number, delay = 0): CSSProperties {
  const stagger = delay * 0.045;
  const eased = clamp(visibility - stagger);

  return {
    opacity: eased,
    filter: eased < 0.96 ? `blur(${(1 - eased) * 1.2}px)` : "none",
    transition: "none",
    willChange: "opacity",
  };
}

export function sectionRevealStyle(
  visibility: number,
  scrollProgress: number,
  delay = 0,
  from: EnterDirection = "top",
): CSSProperties {
  const isExiting = visibility < 0.88;
  const stagger = isExiting ? 0 : delay * 0.045;
  const eased = clamp(visibility - stagger);

  const driftBase = Math.max(0, scrollProgress - SCROLL_DRIFT_START);
  const lagRamp = smoothstep(clamp(driftBase / 0.14));
  const laggedProgress = clamp(driftBase - delay * 0.1 * lagRamp);

  const motionStrength = smoothstep(Math.min(1, eased * 1.35));
  const scroll = scrollDrift(laggedProgress, from, motionStrength);
  const exit = exitOffset(visibility, from);

  const x = scroll.x + exit.x;
  const y = scroll.y + exit.y;

  return {
    opacity: eased,
    transform: `translate3d(${x}px, ${y}px, 0) scale(${scroll.scale})`,
    filter: eased < 0.96 ? `blur(${(1 - eased) * 1.2}px)` : "none",
    transition: "none",
    willChange: "opacity, transform",
  };
}
