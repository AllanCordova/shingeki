import { Text, View } from "react-native";
import { Link } from "expo-router";
import { RegisterForm } from "@/components/forms/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export default function RegisterScreen() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Criar conta</CardTitle>
        <CardDescription>Preencha os dados para se cadastrar.</CardDescription>
      </CardHeader>
      <CardContent className="gap-6">
        <RegisterForm />
        <Text className="text-center text-sm text-muted-foreground">
          Ja tem conta?{" "}
          <Link href="/login" className="font-medium text-foreground underline">
            Entrar
          </Link>
        </Text>
      </CardContent>
    </Card>
  );
}
