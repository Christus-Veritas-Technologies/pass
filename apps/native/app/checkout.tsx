import {
  ArrowLeft01Icon,
  CrownIcon,
  Loading01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as SecureStore from "expo-secure-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { env } from "@pass/env/native";

const BRAND = "#4F46E5";
const API = env.EXPO_PUBLIC_SERVER_URL;

const PLANS = {
  STUDY: {
    name: "Study",
    price: "$2.99",
    period: "month",
    icon: SparklesIcon,
    color: "#7C3AED",
    features: [
      "12 past papers per month",
      "7 AI projects per month",
      "Detailed answer explanations",
      "Email support",
    ],
  },
  PASS: {
    name: "Pass",
    price: "$5.99",
    period: "month",
    icon: CrownIcon,
    color: "#D97706",
    features: [
      "20 past papers per month",
      "12 AI projects per month",
      "Detailed worked solutions",
      "Priority support",
      "Full progress analytics",
    ],
  },
};

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const planParam = (params.plan as "STUDY" | "PASS") || "STUDY";

  const [selectedPlan, setSelectedPlan] = useState<"STUDY" | "PASS">(planParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webviewUrl, setWebviewUrl] = useState<string | null>(null);
  const [showWebview, setShowWebview] = useState(false);

  const plan = PLANS[selectedPlan];
  const amount = selectedPlan === "STUDY" ? 2.99 : 5.99;

  async function getToken() {
    try {
      return await SecureStore.getItemAsync("pass_access_token");
    } catch {
      return null;
    }
  }

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("You must be logged in to upgrade");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API}/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        // Store reference for later
        try {
          await SecureStore.setItemAsync("paynow_ref", data.paynowRef);
        } catch {}
        setWebviewUrl(data.redirectUrl);
        setShowWebview(true);
      } else {
        setError(data.error || "Failed to initiate payment");
        setLoading(false);
      }
    } catch (err) {
      setError((err as Error)?.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleWebviewNavigationStateChange = (newNavState: { url: string }) => {
    const { url } = newNavState;

    // Check if redirected to success or cancel page
    if (url.includes("/payments/success")) {
      setShowWebview(false);
      setWebviewUrl(null);
      // Navigate to success screen
      router.push({
        pathname: "/payment-success" as never,
      });
    } else if (url.includes("/payments/cancel")) {
      setShowWebview(false);
      setWebviewUrl(null);
      // Navigate to cancel screen
      router.push({
        pathname: "/payment-cancel" as never,
      });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? "#F3F4F6" : "transparent",
          })}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color="#374151" />
        </Pressable>
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Upgrade your plan</Text>
          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Choose a plan and start studying</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        {/* Plan selector */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          {(["STUDY", "PASS"] as const).map((planKey) => {
            const p = PLANS[planKey];
            const isSelected = selectedPlan === planKey;
            return (
              <Pressable
                key={planKey}
                onPress={() => setSelectedPlan(planKey)}
                style={{
                  borderWidth: 2,
                  borderColor: isSelected ? BRAND : "#E5E7EB",
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: isSelected ? "#EEF2FF" : "#FFFFFF",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: planKey === "PASS" ? "#FEF3C7" : "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                    <HugeiconsIcon icon={p.icon} size={20} color={p.color} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: BRAND }}>{p.price}</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Order summary */}
        <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 12 }}>Order summary</Text>
          <View style={{ gap: 10, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>{plan.name} plan</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>${amount.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>Billing period</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>1 month</Text>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>Total</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827" }}>USD {amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Features */}
        <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 12 }}>What's included</Text>
          <View style={{ gap: 10 }}>
            {plan.features.map((feature, idx) => (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 10, color: "#FFFFFF", fontWeight: "700" }}>✓</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: "#111827" }}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Error message */}
        {error && (
          <View style={{ backgroundColor: "#FEE2E2", borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, color: "#DC2626" }}>{error}</Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          onPress={handleCheckout}
          disabled={loading}
          style={({ pressed }) => ({
            backgroundColor: loading ? "#A5B4FC" : BRAND,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            marginBottom: 12,
            opacity: pressed && !loading ? 0.9 : 1,
          })}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>
              Pay now
            </Text>
          )}
        </Pressable>

        <Text style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center" }}>
          You'll be redirected to Paynow to complete your payment securely.
        </Text>
      </ScrollView>

      {/* WebView Modal for Paynow */}
      <Modal visible={showWebview} animationType="slide" onRequestClose={() => setShowWebview(false)}>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", backgroundColor: "#FFFFFF" }}>
            <Pressable
              onPress={() => setShowWebview(false)}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? "#F3F4F6" : "transparent",
              })}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color="#374151" />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 }}>Paynow Payment</Text>
          </View>

          {webviewUrl && (
            <WebView
              source={{ uri: webviewUrl }}
              onNavigationStateChange={handleWebviewNavigationStateChange}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator size="large" color={BRAND} />
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
