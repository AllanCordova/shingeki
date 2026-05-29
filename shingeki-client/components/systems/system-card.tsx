import Link from "next/link";
import type { System } from "@/lib/contracts";
import { Card, CardContent, CoverImage } from "@/components/ui";

export function SystemCard({
  projectId,
  system,
}: {
  projectId: string;
  system: System;
}) {
  return (
    <Link
      href={`/projetos/${projectId}/sistemas/${system.id}`}
      className="group block"
    >
      <Card className="h-full overflow-hidden transition-colors group-hover:border-foreground/30">
        <CoverImage coverPath={system.cover_path} alt={`Capa de ${system.name}`} />
        <CardContent className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-foreground">
            {system.name}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {system.target_url}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
