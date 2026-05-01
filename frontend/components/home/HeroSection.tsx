import Link from "next/link";
import { FadeIn, SlideIn } from "@/components/animations";
import { HeroParticleField } from "./HeroParticleField";

export function HeroSection() {
  return (
    <section
      className="relative min-h-[100dvh] w-full overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <HeroParticleField />
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent opacity-88"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-r from-hero-scrim-start via-transparent to-transparent opacity-70"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col justify-center px-5 pb-24 pt-28 sm:px-8 lg:px-10">
        <div className="w-full max-w-xl text-left sm:max-w-2xl lg:ml-0 lg:max-w-2xl lg:pl-2 xl:max-w-[34rem] xl:pl-6">
          <FadeIn delay={0.05} y={20}>
            <h1
              id="hero-heading"
              className="text-title font-semibold tracking-tight text-foreground drop-shadow-sm"
            >
              Automated Vulnerability Analysis &amp; Remediation
            </h1>
          </FadeIn>
          <SlideIn direction="up" delay={0.12} distance={20}>
            <p className="mt-6 max-w-xl text-subtitle font-normal leading-relaxed text-muted-foreground">
              Empower your security workflow with continuous DAST scanning. Identify
              threats and apply intelligent code fixes before deployment.
            </p>
          </SlideIn>
          <FadeIn delay={0.2} y={12}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="#cta"
                className="inline-flex items-center justify-center rounded-full border-2 border-primary bg-transparent px-8 py-3.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Get started
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-border/80 bg-transparent px-8 py-3.5 text-sm font-semibold text-foreground transition hover:border-primary/45 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                View features
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
