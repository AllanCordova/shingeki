import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "./api/error-handler";

/**
 * Mapeia os erros de validacao por campo vindos da API (ja traduzidos)
 * para o estado do react-hook-form. Use no catch das submissoes.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  error: ApiError | null,
  setError: UseFormSetError<T>,
): void {
  if (!error?.fieldErrors) return;
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    setError(field as Path<T>, { type: "server", message });
  }
}
