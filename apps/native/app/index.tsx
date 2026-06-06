/**
 * Loading screen — the ONLY initial route.
 *
 * Shown immediately on every app launch (no content, no flash).
 * Reads auth + onboarding state from SecureStore in the background,
 * then redirects once (and only once) to the correct destination:
 *
 *   onboarding NOT done  →  /welcome   (onboarding carousel)
 *   onboarding done, no token  →  /(auth)/login
 *   onboarding done + token    →  /(drawer)/(tabs)/home
 */

import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAppTheme } from "@/lib/theme-context";
import { storeTokens } from "@/lib/auth";

const ONBOARDING_KEY = "onboarding_complete";

export default function LoadingScreen() {
  const { colors } = useAppTheme();

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // ── Safety net: if the cold-start URL is an OAuth callback, handle it here
      // in case Expo Router routed to the root instead of auth/callback.
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const parsed = Linking.parse(initialUrl);
        const qp = parsed.queryParams ?? {};
        if (parsed.path === "auth/callback") {
          const accessToken = typeof qp.accessToken === "string" ? qp.accessToken : null;
          const refreshToken = typeof qp.refreshToken === "string" ? qp.refreshToken : null;
          if (accessToken && refreshToken) {
            await storeTokens({ accessToken, refreshToken });
            await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
            if (!cancelled) {
              if (qp.isNew === "1") {
                router.replace("/(onboarding)/grade");
              } else {
                await SecureStore.setItemAsync("signin_onboarding_shown", "true");
                router.replace("/(drawer)/(tabs)/home");
              }
            }
            return;
          }
        }
      }

      const [onboardingDone, token] = await Promise.all([
        SecureStore.getItemAsync(ONBOARDING_KEY),
        SecureStore.getItemAsync("pass_access_token"),
      ]);

      if (cancelled) return;

      if (onboardingDone !== "true") {
        router.replace("/welcome");
      } else if (token) {
        router.replace("/(drawer)/(tabs)/home");
      } else {
        router.replace("/(auth)/login");
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
