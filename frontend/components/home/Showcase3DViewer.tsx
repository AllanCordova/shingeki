"use client";

import dynamic from "next/dynamic";
import { Box } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const CathedralShowcase = dynamic(
  () => import("./CathedralShowcase").then((m) => m.default),
  {
  ssr: false,
  loading: () => (
    <div className="flex h-[58vh] min-h-[380px] w-full items-center justify-center bg-black/40 text-sm text-muted-foreground md:h-[70vh]">
      Loading 3D…
    </div>
  ),
},
);

export function Showcase3DViewer() {
  const [active, setActive] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const onWheelCapture = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    if (!active) return;
    const el = wheelRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheelCapture, { passive: false });
    return () => el.removeEventListener("wheel", onWheelCapture);
  }, [active, onWheelCapture]);

  return (
    <div className="relative">
      {!active ? (
        <div className="flex h-[58vh] min-h-[380px] w-full flex-col items-center justify-center gap-5 bg-linear-to-b from-card/80 to-background px-6 text-center md:h-[70vh]">
          <div
            className="rounded-2xl bg-primary-muted/50 p-5 text-primary ring-1 ring-primary/25"
            aria-hidden
          >
            <Box className="mx-auto h-12 w-12" strokeWidth={1.25} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Trost district — 3D metaphor
            </p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              A stand-in for how your surface reads after Shingeki has surveyed it. Load
              only when you want to look around—lighter for the page, and scroll zoom
              stays on the model, not the document.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-primary-glow transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => setActive(true)}
          >
            Load 3D perimeter
          </button>
        </div>
      ) : (
        <div ref={wheelRef} className="touch-none">
          <CathedralShowcase />
        </div>
      )}
      <p className="border-t border-border/40 bg-card/90 px-4 py-3 text-center text-xs font-medium text-muted-foreground sm:text-sm">
        {active
          ? "Drag to rotate. Scroll wheel zooms the scene; page scroll is paused while the pointer is over the viewer."
          : "Tap Load 3D perimeter to open the Trost-style scene (saves resources until you need it)."}
      </p>
    </div>
  );
}
