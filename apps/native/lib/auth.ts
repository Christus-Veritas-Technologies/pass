import * as SecureStore from "expo-secure-store";
import { env } from "@pass/env/native";

const API = env.EXPO_PUBLIC_SERVER_URL;

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json as T;
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

export function apiGoogleNative(idToken: string) {
  return request<{ user: AuthUser } & AuthTokens & { isNew: boolean }>("/auth/google/native", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

async function authedRequest<T>(path: string, init: RequestInit): Promise<T> {
  const accessToken = await SecureStore.getItemAsync("pass_access_token");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json as T;
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
