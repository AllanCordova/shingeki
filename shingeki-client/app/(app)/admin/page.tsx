import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Painel Admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Mantenha o catalogo global de ataques e medicacoes atualizado para toda
          a plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ataques (RF07)</CardTitle>
            <CardDescription>
              Mapeie vulnerabilidades recorrentes e adicione novos vetores ao
              motor de testes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/ataques"
              className="text-sm font-medium text-primary hover:underline"
            >
              Gerenciar catalogo de ataques
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medicacoes (RF08)</CardTitle>
            <CardDescription>
              Cadastre scripts e solucoes de mitigacao globais para cruzar com
              findings dos usuarios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/medicacoes"
              className="text-sm font-medium text-primary hover:underline"
            >
              Gerenciar catalogo de medicacoes
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
