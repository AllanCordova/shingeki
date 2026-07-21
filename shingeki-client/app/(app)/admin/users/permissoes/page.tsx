"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/lib/hooks/auth/use-auth";
import {
  useAdminUsers,
  useDeleteAdminUser,
  useUpdateAdminUserRole,
} from "@/lib/hooks/admin/use-admin-users";
import { notify } from "@/lib/notify";
import type { UserRole } from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common/common";
import {
  Badge,
  Button,
  ConfirmActionModal,
  EmptyState,
  ErrorShow,
  Input,
  ListPagination,
  Loading,
  Select,
  UserAvatar,
} from "@/components/ui";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "USER", label: "Usuário" },
  { value: "SPECIALIST", label: "Especialista" },
  { value: "ADMIN", label: "Administrador" },
];

function roleBadgeTone(role: UserRole): "neutral" | "warning" | "success" {
  if (role === "ADMIN") return "success";
  if (role === "SPECIALIST") return "warning";
  return "neutral";
}

function roleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

type PendingDelete = {
  id: string;
  name: string;
  email: string;
};

export default function AdminUsersPermissoesPage() {
  const { user: me } = useMe();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { users, pagination, isLoading, isFetching, isError, error, refetch } =
    useAdminUsers({
      page,
      per_page: DEFAULT_PAGE_SIZE,
      search: search || undefined,
      role: roleFilter || undefined,
    });

  const updateRole = useUpdateAdminUserRole();
  const deleteUser = useDeleteAdminUser();
  const hasFilters = Boolean(search || roleFilter);

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value === "" ? "" : (value as UserRole));
    setPage(1);
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setPendingUserId(userId);
    try {
      await updateRole.mutateAsync({ userId, role });
      notify.success("Permissão atualizada.");
    } catch (err) {
      notify.fromApiError(err, "Não foi possível atualizar a permissão.");
    } finally {
      setPendingUserId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      await deleteUser.mutateAsync(pendingDelete.id);
      notify.success("Usuário removido.");
      setPendingDelete(null);
    } catch (err) {
      notify.fromApiError(err, "Não foi possível remover o usuário.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Usuários e permissões
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Escolha o papel de cada pessoa na plataforma ou remova contas. Você
            não pode alterar ou excluir a sua própria conta.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar usuários"
            className="sm:flex-1"
          />
          <Select
            value={roleFilter}
            onChange={(event) => handleRoleFilterChange(event.target.value)}
            aria-label="Filtrar por permissão"
            className="sm:w-44"
          >
            <option value="">Todas as permissões</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? <Loading label="Carregando usuários..." /> : null}
      {isError ? (
        <ErrorShow error={error} onRetry={() => void refetch()} />
      ) : null}

      {!isLoading && !isError && users.length === 0 ? (
        <EmptyState
          title="Nenhum usuário encontrado"
          description={
            hasFilters
              ? "Ajuste a busca ou o filtro de permissão e tente novamente."
              : "Aguarde novos cadastros na plataforma."
          }
        />
      ) : null}

      {!isLoading && !isError && users.length > 0 ? (
        <div className="overflow-hidden rounded-app border border-border bg-surface">
          <ul className="divide-y divide-border">
            {users.map((user) => {
              const isSelf = me?.id === user.id;
              const isUpdating = pendingUserId === user.id;

              return (
                <li
                  key={user.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <UserAvatar
                      name={user.name}
                      avatarPath={user.avatar_path}
                      size="md"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-foreground">
                          {user.name}
                        </p>
                        <Badge tone={roleBadgeTone(user.role)}>
                          {roleLabel(user.role)}
                        </Badge>
                        {isSelf ? (
                          <Badge tone="neutral">Você</Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Select
                      value={user.role}
                      disabled={isSelf || isUpdating || updateRole.isPending}
                      aria-label={`Permissão de ${user.name}`}
                      className="min-w-0 flex-1 sm:w-52"
                      onChange={(event) => {
                        const nextRole = event.target.value as UserRole;
                        if (nextRole === user.role) return;
                        void handleRoleChange(user.id, nextRole);
                      }}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={isSelf || deleteUser.isPending}
                      aria-label={`Remover ${user.name}`}
                      onClick={() =>
                        setPendingDelete({
                          id: user.id,
                          name: user.name,
                          email: user.email,
                        })
                      }
                    >
                      Remover
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {pagination ? (
        <ListPagination
          pagination={pagination}
          isFetching={isFetching}
          onPageChange={setPage}
        />
      ) : null}

      <ConfirmActionModal
        open={pendingDelete !== null}
        title="Remover usuário"
        description={
          pendingDelete
            ? `Tem certeza que deseja remover ${pendingDelete.name} (${pendingDelete.email})? Essa ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Remover usuário"
        isLoading={deleteUser.isPending}
        onClose={() => {
          if (!deleteUser.isPending) setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
