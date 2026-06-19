"use client";

import { cn } from "@/lib/utils";
import type { LandingSection, NavTheme } from "./landing-sections";

interface SectionNavProps {
  sections: LandingSection[];
  activeId: string;
  navTheme: NavTheme;
}

export function SectionNav({ sections, activeId, navTheme }: SectionNavProps) {
  const isLight = navTheme === "light";

  return (
    <>
      <nav
        aria-label="Navegação por seções"
        className={cn(
          "fixed bottom-0 left-0 z-50 hidden w-[13.75rem] flex-col lg:flex",
          "pb-8 pl-6",
        )}
      >
        <ul
          className={cn(
            "overflow-y-auto",
            isLight ? "text-[#0a0a0a]" : "text-white",
          )}
        >
          {sections.map((section, index) => {
            const isActive = activeId === section.id;
            return (
              <li
                key={section.id}
                className={cn(
                  "relative border-t",
                  isLight ? "border-black/10" : "border-white/10",
                  index === 0 && "border-t-0",
                )}
              >
                <a
                  href={`#${section.id}`}
                  className={cn(
                    "block py-3.5 pr-4 text-sm transition-all duration-500 ease-out",
                    isActive
                      ? isLight
                        ? "translate-x-1 pl-5 font-medium text-[#0a0a0a]"
                        : "translate-x-1 pl-5 font-medium text-white"
                      : isLight
                        ? "pl-4 text-[#71717a] hover:pl-5 hover:text-[#0a0a0a]"
                        : "pl-4 text-white/45 hover:pl-5 hover:text-white/80",
                  )}
                >
                  {section.label}
                </a>
                {isActive && (
                  <span
                    className={cn(
                      "absolute top-1/2 left-0 h-px w-3 -translate-y-1/2 transition-all",
                      isLight ? "bg-[#0a0a0a]" : "bg-white",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Navegação por seções"
        className={cn(
          "fixed right-0 bottom-0 left-0 z-50 flex overflow-x-auto border-t lg:hidden",
          isLight ? "border-black/[0.08] bg-white/95" : "border-white/[0.08] bg-black/80",
        )}
      >
        {sections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "shrink-0 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors",
                isActive
                  ? isLight
                    ? "text-[#0a0a0a]"
                    : "text-white"
                  : isLight
                    ? "text-[#71717a]"
                    : "text-white/50",
              )}
            >
              {section.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
