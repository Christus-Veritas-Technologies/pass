import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { MotiView } from "moti";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiSignup, storeTokens } from "@/lib/auth";

const BRAND = "#4F46E5";

const STRENGTH_COLORS = ["", "#EF4444", "#F59E0B", "#10B981"];
const STRENGTH_LABELS = ["", "Weak", "Fair", "Strong"];

function getStrength(pw: string): number {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 3;
  return 2;
}

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
      router.replace("/(drawer)/(tabs)/home");
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Sign up failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
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
            <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20, lineHeight: 24 }}>P</Text>
                </View>
                <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>Pass</Text>
              </View>
            </MotiView>

            {/* Heading */}
            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400, delay: 80 }} style={{ marginTop: 40 }}>
              <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>Create account</Text>
              <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 4 }}>Start your exam prep journey</Text>
            </MotiView>

            {/* Form */}
            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400, delay: 160 }} style={{ marginTop: 32, gap: 16 }}>
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
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 }}>Password</Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    ref={passwordRef}
                    placeholder="Min 8 characters"
                    placeholderTextColor="#9CA3AF"
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
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
                  </Pressable>
                </View>
                {errors.password && <Text style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{errors.password}</Text>}

                {/* Strength bar */}
                {password.length > 0 && (
                  <MotiView
                    from={{ opacity: 0, translateY: -4 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: "timing", duration: 200 }}
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
                            backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : "#E5E7EB",
                          }}
                        />
                      ))}
                    </View>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>{STRENGTH_LABELS[strength]}</Text>
                  </MotiView>
                )}
              </View>

              {/* Form-level error */}
              {errors.form && (
                <MotiView from={{ opacity: 0, translateY: -4 }} animate={{ opacity: 1, translateY: 0 }}>
                  <View style={{ backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontSize: 13, color: "#DC2626" }}>{errors.form}</Text>
                  </View>
                </MotiView>
              )}

              <Button loading={loading} onPress={handleSignup}>Create account</Button>
            </MotiView>

            {/* Divider */}
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 400, delay: 240 }} style={{ marginTop: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
              <Text style={{ fontSize: 13, color: "#9CA3AF" }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            </MotiView>

            {/* Google button */}
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 400, delay: 300 }} style={{ marginTop: 16 }}>
              <Button variant="white" onPress={() => {/* expo-auth-session wired in later PR */}}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 17, lineHeight: 20 }}>G</Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#374151" }}>Continue with Google</Text>
                </View>
              </Button>
            </MotiView>

            {/* Login link */}
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 400, delay: 360 }} style={{ marginTop: 28, alignItems: "center" }}>
              <Pressable onPress={() => router.back()}>
                <Text style={{ fontSize: 14, color: "#6B7280" }}>
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
