import type {
  CommentEntry,
  LoginUser,
  Me,
  MemberSummary,
  ProfileResponse,
} from "../shared/types";

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      typeof data.error === "string" ? data.error : "요청에 실패했습니다.",
    );
  }
  return data as T;
}

export const api = {
  me: () => request<Me>("/api/me"),
  loginUsers: () => request<LoginUser[]>("/api/login-users"),
  login: (userId: number, pin: string) =>
    request<Me>("/api/login", { method: "POST", body: JSON.stringify({ userId, pin }) }),
  logout: () => request<{ ok: true }>("/api/logout", { method: "POST" }),
  setup: (body: { newPin: string; startWeight?: number; goalWeight?: number }) =>
    request<Me>("/api/setup", { method: "POST", body: JSON.stringify(body) }),
  members: () => request<MemberSummary[]>("/api/users"),
  createUser: (name: string) =>
    request<{ id: number; name: string; initialPin: string }>("/api/users", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  resetPin: (userId: number) =>
    request<{ ok: true; initialPin: string }>(`/api/users/${userId}/reset-pin`, {
      method: "POST",
    }),
  profile: (userId: number) => request<ProfileResponse>(`/api/users/${userId}`),
  saveWeight: (date: string, weight: number) =>
    request<{ ok: true; changed: boolean }>("/api/weights", {
      method: "POST",
      body: JSON.stringify({ date, weight }),
    }),
  deleteWeight: (date: string) =>
    request<{ ok: true }>(`/api/weights/${date}`, { method: "DELETE" }),
  addComment: (userId: number, content: string) =>
    request<{ ok: true }>(`/api/users/${userId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  recentComments: () => request<CommentEntry[]>("/api/comments/recent"),
};

export function todayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function formatDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatKg(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${value.toFixed(1)}kg`;
}
