import Link from "next/link";
import { SlideIn } from "@/components/animations";
import { Showcase3DViewer } from "./Showcase3DViewer";

export function Showcase3DSection() {
  return (
    <section
      id="showcase"
      className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-10 xl:px-12"
      aria-labelledby="showcase-heading"
    >
      <div className="mx-auto grid w-full max-w-[min(96rem,calc(100vw-1.5rem))] gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center lg:gap-16 xl:gap-20">
        <div className="relative order-2 min-w-0 lg:order-1">
          <div className="absolute -inset-1 rounded-[2rem] bg-primary/15 opacity-70 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[2rem] bg-card/40 ring-1 ring-primary/20 transition duration-500 hover:shadow-primary-glow hover:ring-primary/35">
            <Showcase3DViewer />
          </div>
        </div>

        <div className="relative order-1 min-w-0 lg:order-2">
          <div
            className="absolute bottom-8 left-0 top-8 hidden w-1 rounded-full bg-primary/40 lg:block"
            aria-hidden
          />
          <SlideIn direction="left" whenInView className="lg:pl-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Shingeki — the advance
            </p>
            <h2
              id="showcase-heading"
              className="mt-3 text-subtitle font-semibold tracking-tight text-foreground"
            >
              Your perimeter after the scan
            </h2>
            <p className="mt-4 max-w-md text-body leading-relaxed text-muted-foreground">
              <em>Shingeki</em> is the strike: continuous testing that maps how an attacker
              moves against you. The Trost-style scene is a metaphor—your site or API as a
              walled district once surveys have drawn the line. Load the 3D view to walk it
              like a post-scan perimeter review.
            </p>
            <Link
              href="#cta"
              className="mt-8 inline-flex rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Start now
            </Link>
          </SlideIn>
        </div>
      </div>
    </section>
  );
}
