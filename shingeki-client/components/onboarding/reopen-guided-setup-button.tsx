"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, MapIcon } from "@/components/ui";
import { useMe } from "@/lib/hooks/auth/use-auth";
import { useSidebarNavigation } from "@/lib/hooks/navigation/use-sidebar-navigation";
import {
  GUIDED_SETUP_SESSION_EVENT,
  guidedSetupResumePath,
  readGuidedSetupSession,
  reopenGuidedSetupSession,
} from "@/lib/onboarding";

export function ReopenGuidedSetupButton() {
  const router = useRouter();
  const { user } = useMe();
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
    const session = reopenGuidedSetupSession(meta, items, user?.id);
    const resumePath = guidedSetupResumePath(session);

    if (resumePath) {
      router.push(resumePath);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="px-2.5"
      onClick={handleReopen}
      aria-label="Reabrir guia"
      title="Reabrir guia"
    >
      <MapIcon className="h-4 w-4" />
    </Button>
  );
}
