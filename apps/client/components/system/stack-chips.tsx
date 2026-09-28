import type { Stack } from "@/lib/contracts/system/stack";
import { Badge } from "@/components/ui/badge";
import { StackIcon } from "./stack-icon";

export function StackChips({
  stacks,
}: {
  stacks?: Array<Pick<Stack, "slug" | "name">>;
}) {
  if (!stacks?.length) {
    return (
      <p className="text-xs text-muted-foreground">Stack não informada</p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {stacks.map((stack) => (
        <li key={stack.slug}>
          <Badge tone="neutral" className="gap-1.5 bg-surface/80">
            <StackIcon slug={stack.slug} className="size-3.5" />
            {stack.name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
