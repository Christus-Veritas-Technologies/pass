import {
  AlertCircleIcon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BRAND = "#4F46E5";

export default function PaymentCancelScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {/* Cancel icon */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <HugeiconsIcon icon={AlertCircleIcon} size={40} color="#DC2626" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 8, textAlign: "center" }}>
            Payment cancelled
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center" }}>
            Your payment was not completed. No charges have been made to your account.
          </Text>
        </View>

        {/* What happened */}
        <View style={{ backgroundColor: "#F9FAFB", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 8 }}>What happened?</Text>
          <Text style={{ fontSize: 13, color: "#6B7280", lineHeight: 20 }}>
            You cancelled the payment process at Paynow. If this was accidental, you can try again.
          </Text>
        </View>

        {/* Next steps */}
        <View style={{ backgroundColor: "#FFFBEB", borderRadius: 16, padding: 20, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: "#D97706" }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 10 }}>Next steps:</Text>
          <View style={{ gap: 8 }}>
            {[
              "Review your plan choice and pricing",
              "Try the upgrade again if you're ready",
              "Contact support if you have questions",
            ].map((step, idx) => (
              <Text key={idx} style={{ fontSize: 13, color: "#6B7280" }}>• {step}</Text>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <Pressable
          onPress={() => router.push("/(drawer)/(tabs)/profile" as never)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#4338CA" : BRAND,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Back to profile</Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#F3F4F6" : "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          })}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} color={BRAND} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: BRAND }}>Go back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
