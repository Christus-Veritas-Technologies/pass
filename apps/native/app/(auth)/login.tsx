import { Eye, EyeSlash } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import { router, Stack } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useState, useRef } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiLogin, signInWithGoogle, storeTokens, registerPushToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BRAND = "#4F46E5";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const passwordRef = useRef<TextInput>(null);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    return e;
  }

  async function handleLogin() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await apiLogin(email.trim().toLowerCase(), password);
      await storeTokens(data);
      registerPushToken().catch(() => undefined);

      // Show the post-signin onboarding on the FIRST sign-in only.
      // If the key is already set the user has been through it.
      // If the key is missing but the user already has a grade they're an
      // existing user — mark it done so the onboarding never surfaces again.
      const onboardingShown = await SecureStore.getItemAsync("signin_onboarding_shown");
      if (onboardingShown) {
        router.replace("/(drawer)/(tabs)/home");
      } else if (data.user.grade) {
        await SecureStore.setItemAsync("signin_onboarding_shown", "true");
        router.replace("/(drawer)/(tabs)/home");
      } else {
        router.replace({ pathname: "/(onboarding)", params: { name: data.user.name } });
      }
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Login failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Hide the header */}
      <Stack.Screen
        options={{ headerShown: false }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}>

            {/* Logo */}
            <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Image
                  source={require("../../assets/images/icon.png")}
                  style={{ width: 38, height: 38, borderRadius: 10 }}
                />
                <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>Pass</Text>
              </View>
            </MotiView>

            {/* Heading */}
            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 220, delay: 80, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 40 }}>
              <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>Welcome back</Text>
              <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 4 }}>Sign in to continue studying</Text>
            </MotiView>

            {/* Form */}
            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 220, delay: 160, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 32, gap: 16 }}>
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <View>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 }}>Password</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    ref={passwordRef}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    style={{
                      height: 52,
                      paddingHorizontal: 16,
                      paddingRight: 48,
                      borderRadius: 12,
                      borderWidth: errors.password ? 2 : 1,
                      borderColor: errors.password ? "#EF4444" : "#E5E7EB",
                      backgroundColor: "#FFFFFF",
                      fontSize: 15,
                      color: "#111827",
                    }}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    style={{ position: "absolute", right: 14, top: 14 }}
                    hitSlop={8}
                  >
                    {showPassword ? <EyeSlash size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
                  </Pressable>
                </View>
                {errors.password && <Text style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{errors.password}</Text>}
              </View>

              {/* Forgot password */}
              <Pressable onPress={() => router.push("/(auth)/forgot-password")} style={{ alignSelf: "flex-end", marginTop: -4 }}>
                <Text style={{ fontSize: 13, color: BRAND, fontWeight: "500" }}>Forgot password?</Text>
              </Pressable>

              {/* Form-level error */}
              {errors.form && (
                <MotiView from={{ opacity: 0, translateY: -4 }} animate={{ opacity: 1, translateY: 0 }}>
                  <View style={{ backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontSize: 13, color: "#DC2626" }}>{errors.form}</Text>
                  </View>
                </MotiView>
              )}

              <Button loading={loading} onPress={handleLogin}>Sign in</Button>
            </MotiView>

            {/* Divider */}
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 220, delay: 240, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
              <Text style={{ fontSize: 13, color: "#9CA3AF" }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            </MotiView>

            {/* Google button */}
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 220, delay: 300, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 16 }}>
              <Button
                variant="white"
                loading={googleLoading}
                onPress={async () => {
                  setGoogleLoading(true);
                  setErrors({});
                  try {
                    const { user, isNew } = await signInWithGoogle();
                    const onboardingShown = await SecureStore.getItemAsync("signin_onboarding_shown");
                    if (onboardingShown) {
                      router.replace("/(drawer)/(tabs)/home");
                    } else if (!isNew && user.grade) {
                      await SecureStore.setItemAsync("signin_onboarding_shown", "true");
                      router.replace("/(drawer)/(tabs)/home");
                    } else {
                      router.replace({ pathname: "/(onboarding)", params: { name: user.name } });
                    }
                  } catch (err: unknown) {
                    if (err instanceof Error && err.message !== "Google sign-in was cancelled") {
                      setErrors({ form: err.message });
                    }
                  } finally {
                    setGoogleLoading(false);
                  }
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 17, lineHeight: 20 }}>G</Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151" }}>Continue with Google</Text>
                </View>
              </Button>
            </MotiView>

            {/* Sign up link */}
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 220, delay: 360, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 28, alignItems: "center" }}>
              <Pressable onPress={() => router.push("/(auth)/signup")}>
                <Text style={{ fontSize: 14, color: "#6B7280" }}>
                  Don&apos;t have an account?{" "}
                  <Text style={{ color: BRAND, fontWeight: "600" }}>Sign up</Text>
                </Text>
              </Pressable>
            </MotiView>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
