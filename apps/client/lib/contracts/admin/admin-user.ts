import type { PaginationMeta, Timestamps } from "../common/common";
import type { UserRole } from "../auth/auth";

export interface AdminUser extends Timestamps {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_path: string | null;
}

export interface AdminUsersQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: UserRole;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: PaginationMeta;
}

export interface UpdateAdminUserRoleInput {
  role: UserRole;
}

export interface UpdateAdminUserRoleResponse {
  message: string;
  user: AdminUser;
}
