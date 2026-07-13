"use client";

import { SidebarNavigationSettings } from "@/components/settings/sidebar-navigation-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Configuracoes
        </h1>
        <p className="text-sm text-muted-foreground">
          Personalize a navegacao e preferencias do aplicativo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Navegacao</CardTitle>
          <CardDescription>
            Projetos e sistemas visiveis na sidebar lateral.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SidebarNavigationSettings />
        </CardContent>
      </Card>
    </div>
  );
}
