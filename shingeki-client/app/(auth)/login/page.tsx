import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Entrar</CardTitle>
        <CardDescription>Acesse sua conta para continuar.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          Nao tem conta?{" "}
          <Link href="/registro" className="font-medium text-foreground underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
