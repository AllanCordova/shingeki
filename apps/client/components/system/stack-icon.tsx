import { stackIcons } from "./stack-icons";
import { cn } from "@/lib/utils";

function fillFor(hex: string): string {
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance < 0.25 ? "currentColor" : `#${hex}`;
}

export function StackIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const icon = stackIcons[slug];

  if (!icon) {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={cn("size-5 shrink-0 text-muted-foreground", className)}
      >
        <path
          fill="currentColor"
          d="M12 2.5 4.5 6.75v10.5L12 21.5l7.5-4.25V6.75L12 2.5Zm0 2.2 5.2 2.95v6.7L12 17.3l-5.2-2.95v-6.7L12 4.7Z"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden
      className={cn("size-5 shrink-0", className)}
    >
      <path fill={fillFor(icon.hex)} d={icon.path} />
    </svg>
  );
}
