import { toast } from "sonner";
import { ApiError } from "@/lib/api/error-handler";

function messageFromError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}

export const notify = {
  success(message: string) {
    toast.success(message);
  },

  error(message: string) {
    toast.error(message);
  },

  warning(message: string) {
    toast.warning(message);
  },

  fromApiError(error: unknown, fallback = "Ocorreu um erro.") {
    const apiError = error instanceof ApiError ? error : null;
    const fieldMessage = apiError?.fieldErrors
      ? Object.values(apiError.fieldErrors)[0]
      : undefined;
    if (fieldMessage) {
      toast.error(fieldMessage);
      return;
    }
    if (apiError?.message) {
      toast.error(apiError.message);
      return;
    }
    toast.error(messageFromError(error, fallback));
  },

  async run<T>(
    action: () => Promise<T>,
    options: { success: string; error?: string },
  ): Promise<T | undefined> {
    try {
      const result = await action();
      toast.success(options.success);
      return result;
    } catch (error) {
      notify.fromApiError(error, options.error ?? "Ocorreu um erro.");
      return undefined;
    }
  },
};
