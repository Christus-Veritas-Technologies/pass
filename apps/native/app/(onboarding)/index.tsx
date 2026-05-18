import { BarChart01Icon, CheckmarkCircle01Icon, File01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BRAND = "#4F46E5";

const FEATURES = [
  { icon: File01Icon, text: "Past papers matched to your grade" },
  { icon: CheckmarkCircle01Icon, text: "AI marking against the ZIMSEC scheme" },
  { icon: BarChart01Icon, text: "Track your progress question by question" },
];

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {[0, 1].map((i) => (
        <MotiView
          key={i}
          animate={{ width: i === step ? 20 : 6, backgroundColor: i === step ? BRAND : "#D1D5DB" }}
          transition={{ type: "timing", duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
          style={{ height: 6, borderRadius: 3 }}
        />
      ))}
    </View>
  );
}

export default function OnboardingWelcome() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const firstName = name?.split(" ")[0] ?? "there";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36 }}>

        {/* Progress */}
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}>
          <ProgressDots step={0} />
        </MotiView>

        {/* Logo + Greeting */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 220, delay: 80, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
          style={{ marginTop: 48 }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 26, lineHeight: 30 }}>P</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>
            Hi, {firstName}.
          </Text>
          <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 6, lineHeight: 24 }}>
            Let&apos;s personalise Pass for you.
          </Text>
        </MotiView>

        {/* Features */}
        <View style={{ marginTop: 44, gap: 20 }}>
          {FEATURES.map((f, i) => (
            <MotiView
              key={f.text}
              from={{ opacity: 0, translateX: -12 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: "timing", duration: 220, delay: 200 + i * 80, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" }}>
                <HugeiconsIcon icon={f.icon} size={20} color={BRAND} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: "#374151", lineHeight: 22 }}>{f.text}</Text>
            </MotiView>
          ))}
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 220, delay: 480, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
        >
          <Button onPress={() => router.push({ pathname: "/(onboarding)/grade", params: { name } })}>
            Get started
          </Button>
        </MotiView>

      </View>
    </SafeAreaView>
  );
}
