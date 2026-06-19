"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { canManageCatalog, isAdmin, type UserRole } from "@/lib/auth/roles";
import { useMe } from "@/lib/hooks/use-auth";
import { EmptyState, Loading } from "@/components/ui";

interface RequireRoleProps {
  roles?: readonly UserRole[];
  children: ReactNode;
  fallbackHref?: string;
}

export function RequireRole({
  roles,
  children,
  fallbackHref = "/projetos",
}: RequireRoleProps) {
  const { user, isLoading, isError } = useMe();
  const router = useRouter();

  const allowed = roles
    ? user !== undefined && (isAdmin(user) || roles.includes(user.role))
    : canManageCatalog(user);

  useEffect(() => {
    if (!isLoading && !isError && user && !allowed) {
      router.replace(fallbackHref);
    }
  }, [allowed, fallbackHref, isError, isLoading, router, user]);

  if (isLoading) {
    return <Loading label="Verificando permissao..." />;
  }

  if (isError || !user) {
    return (
      <EmptyState
        title="Sessao necessaria"
        description="Faca login para acessar esta area."
      />
    );
  }

  if (!allowed) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Esta area e exclusiva para administradores do catalogo."
      />
    );
  }

  return children;
}
