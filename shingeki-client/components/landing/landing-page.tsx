"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { FeatureSection } from "./feature-section";
import { LandingHeader } from "./landing-header";
import { LANDING_SECTIONS } from "./landing-sections";
import { ScrollBackground } from "./scroll-background";
import { SectionNav } from "./section-nav";
import {
  useActiveSection,
  useSectionBackgroundOpacities,
} from "./use-active-section";

interface LandingPageProps {
  isAuthenticated?: boolean;
}

export function LandingPage({ isAuthenticated = false }: LandingPageProps) {
  const sectionIds = useMemo(
    () => LANDING_SECTIONS.map((section) => section.id),
    [],
  );
  const activeId = useActiveSection(sectionIds);
  const backgroundOpacities = useSectionBackgroundOpacities(sectionIds);

  const activeSection =
    LANDING_SECTIONS.find((section) => section.id === activeId) ??
    LANDING_SECTIONS[0];

  return (
    <div className="landing-page relative min-h-screen">
      <ScrollBackground
        sections={LANDING_SECTIONS}
        opacities={backgroundOpacities}
      />

      <LandingHeader
        navTheme={activeSection.navTheme}
        isAuthenticated={isAuthenticated}
      />

      <SectionNav
        sections={LANDING_SECTIONS}
        activeId={activeId}
        navTheme={activeSection.navTheme}
      />

      <main className="relative z-10">
        {LANDING_SECTIONS.map((section) => (
          <FeatureSection
            key={section.id}
            section={section}
            isLast={section.id === "comecar"}
          />
        ))}
      </main>

      <footer
        className={cn(
          "relative z-10 px-6 py-10 text-center text-xs transition-colors duration-700 sm:px-10 lg:pl-[15rem]",
          activeSection.navTheme === "light"
            ? "text-[#71717a]"
            : "text-white/40",
        )}
      >
        <p>
          Shingeki — detecção automatizada e remediação interativa de
          vulnerabilidades web.
        </p>
        <p className="mt-2">
          <a
            href="https://github.com/AllanCordova/shingeki"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Código aberto no GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
