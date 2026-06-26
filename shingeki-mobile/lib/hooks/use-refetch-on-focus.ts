import { useCallback } from "react";
import { useFocusEffect } from "expo-router";

export function useRefetchOnFocus(refetch: () => unknown) {
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
}
