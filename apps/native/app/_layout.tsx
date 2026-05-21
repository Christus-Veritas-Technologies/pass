import "@/global.css";
import * as SecureStore from "expo-secure-store";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OfflineBanner } from "@/components/offline-banner";
import { ThemeProvider } from "@/lib/theme-context";

// Protects every screen inside (drawer) — the authenticated shell.
// (auth) and (onboarding) routes are always reachable without a token.
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    SecureStore.getItemAsync("pass_access_token").then(setToken);
  }, []);

  useEffect(() => {
    if (token === undefined) return; // still reading from secure store
    if (!token && segments[0] === "(drawer)") {
      router.replace("/(auth)/login");
    }
  }, [token, segments, router]);

  return <>{children}</>;
}

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <KeyboardProvider>
            <AuthGuard>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(drawer)" />
              </Stack>
              <OfflineBanner />
            </AuthGuard>
          </KeyboardProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
