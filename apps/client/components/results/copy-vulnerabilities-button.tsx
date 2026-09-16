"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import type { ResultsResponse, SystemResult } from "@/lib/contracts";
import { notify } from "@/lib/notify";
import { formatVulnerabilitiesClipboard } from "@/lib/results/format-clipboard";
import { Button, CopyIcon } from "@/components/ui";
import type { LogSearchFilterValues } from "@/components/results/log-search-filters";

const COPY_PAGE_SIZE = 100;

async function loadAllResults({
  projectId,
  systemId,
  dispatchId,
  loaded,
  total,
  logFilters,
}: {
  projectId: string;
  systemId: string;
  dispatchId: string;
  loaded: SystemResult[];
  total: number;
  logFilters: LogSearchFilterValues;
}): Promise<SystemResult[]> {
  if (loaded.length >= total) {
    return loaded;
  }

  const collected: SystemResult[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const search = new URLSearchParams({
      page: "1",
      per_page: "1",
      results_page: String(page),
      results_per_page: String(COPY_PAGE_SIZE),
      filter: "all",
    });

    if (logFilters.category) search.set("category", logFilters.category);
    if (logFilters.risk_level) search.set("risk_level", logFilters.risk_level);
    if (logFilters.route) search.set("route", logFilters.route);
    if (logFilters.q) search.set("q", logFilters.q);

    const { data } = await apiClient.get<ResultsResponse>(
      `/projects/${projectId}/systems/${systemId}/system-results/${dispatchId}?${search.toString()}`,
    );

    collected.push(...data.results);
    lastPage = data.results_pagination?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  return collected;
}

export function CopyVulnerabilitiesButton({
  projectId,
  systemId,
  dispatchId,
  results,
  total,
  scanType,
  logFilters,
}: {
  projectId: string;
  systemId: string;
  dispatchId: string;
  results: SystemResult[];
  total: number;
  scanType?: string | null;
  logFilters: LogSearchFilterValues;
}) {
  const [isCopying, setIsCopying] = useState(false);

  if (total === 0) {
    return null;
  }

  const handleCopy = async () => {
    setIsCopying(true);

    try {
      const allResults = await loadAllResults({
        projectId,
        systemId,
        dispatchId,
        loaded: results,
        total,
        logFilters,
      });
      const text = formatVulnerabilitiesClipboard(allResults, scanType);
      await navigator.clipboard.writeText(text);
      notify.success("Vulnerabilidades copiadas.");
    } catch {
      notify.error("Não foi possível copiar as vulnerabilidades.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="px-2.5"
      isLoading={isCopying}
      aria-label="Copiar todas as vulnerabilidades"
      title="Copiar todas as vulnerabilidades"
      onClick={() => void handleCopy()}
    >
      <CopyIcon className="h-4 w-4" />
    </Button>
  );
}
