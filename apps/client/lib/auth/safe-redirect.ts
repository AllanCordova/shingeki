export function safeAppPath(
  value: string | null | undefined,
  fallback = "/projetos",
): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }

  return fallback;
}
