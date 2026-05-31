import { ChartBar, CheckCircle, File } from "@vuduc0801/react-native-phosphor-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";

const BRAND = "#4F46E5";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.38;

const FEATURES = [
  { Icon: File,        text: "Past papers matched to your grade" },
  { Icon: CheckCircle, text: "AI marking against the ZIMSEC scheme" },
  { Icon: ChartBar,    text: "Track your progress question by question" },
];

// 3 decorative slide images — reuse the welcome carousel assets
const HERO_IMAGE = require("../../assets/onboarding/welcome_1.jpg") as number;

export default function OnboardingWelcome() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const firstName = name?.split(" ")[0] ?? "there";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero image ──────────────────────────────────────────────────── */}
        <MotiView
          from={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 500, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
        >
          <View style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT, overflow: "hidden", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
            <Image
              source={HERO_IMAGE}
              style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}
              contentFit="cover"
              transition={300}
            />
            {/* Gradient overlay so text above the image is readable */}
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, backgroundColor: "transparent" }} />
          </View>
        </MotiView>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>

          {/* Progress dots */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 300, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
            style={{ flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 28 }}
          >
            {[0, 1].map((i) => (
              <MotiView
                key={i}
                animate={{ width: i === 0 ? 20 : 6, backgroundColor: i === 0 ? BRAND : "#D1D5DB" }}
                transition={{ type: "timing", duration: 200 }}
                style={{ height: 6, borderRadius: 3 }}
              />
            ))}
          </MotiView>

          {/* Greeting */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 320, delay: 100, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
            style={{ marginBottom: 32 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: BRAND,
                alignItems: "center", justifyContent: "center",
                shadowColor: BRAND, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
              }}>
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22, lineHeight: 26 }}>P</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", letterSpacing: -0.4 }}>Pass</Text>
            </View>

            <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", letterSpacing: -0.5, lineHeight: 34 }}>
              Hi, {firstName}.
            </Text>
            <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 6, lineHeight: 24 }}>
              Let&apos;s personalise{" "}
              <Text style={{ color: BRAND, fontWeight: "700" }}>Pass</Text>
              {" "}for you.
            </Text>
          </MotiView>

          {/* Feature rows */}
          <View style={{ gap: 16, marginBottom: 36 }}>
            {FEATURES.map((f, i) => (
              <MotiView
                key={f.text}
                from={{ opacity: 0, translateX: -16 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: "timing", duration: 280, delay: 220 + i * 100, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 13,
                  backgroundColor: "#EEF2FF",
                  alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <f.Icon size={20} color={BRAND} />
                </View>
                <Text style={{ flex: 1, fontSize: 15, color: "#374151", lineHeight: 22 }}>{f.text}</Text>
              </MotiView>
            ))}
          </View>

          {/* CTA */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 280, delay: 520, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
          >
            <Button onPress={() => router.push({ pathname: "/(onboarding)/grade", params: { name } })}>
              Get started
            </Button>
          </MotiView>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
