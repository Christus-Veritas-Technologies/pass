import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { env } from "@pass/env/native";

const API = env.EXPO_PUBLIC_SERVER_URL;

const REQUEST_TIMEOUT_MS = 20_000; // 20 s — prevents indefinite hangs on bad/slow networks

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
      signal: controller.signal,
    });
    // Guard against plain-text error responses (e.g. "Internal Server Error")
    let json: Record<string, unknown>;
    try {
      json = await res.json();
    } catch {
      throw new Error(res.ok ? "Invalid server response" : `Server error (${res.status})`);
    }
    if (!res.ok) throw new Error((json.error as string) ?? (json.message as string) ?? "Something went wrong");
    return json as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("Request timed out — check your connection and try again");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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

export function apiSignup(name: string, email: string, password: string, referralCode?: string) {
  return request<{ user: AuthUser } & AuthTokens>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password, ...(referralCode ? { referralCode } : {}) }),
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

export const SESSION_EXPIRED = "SESSION_EXPIRED";

const GOOGLE_REDIRECT = "pass://auth/callback";

export async function signInWithGoogle(): Promise<{ user: AuthUser; isNew: boolean }> {
  const authUrl = `${API}/auth/google?returnTo=${encodeURIComponent(GOOGLE_REDIRECT)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, GOOGLE_REDIRECT);

  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled");
  }

  const url = new URL(result.url);
  const accessToken = url.searchParams.get("accessToken");
  const refreshToken = url.searchParams.get("refreshToken");
  const isNew = url.searchParams.get("isNew") === "1";
  const error = url.searchParams.get("error");

  if (error) throw new Error("Google sign-in failed");
  if (!accessToken || !refreshToken) throw new Error("Invalid OAuth response");

  await storeTokens({ accessToken, refreshToken });

  // Fetch user profile with the new token
  const { user } = await authedRequest<{ user: AuthUser }>("/users/me", { method: "GET" });
  return { user, isNew };
}

export function apiGoogleNative(idToken: string) {
  return request<{ user: AuthUser } & AuthTokens & { isNew: boolean }>("/auth/google/native", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

async function authedRequest<T>(path: string, init: RequestInit): Promise<T> {
  const accessToken = await SecureStore.getItemAsync("pass_access_token");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));

  if (res.ok) return res.json() as Promise<T>;

  // On 401, attempt token refresh once then retry
  if (res.status === 401) {
    const refreshToken = await SecureStore.getItemAsync("pass_refresh_token");

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const { accessToken: newAccess, refreshToken: newRefresh } = await refreshRes.json();
          await storeTokens({ accessToken: newAccess, refreshToken: newRefresh });

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
        // Refresh failed — clear tokens
      }
    }

    await clearTokens();
    throw new Error("SESSION_EXPIRED");
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

export async function storeTokens(tokens: AuthTokens) {
  await SecureStore.setItemAsync("pass_access_token", tokens.accessToken);
  await SecureStore.setItemAsync("pass_refresh_token", tokens.refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync("pass_access_token");
  await SecureStore.deleteItemAsync("pass_refresh_token");
}

const EXPO_PROJECT_ID = "31966f37-762e-44f9-9da4-2aa43d262227";

export async function registerPushToken(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
    await authedRequest("/notifications/native-push/register", {
      method: "POST",
      body: JSON.stringify({ token: tokenData.data, platform: Platform.OS }),
    });
  } catch {
    // Non-fatal — push is best-effort
  }
}
