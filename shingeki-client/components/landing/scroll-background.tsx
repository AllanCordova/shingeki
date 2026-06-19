"use client";

import type { LandingSection } from "./landing-sections";

interface ScrollBackgroundProps {
  sections: LandingSection[];
  opacities: Record<string, number>;
}

export function ScrollBackground({ sections, opacities }: ScrollBackgroundProps) {
  const lightOpacity = opacities.comecar ?? 0;

  return (
    <div
      aria-hidden
      className="pointer-events-none sticky top-0 -mb-[100vh] h-screen w-full overflow-hidden"
    >
      {sections.map((section) => (
        <div
          key={section.id}
          className="absolute inset-0 transition-opacity duration-700 ease-out"
          style={{
            background: section.background,
            opacity: opacities[section.id] ?? 0,
          }}
        />
      ))}
      <div
        className="landing-vignette absolute inset-0"
        style={{ opacity: 1 - lightOpacity * 0.9 }}
      />
    </div>
  );
}
