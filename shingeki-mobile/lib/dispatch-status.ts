import type { AttackDispatch } from "@/lib/contracts";

export function isDispatchCompleted(
  dispatch: AttackDispatch | undefined,
): boolean {
  if (!dispatch) return false;
  return dispatch.status === "completed" || dispatch.completed_at != null;
}
