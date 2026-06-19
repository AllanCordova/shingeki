import type { User } from "@/lib/contracts";

export type UserRole = "USER" | "ADMIN" | "SPECIALIST";

export type CatalogCapability = "manageCatalog" | "bulkImportCatalog";

const SPECIALIST_CAPABILITIES: readonly CatalogCapability[] = [
  "manageCatalog",
  "bulkImportCatalog",
];

export function hasRole(user: User | undefined, role: UserRole): boolean {
  return user?.role === role;
}

export function hasAnyRole(
  user: User | undefined,
  roles: readonly UserRole[],
): boolean {
  return user !== undefined && roles.includes(user.role);
}

export function isAdmin(user: User | undefined): boolean {
  return hasRole(user, "ADMIN");
}

export function isSpecialist(user: User | undefined): boolean {
  return hasRole(user, "SPECIALIST");
}

export function hasCatalogCapability(
  user: User | undefined,
  capability: CatalogCapability,
): boolean {
  if (user === undefined) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  return SPECIALIST_CAPABILITIES.includes(capability);
}

export function canManageCatalog(user: User | undefined): boolean {
  return hasCatalogCapability(user, "manageCatalog");
}

export function canBulkImportCatalog(user: User | undefined): boolean {
  return hasCatalogCapability(user, "bulkImportCatalog");
}
