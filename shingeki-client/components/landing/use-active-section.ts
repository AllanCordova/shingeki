"use client";



import { useEffect, useState } from "react";

import {

  computeSectionVisibility,

  subscribeScroll,

} from "./use-section-visibility";

export function useActiveSection(sectionIds: string[]) {

  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");



  useEffect(() => {

    const elements = sectionIds

      .map((id) => document.querySelector(`[data-section-id="${id}"]`))

      .filter((el): el is HTMLElement => el instanceof HTMLElement);



    if (elements.length === 0) return;



    return subscribeScroll(() => {

      const vh = window.innerHeight;

      let bestId = sectionIds[0] ?? "";

      let bestVisibility = -1;



      for (const el of elements) {

        const id = el.dataset.sectionId;

        if (!id) continue;



        const v = computeSectionVisibility(el.getBoundingClientRect(), vh);

        if (v > bestVisibility) {

          bestVisibility = v;

          bestId = id;

        }

      }



      setActiveId(bestId);

    });

  }, [sectionIds]);



  return activeId;

}

export function useSectionBackgroundOpacities(sectionIds: string[]) {

  const [opacities, setOpacities] = useState<Record<string, number>>({});



  useEffect(() => {

    const elements = sectionIds

      .map((id) => {

        const el = document.querySelector(`[data-section-id="${id}"]`);

        return el instanceof HTMLElement ? { id, el } : null;

      })

      .filter((item): item is { id: string; el: HTMLElement } => item !== null);



    if (elements.length === 0) return;



    return subscribeScroll(() => {

      const vh = window.innerHeight;

      const next: Record<string, number> = {};



      for (const { id, el } of elements) {

        next[id] = computeSectionVisibility(el.getBoundingClientRect(), vh);

      }



      setOpacities(next);

    });

  }, [sectionIds]);



  return opacities;

}


