import { z } from "zod";

export function zJsonObjectString(message: string) {
  return z
    .string()
    .min(1)
    .refine((value) => {
      try {
        const parsed = JSON.parse(value) as unknown;
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
      } catch {
        return false;
      }
    }, message);
}
