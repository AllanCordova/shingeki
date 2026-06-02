import { Text, View } from "react-native";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Nao encontrado" }} />
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-lg font-semibold text-foreground">
          Tela nao encontrada
        </Text>
        <Link href="/">
          <Text className="text-sm text-primary underline">Voltar ao inicio</Text>
        </Link>
      </View>
    </>
  );
}
