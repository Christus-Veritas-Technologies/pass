/**
 * OAuth callback screen — handles the `pass://auth/callback?...` deep link.
 *
 * This screen is ONLY reached on Android when the app cold-starts (or is killed)
 * because the OS launches the main Activity with the deep-link intent instead
 * of resolving the waiting WebBrowser.openAuthSessionAsync promise.
 *
 * When the app IS in the foreground (the normal iOS + most-Android path),
 * CustomTabsRedirectActivity intercepts the redirect, broadcasts to the waiting
 * openAuthSessionAsync, and the main Activity never sees this URL — so this
 * screen never renders in that scenario.
 */

import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { storeTokens } from "@/lib/auth";

const BRAND = "#4F46E5";

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    async function handle() {
      // Read the URL that cold-started the app (pass://auth/callback?...)
      const initialUrl = await Linking.getInitialURL();
      if (!initialUrl) {
        router.replace("/(auth)/login");
        return;
      }

      const parsed = Linking.parse(initialUrl);
      const qp = parsed.queryParams ?? {};
      const accessToken = typeof qp.accessToken === "string" ? qp.accessToken : null;
      const refreshToken = typeof qp.refreshToken === "string" ? qp.refreshToken : null;
      const isNew = qp.isNew === "1";

      if (!accessToken || !refreshToken) {
        // Deep link without tokens — just go to login
        router.replace("/(auth)/login");
        return;
      }

      await storeTokens({ accessToken, refreshToken });
      // Skip the welcome carousel — user already authenticated via Google
      await SecureStore.setItemAsync("onboarding_complete", "true");

      if (isNew) {
        // Brand-new account — ask for grade to personalise the feed.
        // Name is skipped here; user can add it from their profile.
        router.replace("/(onboarding)/grade");
      } else {
        await SecureStore.setItemAsync("signin_onboarding_shown", "true");
        router.replace("/(drawer)/(tabs)/home");
      }
    }

    handle().catch(() => router.replace("/(auth)/login"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
      <ActivityIndicator size="large" color={BRAND} />
    </View>
  );
}
