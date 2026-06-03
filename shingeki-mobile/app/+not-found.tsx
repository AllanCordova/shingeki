import { Text } from "react-native";
import { Link, Stack } from "expo-router";
import { Screen } from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Nao encontrado" }} />
      <Screen className="items-center justify-center gap-4 p-6">
        <Text className="text-lg font-semibold text-foreground">
          Tela nao encontrada
        </Text>
        <Link href="/">
          <Text className="text-sm text-primary underline">Voltar ao inicio</Text>
        </Link>
      </Screen>
    </>
  );
}
