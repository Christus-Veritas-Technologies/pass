import {
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { env } from "@pass/env/native";

const BRAND = "#4F46E5";
const API = env.EXPO_PUBLIC_SERVER_URL;

interface SubscriptionInfo {
  plan: string;
  status: string;
  expiryDate: string;
  daysRemaining: number;
}

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = await SecureStore.getItemAsync("pass_access_token");
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API}/payments/renewal-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data && !data.error) {
          setSubscription(data);
        }
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Success icon */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={40} color="#059669" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" }}>
            Payment successful!
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center" }}>
            Your upgrade is complete. Let's get back to studying.
          </Text>
        </View>

        {/* Subscription details */}
        {loading ? (
          <View style={{ marginVertical: 30, alignItems: "center" }}>
            <ActivityIndicator size="large" color={BRAND} />
          </View>
        ) : subscription ? (
          <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 16 }}>Your subscription</Text>
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>Plan</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827", textTransform: "capitalize" }}>
                  {subscription.plan}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>Status</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#059669", textTransform: "capitalize" }}>
                  {subscription.status}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>Expires</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>
                  {new Date(subscription.expiryDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>Days remaining</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: BRAND }}>
                  {subscription.daysRemaining} days
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Next steps */}
        <View style={{ backgroundColor: "#EEF2FF", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 12 }}>What's next?</Text>
          <View style={{ gap: 10 }}>
            {[
              "Head to the papers section to start studying",
              "Choose a past paper and select GUIDE mode",
              "Review your progress in the dashboard",
            ].map((step, idx) => (
              <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF" }}>{idx + 1}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: "#111827", lineHeight: 18 }}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <Pressable
          onPress={() => router.replace("/(drawer)/(tabs)/papers" as never)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#4338CA" : BRAND,
            borderRadius: 12,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 10,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Start studying</Text>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={() => router.replace("/(drawer)/(tabs)/home" as never)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#F3F4F6" : "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: BRAND }}>Go to dashboard</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
