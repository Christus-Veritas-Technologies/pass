import { BarChart01Icon, CheckmarkCircle01Icon, File01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";

const BRAND = "#4F46E5";

const FEATURES = [
  { icon: File01Icon,            text: "Past papers matched to your grade" },
  { icon: CheckmarkCircle01Icon, text: "AI marking against the ZIMSEC scheme" },
  { icon: BarChart01Icon,        text: "Track your progress question by question" },
];

const BUBBLES = [
  {
    source: require("../../assets/onboarding/welcome_1.jpg"),
    size: 96,
    pos: { right: -8, top: 130 },
    delay: 0,
    duration: 3000,
    drift: 20,
  },
  {
    source: require("../../assets/onboarding/welcome_2.jpg"),
    size: 68,
    pos: { left: -12, top: 220 },
    delay: 900,
    duration: 2600,
    drift: 14,
  },
  {
    source: require("../../assets/onboarding/welcome_3.jpg"),
    size: 50,
    pos: { right: 14, top: 300 },
    delay: 1700,
    duration: 3400,
    drift: 10,
  },
];

function FloatingBubble({
  source,
  size,
  pos,
  delay,
  duration,
  drift,
}: {
  source: ReturnType<typeof require>;
  size: number;
  pos: object;
  delay: number;
  duration: number;
  drift: number;
}) {
  return (
    <MotiView
      from={{ translateY: 0, opacity: 0.75 }}
      animate={{ translateY: -drift, opacity: 0.95 }}
      transition={{
        type: "timing",
        duration,
        loop: true,
        repeatReverse: true,
        delay,
        easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
      }}
      style={[{ position: "absolute" }, pos]}
    >
      <Image
        source={source}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2.5,
          borderColor: "rgba(229, 231, 235, 0.9)",
        }}
      />
    </MotiView>
  );
}

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

      {/* Floating image bubbles — background layer */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {BUBBLES.map((b, i) => (
          <FloatingBubble key={i} {...b} />
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36 }}>

        {/* Progress dots */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 300, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
        >
          <ProgressDots step={0} />
        </MotiView>

        {/* App icon + name + greeting */}
        <MotiView
          from={{ opacity: 0, translateY: 22 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300, delay: 80, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
          style={{ marginTop: 44 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <View style={{
              width: 54, height: 54, borderRadius: 15,
              backgroundColor: BRAND,
              alignItems: "center", justifyContent: "center",
              shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
            }}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 28, lineHeight: 32 }}>P</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827", letterSpacing: -0.5 }}>Pass</Text>
          </View>

          <Text style={{ fontSize: 30, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>
            Hi, {firstName}.
          </Text>
          <Text style={{ fontSize: 16, color: "#6B7280", marginTop: 6, lineHeight: 25 }}>
            Let&apos;s personalise{" "}
            <Text style={{ color: BRAND, fontWeight: "700" }}>Pass</Text>
            {" "}for you.
          </Text>
        </MotiView>

        {/* Feature rows */}
        <View style={{ marginTop: 40, gap: 18 }}>
          {FEATURES.map((f, i) => (
            <MotiView
              key={f.text}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: "timing", duration: 280, delay: 200 + i * 110, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View style={{
                width: 42, height: 42, borderRadius: 13,
                backgroundColor: "#EEF2FF",
                alignItems: "center", justifyContent: "center",
              }}>
                <HugeiconsIcon icon={f.icon} size={20} color={BRAND} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: "#374151", lineHeight: 22 }}>{f.text}</Text>
            </MotiView>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        {/* CTA */}
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 540, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
        >
          <Button onPress={() => router.push({ pathname: "/(onboarding)/grade", params: { name } })}>
            Get started
          </Button>
        </MotiView>

      </View>
    </SafeAreaView>
  );
}
