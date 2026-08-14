import type { PaginationMeta, Timestamps } from "./common";

export type UserNotificationType = "attack_dispatch" | "catalog_import";
export type UserNotificationStatus = "pending" | "completed" | "failed";

export interface UserNotification extends Timestamps {
  id: string;
  type: UserNotificationType;
  status: UserNotificationStatus;
  title: string;
  body: string;
  action_url: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
}

export interface UserNotificationsResponse {
  notifications: UserNotification[];
  pagination: PaginationMeta;
  unread_count: number;
  pending_count: number;
}

export interface UserNotificationUnreadCountResponse {
  unread_count: number;
  pending_count: number;
}

export interface UserNotificationReadResponse {
  message: string;
  notification: UserNotification;
}

export interface UserNotificationDeleteResponse {
  message: string;
}
