import Toast from "react-native-toast-message";
import type { ApiError } from "@/lib/api/error-handler";

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
    Toast.show({ type: "success", text1: message });
  },

  error(message: string) {
    Toast.show({ type: "error", text1: message });
  },

  fromApiError(error: unknown, fallback = "Ocorreu um erro.") {
    const apiError = error as ApiError | null;
    if (apiError?.message) {
      Toast.show({ type: "error", text1: apiError.message });
      return;
    }
    Toast.show({ type: "error", text1: messageFromError(error, fallback) });
  },

  async run<T>(
    action: () => Promise<T>,
    options: { success: string; error?: string },
  ): Promise<T | undefined> {
    try {
      const result = await action();
      Toast.show({ type: "success", text1: options.success });
      return result;
    } catch (error) {
      notify.fromApiError(error, options.error ?? "Ocorreu um erro.");
      return undefined;
    }
  },
};
