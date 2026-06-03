import { Text } from "react-native";
import { Link } from "expo-router";
import { LoginForm } from "@/components/forms/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Screen,
} from "@/components/ui";

export default function LoginScreen() {
  return (
    <Screen className="justify-center px-4 pb-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Entrar</CardTitle>
          <CardDescription>Acesse sua conta para continuar.</CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <LoginForm />
          <Text className="text-center text-sm text-muted-foreground">
            Nao tem conta?{" "}
            <Link href="/registro" className="font-medium text-foreground underline">
              Criar conta
            </Link>
          </Text>
        </CardContent>
      </Card>
    </Screen>
  );
}
