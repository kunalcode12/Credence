import { getAuthToken } from "./auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/v1";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export async function apiFetch<T>(
  path: string,
  options?: {
    method?: HttpMethod;
    body?: unknown;
    auth?: boolean;
  }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.auth) {
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method || "GET",
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const json: unknown = await res.json().catch(() => ({} as unknown));
  if (!res.ok) {
    const message =
      (typeof json === "object" &&
        json !== null &&
        ("message" in json
          ? String((json as Record<string, unknown>).message)
          : "error" in json
          ? String((json as Record<string, unknown>).error)
          : null)) ||
      "Request failed";
    throw new Error(message);
  }
  return json as T;
}

export type AuthUser = {
  id: string;
  email: string;
  phoneNumber: string;
  role: "pending" | "customer" | "organization" | "financer";
};

export type SignupResponse = {
  success: boolean;
  message: string;
  data: { user: AuthUser; token: string };
};

export type LoginResponse = SignupResponse;

export type MeResponse = {
  success: boolean;
  data: {
    user: AuthUser;
    profile: {
      exists: boolean;
      id: string | null;
      type: "customer" | "organization" | null;
    };
  };
};

export type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  seen: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
};

export type NotificationsResponse = {
  success: boolean;
  data: { notifications: Notification[] };
};
