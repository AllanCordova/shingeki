"use client";

import { useEffect, useState } from "react";

export function useLandingScrollState(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");
  const [opacities, setOpacities] = useState<Record<string, number>>({});

  useEffect(() => {
    const ratios = new Map<string, number>();
    sectionIds.forEach((id) => ratios.set(id, 0));

    const observers: IntersectionObserver[] = [];

    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (!element) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          ratios.set(id, entry?.isIntersecting ? entry.intersectionRatio : 0);

          let bestId = sectionIds[0] ?? "";
          let bestRatio = -1;

          for (const sectionId of sectionIds) {
            const ratio = ratios.get(sectionId) ?? 0;
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = sectionId;
            }
          }

          setActiveId(bestId);
          setOpacities(Object.fromEntries(ratios.entries()));
        },
        { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1] },
      );

      observer.observe(element);
      observers.push(observer);
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, [sectionIds]);

  return { activeId, opacities };
}
