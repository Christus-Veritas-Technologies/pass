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
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAppTheme } from "@/lib/theme-context";

const ONBOARDING_KEY = "onboarding_complete";

export default function LoadingScreen() {
  const { colors } = useAppTheme();

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
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
