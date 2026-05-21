import "@/global.css";
import * as SecureStore from "expo-secure-store";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState, Component, type ReactNode, type ErrorInfo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { OfflineBanner } from "@/components/offline-banner";
import { ThemeProvider } from "@/lib/theme-context";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>Please restart the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111",
  },
  errorMessage: {
    fontSize: 15,
    color: "#555",
  },
});

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
    // undefined = SecureStore read still in-flight; skip to prevent a flash of
    // the protected (drawer) screen before the token is known.
    if (token === undefined) return;
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
