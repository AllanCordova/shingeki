import Link from "next/link";
import type { Project } from "@/lib/contracts";
import { Card, CardContent, CoverImage } from "@/components/ui";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projetos/${project.id}`} className="group block">
      <Card className="h-full overflow-hidden transition-colors group-hover:border-foreground/30">
        <CoverImage coverPath={project.cover_path} alt={`Capa de ${project.name}`} />
        <CardContent className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-foreground">
            {project.name}
          </h3>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {project.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
