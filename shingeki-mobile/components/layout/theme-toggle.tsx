import { Text } from "react-native";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/lib/stores/theme-store";

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <Button
      variant="outline"
      size="sm"
      onPress={toggleTheme}
      accessibilityLabel="Alternar tema"
    >
      {theme === "dark" ? "Claro" : "Escuro"}
    </Button>
  );
}
