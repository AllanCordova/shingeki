"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { useSidebarNavigation } from "@/lib/hooks/use-sidebar-navigation";
import {
  GUIDED_SETUP_SESSION_EVENT,
  guidedSetupResumePath,
  readGuidedSetupSession,
  reopenGuidedSetupSession,
} from "@/lib/onboarding";

export function ReopenGuidedSetupButton() {
  const router = useRouter();
  const { meta, items, isLoading } = useSidebarNavigation();
  const [isActive, setIsActive] = useState(() => readGuidedSetupSession().active);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) {
        setIsActive(detail.active);
        return;
      }
      setIsActive(readGuidedSetupSession().active);
    };

    window.addEventListener(GUIDED_SETUP_SESSION_EVENT, sync);
    return () => window.removeEventListener(GUIDED_SETUP_SESSION_EVENT, sync);
  }, []);

  if (isLoading || isActive || !meta) return null;

  const handleReopen = () => {
    const session = reopenGuidedSetupSession(meta, items);
    const resumePath = guidedSetupResumePath(session);

    if (resumePath) {
      router.push(resumePath);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleReopen}>
      Reabrir guia
    </Button>
  );
}
