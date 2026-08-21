"use client";

import Link from "next/link";
import { SidebarNavigationSettings } from "@/components/settings/sidebar-navigation-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export default function ConfiguraçõesNavegaçãoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/configuracoes"
            className="hover:text-foreground hover:underline"
          >
            Configurações
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-foreground">Navegação</span>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Navegação
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Projetos e sistemas visíveis na sidebar lateral.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pins da sidebar</CardTitle>
          <CardDescription>
            Marque o que deve aparecer e arraste para reordenar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SidebarNavigationSettings />
        </CardContent>
      </Card>
    </div>
  );
}
