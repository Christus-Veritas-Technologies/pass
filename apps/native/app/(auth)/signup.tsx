import { Eye, EyeSlash } from "@vuduc0801/react-native-phosphor-icons";
import * as SecureStore from "expo-secure-store";
import { router, Stack } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useRef, useState } from "react";
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
import { apiSignup, signInWithGoogle, storeTokens, registerPushToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppTheme } from "@/lib/theme-context";

const STRENGTH_COLORS = ["", "#EF4444", "#F59E0B", "#10B981"];
const STRENGTH_LABELS = ["", "Weak", "Fair", "Strong"];

function getStrength(pw: string): number {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 3;
  return 2;
}

export default function SignupScreen() {
  const { colors } = useAppTheme();
  const BRAND = colors.brand;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string; email?: string; password?: string; form?: string;
  }>({});

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const strength = getStrength(password);

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Must be at least 8 characters";
    return e;
  }

  async function handleSignup() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await apiSignup(name.trim(), email.trim().toLowerCase(), password);
      await storeTokens(data);
      registerPushToken().catch(() => undefined);
      router.replace({ pathname: "/(onboarding)", params: { name: data.user.name } });
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Sign up failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

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
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}>Pass</Text>
              </View>
            </MotiView>

            {/* Heading */}
            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 220, delay: 80, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 40 }}>
              <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}>Create account</Text>
              <Text style={{ fontSize: 15, color: colors.textTertiary, marginTop: 4 }}>Start your exam prep journey</Text>
            </MotiView>

            {/* Form */}
            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 220, delay: 160, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 32, gap: 16 }}>
              <Input
                label="Full name"
                placeholder="Tatenda Moyo"
                value={name}
                onChangeText={setName}
                error={errors.name}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />

              <Input
                ref={emailRef}
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

              {/* Password with strength */}
              <View>
                <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 6 }}>Password</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    ref={passwordRef}
                    placeholder="Min 8 characters"
                    placeholderTextColor={colors.textPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
                    style={{
                      height: 52,
                      paddingHorizontal: 16,
                      paddingRight: 48,
                      borderRadius: 12,
                      borderWidth: errors.password ? 2 : 1,
                      borderColor: errors.password ? colors.error : colors.border,
                      backgroundColor: colors.card,
                      fontSize: 15,
                      color: colors.text,
                    }}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    style={{ position: "absolute", right: 14, top: 14 }}
                    hitSlop={8}
                  >
                    {showPassword
                      ? <EyeSlash size={20} color={colors.textPlaceholder} />
                      : <Eye size={20} color={colors.textPlaceholder} />}
                  </Pressable>
                </View>
                {errors.password && <Text style={{ fontSize: 12, color: colors.error, marginTop: 6 }}>{errors.password}</Text>}

                {/* Strength bar */}
                {password.length > 0 && (
                  <MotiView
                    from={{ opacity: 0, translateY: -4 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
                    style={{ marginTop: 8, gap: 4 }}
                  >
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {[1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : colors.border,
                          }}
                        />
                      ))}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>{STRENGTH_LABELS[strength]}</Text>
                  </MotiView>
                )}
              </View>

              {/* Form-level error */}
              {errors.form && (
                <MotiView from={{ opacity: 0, translateY: -4 }} animate={{ opacity: 1, translateY: 0 }}>
                  <View style={{ backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.errorBorder, borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontSize: 13, color: colors.error }}>{errors.form}</Text>
                  </View>
                </MotiView>
              )}

              <Button loading={loading} onPress={handleSignup}>Create account</Button>
            </MotiView>

            {/* Divider */}
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 220, delay: 240, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ fontSize: 13, color: colors.textTertiary }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
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
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.textSecondary }}>Continue with Google</Text>
                </View>
              </Button>
            </MotiView>

            {/* Login link */}
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 220, delay: 360, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 28, alignItems: "center" }}>
              <Pressable onPress={() => router.back()}>
                <Text style={{ fontSize: 14, color: colors.textTertiary }}>
                  Already have an account?{" "}
                  <Text style={{ color: BRAND, fontWeight: "600" }}>Sign in</Text>
                </Text>
              </Pressable>
            </MotiView>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
