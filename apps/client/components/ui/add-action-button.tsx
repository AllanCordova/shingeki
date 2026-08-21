import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { PlusIcon } from "./icons";

type AddActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
};

export function AddActionButton({ className, ...props }: AddActionButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-app bg-primary text-primary-foreground transition-colors hover:bg-primary-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <PlusIcon />
    </button>
  );
}
