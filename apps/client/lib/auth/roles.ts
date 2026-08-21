import type { User, UserRole } from "@/lib/contracts";

export type { UserRole };

export type CatalogCapability = "manageCatalog" | "bulkImportCatalog";

const SPECIALIST_CAPABILITIES: readonly CatalogCapability[] = [
  "manageCatalog",
  "bulkImportCatalog",
];

export function hasRole(user: User | undefined, role: UserRole): boolean {
  return user?.role === role;
}

export function isAdmin(user: User | undefined): boolean {
  return hasRole(user, "ADMIN");
}

export function isSpecialist(user: User | undefined): boolean {
  return hasRole(user, "SPECIALIST");
}

export function isCommonUser(user: User | undefined): boolean {
  return hasRole(user, "USER");
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

  if (!isSpecialist(user)) {
    return false;
  }

  return SPECIALIST_CAPABILITIES.includes(capability);
}

export function canManageCatalog(user: User | undefined): boolean {
  return hasCatalogCapability(user, "manageCatalog");
}

export function canBulkImportCatalog(user: User | undefined): boolean {
  return hasCatalogCapability(user, "bulkImportCatalog");
}
