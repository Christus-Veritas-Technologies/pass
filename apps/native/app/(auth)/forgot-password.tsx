import { ArrowLeft01Icon, CheckmarkCircle01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiForgotPassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BRAND = "#4F46E5";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email"); return; }
    setError("");
    setLoading(true);
    try {
      await apiForgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}
        >
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={36} color="#16A34A" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 8 }}>Check your email</Text>
          <Text style={{ fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
            If <Text style={{ color: "#374151", fontWeight: "600" }}>{email}</Text> has an account, we&apos;ve sent a reset link.
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 15, color: BRAND, fontWeight: "600" }}>Back to sign in</Text>
          </Pressable>
        </MotiView>
      </SafeAreaView>
    );
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
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>

            {/* Back button */}
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={8}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color="#6B7280" />
                <Text style={{ fontSize: 14, color: "#6B7280" }}>Back</Text>
              </Pressable>
            </MotiView>

            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 220, delay: 80, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 40, gap: 8 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                <HugeiconsIcon icon={Mail01Icon} size={22} color={BRAND} />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>Forgot password?</Text>
              <Text style={{ fontSize: 15, color: "#6B7280", lineHeight: 22 }}>
                Enter your email and we&apos;ll send you a reset link.
              </Text>
            </MotiView>

            <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 220, delay: 160, easing: Easing.bezier(0.23, 1, 0.32, 1) }} style={{ marginTop: 36, gap: 16 }}>
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(""); }}
                error={error}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                autoFocus
              />

              <Button loading={loading} onPress={handleSubmit}>Send reset link</Button>
            </MotiView>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
