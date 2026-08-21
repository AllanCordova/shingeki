"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ManualProxyPanel } from "@/components/manual-proxy/manual-proxy-panel";
import { SystemDetailHero } from "@/components/system/system-detail-hero";
import { TargetSessionPanel } from "@/components/target-session/target-session-panel";
import { useMe } from "@/lib/hooks/auth/use-auth";
import { useSystem } from "@/lib/hooks/system/use-systems";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, ErrorShow, Loading } from "@/components/ui";

export default function SystemArsenalPage() {
  const { projectId, systemId } = useParams<{
    projectId: string;
    systemId: string;
  }>();
  const router = useRouter();
  const { user, isLoading: userLoading } = useMe();
  const { system, isLoading, isError, error, refetch } = useSystem(
    projectId,
    systemId,
  );

  const allowed = Boolean(user);

  useEffect(() => {
    if (userLoading || isLoading) return;
    if (!allowed) {
      router.replace(`/projetos/${projectId}/sistemas/${systemId}`);
    }
  }, [allowed, userLoading, isLoading, projectId, systemId, router]);

  if (isLoading || userLoading) return <Loading label="Carregando arsenal..." />;
  if (isError || !system)
    return <ErrorShow error={error} onRetry={() => refetch()} />;
  if (!allowed) return <Loading label="Redirecionando..." />;

  return (
    <div className="flex flex-col gap-8">
      <SystemDetailHero
        system={system}
        backHref={`/projetos/${projectId}/sistemas/${systemId}`}
        backLabel="← Voltar ao sistema"
        subtitle="Arsenal manual"
      />

      <TargetSessionPanel
        projectId={projectId}
        systemId={systemId}
        systemName={system.name}
      />

      <Card>
        <CardHeader>
          <CardTitle>Proxy manual</CardTitle>
          <CardDescription>
            Envie requests customizados ao target, altere headers e payloads e salve
            rotas para repetir testes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualProxyPanel projectId={projectId} systemId={systemId} />
        </CardContent>
      </Card>
    </div>
  );
}
