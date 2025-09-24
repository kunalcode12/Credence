import { apiFetch } from "./api";
import type { NotificationsResponse } from "./api";

export async function listNotifications() {
  return apiFetch<NotificationsResponse>("/notifications", { auth: true });
}

export async function markNotificationSeen(id: string) {
  return apiFetch<{ success: boolean }>(`/notifications/${id}/seen`, {
    method: "POST",
    auth: true,
  });
}

export async function markAllNotificationsSeen() {
  return apiFetch<{ success: boolean }>(`/notifications/seen/all`, {
    method: "POST",
    auth: true,
  });
}
