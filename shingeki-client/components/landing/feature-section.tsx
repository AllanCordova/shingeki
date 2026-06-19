"use client";

import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import {
  FEATURE_ENTER_DIRECTIONS,
  type EnterDirection,
  type LandingSection,
} from "./landing-sections";
import {
  sectionFadeStyle,
  sectionRevealStyle,
  SECTION_VIEWPORT_HEIGHT,
  useSectionScrollState,
} from "./use-section-visibility";

interface FeatureSectionProps {
  section: LandingSection;
  isLast?: boolean;
}

function reveal(
  section: LandingSection,
  visibility: number,
  scrollProgress: number,
  delay = 0,
  direction?: EnterDirection,
) {
  return sectionRevealStyle(
    visibility,
    scrollProgress,
    delay,
    direction ?? section.enterFrom,
  );
}

function featureDirection(index: number): EnterDirection {
  return FEATURE_ENTER_DIRECTIONS[index % FEATURE_ENTER_DIRECTIONS.length] ?? "left";
}

interface LayoutProps {
  section: LandingSection;
  visibility: number;
  scrollProgress: number;
  isLight: boolean;
}

function eyebrowClass(isLight: boolean) {
  return cn(
    "mb-4 text-[11px] font-medium uppercase tracking-[0.28em]",
    isLight ? "text-[#71717a]" : "text-white/45",
  );
}

function titleClass(isLight: boolean, large = false) {
  return cn(
    "font-semibold tracking-tight",
    large
      ? "text-5xl sm:text-6xl lg:text-7xl"
      : "text-4xl sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]",
    isLight ? "text-[#0a0a0a]" : "text-white",
  );
}

function subtitleClass(isLight: boolean) {
  return cn(
    "text-lg leading-relaxed",
    isLight ? "text-[#71717a]" : "text-white/55",
  );
}

function bodyClass(isLight: boolean) {
  return isLight ? "text-[#71717a]" : "text-white/50";
}

function headingSmallClass(isLight: boolean) {
  return isLight ? "text-[#0a0a0a]" : "text-white/90";
}

function cardClass(isLight: boolean) {
  return cn(
    "landing-card rounded-xl border p-6",
    isLight
      ? "border-black/[0.08] bg-black/[0.02]"
      : "border-white/[0.08] bg-white/[0.03]",
  );
}

export function FeatureSection({ section, isLast = false }: FeatureSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { visibility, progress } = useSectionScrollState(sectionRef);
  const isLight = section.navTheme === "light";

  const layoutProps: LayoutProps = {
    section,
    visibility,
    scrollProgress: progress,
    isLight,
  };

  return (
    <section
      ref={sectionRef}
      id={section.id}
      data-section-id={section.id}
      className={cn("relative", isLight && "landing-section--light")}
      style={{ minHeight: `${SECTION_VIEWPORT_HEIGHT * 100}vh` }}
    >
      <div
        className={cn(
          "sticky top-0 flex h-screen items-center overflow-hidden",
          isLight && "text-[#0a0a0a]",
        )}
      >
        <div className="relative z-10 mx-auto w-full max-w-[1680px] px-6 pb-24 sm:px-10 lg:px-12 lg:pb-0 lg:pl-[15rem]">
          {section.layout === "hero" && <HeroLayout {...layoutProps} />}
          {section.layout === "split-left" && (
            <SplitLayout {...layoutProps} reverse={false} />
          )}
          {section.layout === "split-right" && <SplitLayout {...layoutProps} reverse />}
          {section.layout === "centered" && <CenteredLayout {...layoutProps} />}
          {section.layout === "bento" && <BentoLayout {...layoutProps} />}
          {section.layout === "timeline" && <TimelineLayout {...layoutProps} />}
          {section.layout === "cta" && (
            <CtaLayout {...layoutProps} isLast={isLast} />
          )}
        </div>
      </div>
    </section>
  );
}

