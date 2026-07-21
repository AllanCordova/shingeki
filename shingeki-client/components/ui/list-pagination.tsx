"use client";

import type { PaginationMeta } from "@/lib/contracts";
import { Button } from "@/components/ui/button";

export function ListPagination({
  pagination,
  isFetching,
  onPageChange,
}: {
  pagination: PaginationMeta;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
}) {
  if (pagination.last_page <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        Página {pagination.current_page} de {pagination.last_page}
        {pagination.total > 0
          ? ` · ${pagination.from ?? 0}-${pagination.to ?? 0} de ${pagination.total}`
          : ""}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pagination.current_page <= 1 || isFetching}
          onClick={() => onPageChange(pagination.current_page - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pagination.current_page >= pagination.last_page || isFetching}
          onClick={() => onPageChange(pagination.current_page + 1)}
        >
          Proxima
        </Button>
      </div>
    </div>
  );
}
