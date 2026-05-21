const API = process.env.NEXT_PUBLIC_SERVER_URL;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  grade: string | null;
  plan: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json as T;
}

export function apiSignup(name: string, email: string, password: string) {
  return request<{ user: AuthUser } & AuthTokens>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function apiLogin(email: string, password: string) {
  return request<{ user: AuthUser } & AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function apiForgotPassword(email: string) {
  return request<{ success: boolean }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function apiResetPassword(token: string, password: string) {
  return request<{ success: boolean }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function getGoogleAuthUrl() {
  return `${API}/auth/google`;
}

export async function authedRequest<T>(path: string, init: RequestInit): Promise<T> {
  const accessToken = typeof window !== "undefined"
    ? localStorage.getItem("pass_access_token")
    : null;

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  // Happy path
  if (res.ok) return res.json() as Promise<T>;

  // On 401, attempt token refresh once then retry
  if (res.status === 401) {
    const refreshToken = typeof window !== "undefined"
      ? localStorage.getItem("pass_refresh_token")
      : null;

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const { accessToken: newAccess, refreshToken: newRefresh } = await refreshRes.json();
          storeTokens({ accessToken: newAccess, refreshToken: newRefresh });

          // Retry original request with new token
          const retry = await fetch(`${API}${path}`, {
            ...init,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newAccess}`,
            },
          });
          if (retry.ok) return retry.json() as Promise<T>;
          const retryJson = await retry.json();
          throw new Error(retryJson.error ?? "Something went wrong");
        }
      } catch {
        // Refresh failed — force logout
      }
    }

    clearTokens();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired. Please sign in again.");
  }

  const json = await res.json();
  throw new Error(json.error ?? "Something went wrong");
}

export function apiUpdateProfile(data: { grade?: string; school?: string; name?: string }) {
  return authedRequest<{ user: AuthUser }>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function storeTokens(tokens: AuthTokens) {
  localStorage.setItem("pass_access_token", tokens.accessToken);
  localStorage.setItem("pass_refresh_token", tokens.refreshToken);
  // Mirror a cookie so the edge middleware can check auth state without reading localStorage
  document.cookie = "pass_session=1; path=/; max-age=604800; SameSite=Lax";
}

export function clearTokens() {
  localStorage.removeItem("pass_access_token");
  localStorage.removeItem("pass_refresh_token");
  document.cookie = "pass_session=; path=/; max-age=0; SameSite=Lax";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pass_access_token");
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}
