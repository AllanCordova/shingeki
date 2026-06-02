import { Pressable, Text } from "react-native";
import { Link } from "expo-router";
import type { Project } from "@/lib/contracts";
import { Card, CardContent, CoverImage } from "@/components/ui";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projetos/${project.id}`} asChild>
      <Pressable className="active:opacity-90">
        <Card className="overflow-hidden">
          <CoverImage coverPath={project.cover_path} alt={`Capa de ${project.name}`} />
          <CardContent className="gap-2">
            <Text className="text-base font-semibold text-foreground">
              {project.name}
            </Text>
            <Text className="text-sm text-muted-foreground" numberOfLines={3}>
              {project.description}
            </Text>
          </CardContent>
        </Card>
      </Pressable>
    </Link>
  );
}
