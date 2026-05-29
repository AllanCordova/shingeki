/**
 * Concatena classes condicionalmente, ignorando valores falsy.
 * Mantemos um helper simples (sem dependencias) ja que so usamos
 * utilitarios do Tailwind baseados nas nossas variaveis de tema.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Formata uma data ISO para o formato brasileiro (dd/mm/aaaa hh:mm). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