function HeroLayout({ section, visibility, scrollProgress, isLight }: LayoutProps) {
  const words = section.title.split(" ");
  const mid = Math.ceil(words.length / 2);

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center text-center">
      <div className="max-w-3xl px-4" style={reveal(section, visibility, scrollProgress, 0)}>
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h1 className={titleClass(isLight, true)}>
          <span className="block">{words.slice(0, mid).join(" ")}</span>
          <span
            className={cn(
              "landing-serif mt-2 block text-4xl font-normal italic sm:text-5xl lg:text-6xl",
              isLight ? "text-[#0a0a0a]" : "text-white",
            )}
          >
            {words.slice(mid).join(" ")}
          </span>
        </h1>
        <p className={cn("mx-auto mt-8 max-w-xl", subtitleClass(isLight))}>{section.subtitle}</p>
      </div>

      <div
        className="mt-12 flex flex-wrap justify-center gap-2"
        style={reveal(section, visibility, scrollProgress, 0.1, "left")}
      >
        {section.features.map((feature, i) => (
          <span
            key={feature.title}
            style={reveal(
              section,
              visibility,
              scrollProgress,
              0.06 + i * 0.04,
              featureDirection(i),
            )}
            className={cn(
              "rounded-full border px-4 py-2 text-sm",
              isLight
                ? "border-black/[0.08] text-[#71717a]"
                : "border-white/[0.1] text-white/60",
            )}
          >
            {feature.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function SplitLayout({
  section,
  visibility,
  scrollProgress,
  isLight,
  reverse,
}: LayoutProps & { reverse: boolean }) {
  const textFrom = section.enterFrom;
  const listFrom: EnterDirection = reverse ? "left" : "right";

  return (
    <div
      className={cn(
        "grid min-h-[calc(100vh-6rem)] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20",
        reverse && "lg:[&>*:first-child]:order-2",
      )}
    >
      <div style={reveal(section, visibility, scrollProgress, 0, textFrom)}>
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight)}>{section.title}</h2>
        <p className={cn("mt-6 max-w-md", subtitleClass(isLight))}>{section.subtitle}</p>
      </div>

      <ul className="space-y-3">
        {section.features.map((feature, i) => (
          <li
            key={feature.title}
            style={reveal(
              section,
              visibility,
              scrollProgress,
              0.05 + i * 0.04,
              featureDirection(i) === textFrom ? listFrom : featureDirection(i),
            )}
            className={cardClass(isLight)}
          >
            <h3 className={cn("text-base font-medium", headingSmallClass(isLight))}>
              {feature.title}
            </h3>
            <p className={cn("mt-2 text-sm leading-relaxed", bodyClass(isLight))}>
              {feature.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CenteredLayout({ section, visibility, scrollProgress, isLight }: LayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center text-center">
      <div className="max-w-3xl" style={reveal(section, visibility, scrollProgress, 0)}>
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight)}>{section.title}</h2>
        <p className={cn("mx-auto mt-6 max-w-xl", subtitleClass(isLight))}>{section.subtitle}</p>
      </div>

      <div className="mt-14 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
        {section.features.map((feature, i) => (
          <div
            key={feature.title}
            style={reveal(
              section,
              visibility,
              scrollProgress,
              0.06 + i * 0.04,
              featureDirection(i),
            )}
            className={cn(cardClass(isLight), "text-left")}
          >
            <h3 className={cn("text-sm font-medium", headingSmallClass(isLight))}>
              {feature.title}
            </h3>
            <p className={cn("mt-1.5 text-xs leading-relaxed", bodyClass(isLight))}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BentoLayout({ section, visibility, scrollProgress, isLight }: LayoutProps) {
  return (
    <div className="min-h-[calc(100vh-6rem)] py-8">
      <div
        style={reveal(section, visibility, scrollProgress, 0)}
        className="mb-10 max-w-2xl"
      >
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight)}>{section.title}</h2>
        <p className={cn("mt-4", subtitleClass(isLight))}>{section.subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {section.features.map((feature, i) => (
          <div
            key={feature.title}
            style={reveal(
              section,
              visibility,
              scrollProgress,
              0.06 + i * 0.04,
              featureDirection(i),
            )}
            className={cn(cardClass(isLight), i === 0 && "sm:col-span-2")}
          >
            <h3 className={cn("text-lg font-medium", headingSmallClass(isLight))}>
              {feature.title}
            </h3>
            <p className={cn("mt-2 max-w-md text-sm leading-relaxed", bodyClass(isLight))}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineLayout({ section, visibility, scrollProgress, isLight }: LayoutProps) {
  return (
    <div className="grid min-h-[calc(100vh-6rem)] grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
      <div style={reveal(section, visibility, scrollProgress, 0)}>
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight)}>{section.title}</h2>
        <p className={cn("mt-6", subtitleClass(isLight))}>{section.subtitle}</p>
      </div>

      <ol className="relative">
        <div
          className={cn(
            "absolute top-2 bottom-2 left-[9px] w-px",
            isLight ? "bg-black/[0.08]" : "bg-white/10",
          )}
        />
        {section.features.map((feature, i) => (
          <li
            key={feature.title}
            style={reveal(
              section,
              visibility,
              scrollProgress,
              0.05 + i * 0.04,
              featureDirection(i),
            )}
            className="relative flex gap-5 pb-8 last:pb-0"
          >
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-mono",
                isLight
                  ? "border-black/15 text-[#71717a]"
                  : "border-white/20 text-white/50",
              )}
            >
              {i + 1}
            </span>
            <div>
              <h3 className={cn("text-base font-medium", headingSmallClass(isLight))}>
                {feature.title}
              </h3>
              <p className={cn("mt-1.5 text-sm leading-relaxed", bodyClass(isLight))}>
                {feature.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CtaLayout({
  section,
  visibility,
  scrollProgress,
  isLight,
  isLast,
}: LayoutProps & { isLast: boolean }) {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center text-center">
      <div
        className="max-w-2xl"
        style={reveal(section, visibility, scrollProgress, 0)}
      >
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight, true)}>{section.title}</h2>
        <p className={cn("mx-auto mt-6 max-w-lg text-xl", subtitleClass(isLight))}>
          {section.subtitle}
        </p>
      </div>

      {isLast && (
        <div
          className="mt-10 flex flex-wrap justify-center gap-3"
          style={sectionFadeStyle(visibility, 0.05)}
        >
          <Link
            href="/registro"
            className="inline-flex h-12 items-center rounded-full bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#262626]"
          >
            Começar gratuitamente
          </Link>
          <a
            href="https://allancordova.github.io/shingeki/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center rounded-full border border-[#e4e4e7] px-8 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#f4f4f5]"
          >
            Ver documentação
          </a>
        </div>
      )}

      <div className="mt-14 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {section.features.map((feature, i) => (
          <div
            key={feature.title}
            style={sectionFadeStyle(visibility, 0.08 + i * 0.04)}
            className={cn(cardClass(true), "text-left")}
          >
            <h3 className="text-sm font-medium text-[#0a0a0a]">{feature.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#71717a]">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
