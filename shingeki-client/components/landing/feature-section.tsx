"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LandingSection } from "./landing-sections";
import { fadeUp, VIEWPORT_ONCE } from "./motion-presets";

interface FeatureSectionProps {
  section: LandingSection;
  isLast?: boolean;
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

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      variants={fadeUp}
      custom={delay}
    >
      {children}
    </motion.div>
  );
}

export function FeatureSection({ section, isLast = false }: FeatureSectionProps) {
  const isLight = section.navTheme === "light";

  return (
    <section
      id={section.id}
      data-section-id={section.id}
      className={cn(
        "relative scroll-mt-24 py-24 sm:py-28 lg:py-32",
        isLight && "landing-section--light",
      )}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1680px] px-6 sm:px-10 lg:px-12 lg:pl-[15rem]">
        {section.layout === "hero" && (
          <HeroLayout section={section} isLight={isLight} />
        )}
        {section.layout === "split-left" && (
          <SplitLayout section={section} isLight={isLight} reverse={false} />
        )}
        {section.layout === "split-right" && (
          <SplitLayout section={section} isLight={isLight} reverse />
        )}
        {section.layout === "centered" && (
          <CenteredLayout section={section} isLight={isLight} />
        )}
        {section.layout === "bento" && (
          <BentoLayout section={section} isLight={isLight} />
        )}
        {section.layout === "timeline" && (
          <TimelineLayout section={section} isLight={isLight} />
        )}
        {section.layout === "cta" && (
          <CtaLayout section={section} isLight={isLight} isLast={isLast} />
        )}
      </div>
    </section>
  );
}

function HeroLayout({
  section,
  isLight,
}: {
  section: LandingSection;
  isLight: boolean;
}) {
  const words = section.title.split(" ");
  const mid = Math.ceil(words.length / 2);

  return (
    <div className="flex flex-col items-center text-center">
      <Reveal className="max-w-3xl px-4">
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
      </Reveal>

      <div className="mt-12 flex flex-wrap justify-center gap-2">
        {section.features.map((feature, i) => (
          <Reveal key={feature.title} delay={0.08 + i * 0.06}>
            <span
              className={cn(
                "inline-block rounded-full border px-4 py-2 text-sm",
                isLight
                  ? "border-black/[0.08] text-[#71717a]"
                  : "border-white/[0.1] text-white/60",
              )}
            >
              {feature.title}
            </span>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function SplitLayout({
  section,
  isLight,
  reverse,
}: {
  section: LandingSection;
  isLight: boolean;
  reverse: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20",
        reverse && "lg:[&>*:first-child]:order-2",
      )}
    >
      <Reveal>
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight)}>{section.title}</h2>
        <p className={cn("mt-6 max-w-md", subtitleClass(isLight))}>{section.subtitle}</p>
      </Reveal>

      <ul className="space-y-3">
        {section.features.map((feature, i) => (
          <Reveal key={feature.title} delay={0.06 + i * 0.06}>
            <li className={cardClass(isLight)}>
              <h3 className={cn("text-base font-medium", headingSmallClass(isLight))}>
                {feature.title}
              </h3>
              <p className={cn("mt-2 text-sm leading-relaxed", bodyClass(isLight))}>
                {feature.description}
              </p>
            </li>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}

function CenteredLayout({
  section,
  isLight,
}: {
  section: LandingSection;
  isLight: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Reveal className="max-w-3xl">
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight)}>{section.title}</h2>
        <p className={cn("mx-auto mt-6 max-w-xl", subtitleClass(isLight))}>{section.subtitle}</p>
      </Reveal>

      <div className="mt-14 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
        {section.features.map((feature, i) => (
          <Reveal key={feature.title} delay={0.06 + i * 0.06}>
            <div className={cn(cardClass(isLight), "text-left")}>
              <h3 className={cn("text-sm font-medium", headingSmallClass(isLight))}>
                {feature.title}
              </h3>
              <p className={cn("mt-1.5 text-xs leading-relaxed", bodyClass(isLight))}>
                {feature.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function BentoLayout({
  section,
  isLight,
}: {
  section: LandingSection;
  isLight: boolean;
}) {
  return (
    <div>
      <Reveal className="mb-10 max-w-2xl">
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight)}>{section.title}</h2>
        <p className={cn("mt-4", subtitleClass(isLight))}>{section.subtitle}</p>
      </Reveal>

      <div className="grid gap-3 sm:grid-cols-2">
        {section.features.map((feature, i) => (
          <Reveal key={feature.title} delay={0.06 + i * 0.06}>
            <div className={cn(cardClass(isLight), i === 0 && "sm:col-span-2")}>
              <h3 className={cn("text-lg font-medium", headingSmallClass(isLight))}>
                {feature.title}
              </h3>
              <p className={cn("mt-2 max-w-md text-sm leading-relaxed", bodyClass(isLight))}>
                {feature.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function TimelineLayout({
  section,
  isLight,
}: {
  section: LandingSection;
  isLight: boolean;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
      <Reveal>
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight)}>{section.title}</h2>
        <p className={cn("mt-6", subtitleClass(isLight))}>{section.subtitle}</p>
      </Reveal>

      <ol className="relative">
        <div
          className={cn(
            "absolute top-2 bottom-2 left-[9px] w-px",
            isLight ? "bg-black/[0.08]" : "bg-white/10",
          )}
        />
        {section.features.map((feature, i) => (
          <Reveal key={feature.title} delay={0.06 + i * 0.06}>
            <li className="relative flex gap-5 pb-8 last:pb-0">
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
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

function CtaLayout({
  section,
  isLight,
  isLast,
}: {
  section: LandingSection;
  isLight: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Reveal className="max-w-2xl">
        {section.eyebrow && <p className={eyebrowClass(isLight)}>{section.eyebrow}</p>}
        <h2 className={titleClass(isLight, true)}>{section.title}</h2>
        <p className={cn("mx-auto mt-6 max-w-lg text-xl", subtitleClass(isLight))}>
          {section.subtitle}
        </p>
      </Reveal>

      {isLast && (
        <Reveal className="mt-10 flex flex-wrap justify-center gap-3" delay={0.08}>
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
        </Reveal>
      )}

      <div className="mt-14 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {section.features.map((feature, i) => (
          <Reveal key={feature.title} delay={0.1 + i * 0.06}>
            <div className={cn(cardClass(true), "text-left")}>
              <h3 className="text-sm font-medium text-[#0a0a0a]">{feature.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#71717a]">{feature.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
