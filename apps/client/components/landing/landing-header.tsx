"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavTheme } from "./landing-sections";

interface LandingHeaderProps {
  navTheme: NavTheme;
  isAuthenticated?: boolean;
}

export function LandingHeader({
  navTheme,
  isAuthenticated = false,
}: LandingHeaderProps) {
  const isLight = navTheme === "light";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 z-50 w-full transition-colors duration-700",
        isLight ? "text-[#0a0a0a]" : "text-white",
      )}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-[1680px] items-center justify-between px-6 sm:px-10 lg:px-12">
        <Link
          href="/"
          className={cn(
            "flex flex-col leading-none no-underline transition-opacity hover:opacity-80",
            isLight ? "text-[#0a0a0a]" : "text-white",
          )}
        >
          <span className="text-sm font-semibold tracking-tight">Shingeki</span>
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.22em]",
              isLight ? "text-[#71717a]" : "text-white/55",
            )}
          >
            Security Platform
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <Link
              href="/projetos"
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-medium transition-colors",
                isLight
                  ? "bg-[#0a0a0a] text-white hover:bg-[#262626]"
                  : "bg-white text-black hover:bg-white/90",
              )}
            >
              Meus projetos
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  "hidden rounded-full px-4 py-2.5 text-sm font-medium transition-colors sm:inline-flex",
                isLight
                  ? "text-[#0a0a0a] hover:bg-black/5"
                  : "text-white/90 hover:bg-white/10",
                )}
              >
                Entrar
              </Link>
              <Link
                href="/registro"
                className={cn(
                  "rounded-full px-5 py-2.5 text-sm font-medium transition-colors",
                  isLight
                    ? "bg-[#0a0a0a] text-white hover:bg-[#262626]"
                    : "bg-white text-black hover:bg-white/90",
                )}
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
