"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#showcase", label: "Docs" },
  { href: "#cta", label: "Pricing" },
] as const;

export function HomeHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-[background,box-shadow,backdrop-filter] duration-300 ${
        scrolled
          ? "rounded-b-3xl bg-background/80 shadow-primary-glow backdrop-blur-md supports-[backdrop-filter]:bg-background/65"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          Shingeki
        </Link>

        <nav
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 sm:gap-2"
          aria-label="Main"
        >
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center">
          <Link
            href="/login"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 text-foreground transition-colors hover:border-primary/50 hover:bg-primary-muted/30 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Log in"
          >
            <UserRound className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
