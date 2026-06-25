import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import type { System } from "@/lib/contracts";
import { Badge, Card, CardContent, CoverImage } from "@/components/ui";

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
      asChild
    >
      <Pressable className="active:opacity-90">
        <Card className="overflow-hidden">
          <CoverImage coverPath={system.cover_path} alt={`Capa de ${system.name}`} />
          <CardContent className="gap-2">
            <Text className="text-base font-semibold text-foreground">
              {system.name}
            </Text>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {system.target_url}
            </Text>
            {system.stacks?.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5 pt-1">
                {system.stacks.map((stack) => (
                  <Badge key={stack.id} tone="neutral">
                    {stack.name}
                  </Badge>
                ))}
              </View>
            ) : null}
          </CardContent>
        </Card>
      </Pressable>
    </Link>
  );
}
