import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useState } from "react";
import { Dimensions, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUpdateProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const BRAND = "#4F46E5";
const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 24 * 2 - 10) / 2;

const GRADE_SECTIONS = [
  { label: "O-Level", grades: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { label: "A-Level", grades: ["Form 5", "Form 6"] },
] as const;

const BUBBLES = [
  {
    source: require("../../assets/onboarding/grade_1.jpg"),
    size: 88,
    pos: { right: -10, top: 100 },
    delay: 200,
    duration: 3200,
    drift: 18,
  },
  {
    source: require("../../assets/onboarding/grade_2.jpg"),
    size: 62,
    pos: { left: -8, top: 200 },
    delay: 1100,
    duration: 2700,
    drift: 13,
  },
  {
    source: require("../../assets/onboarding/grade_3.jpg"),
    size: 46,
    pos: { right: 20, top: 310 },
    delay: 2000,
    duration: 3600,
    drift: 9,
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

export default function OnboardingGrade() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    try {
      await apiUpdateProfile({ grade: selected });
    } catch {
      // Non-blocking — proceed even if the save fails; can retry from profile
    } finally {
      setLoading(false);
    }
    router.replace("/(drawer)/(tabs)/home");
  }

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
          <ProgressDots step={1} />
        </MotiView>

        {/* App icon + heading */}
        <MotiView
          from={{ opacity: 0, translateY: 22 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 300, delay: 60, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
          style={{ marginTop: 36, marginBottom: 28 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: BRAND,
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18, lineHeight: 22 }}>P</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#111827", letterSpacing: -0.3 }}>Pass</Text>
          </View>

          <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>
            What grade are you in?
          </Text>
          <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 6, lineHeight: 22 }}>
            <Text style={{ color: BRAND, fontWeight: "700" }}>Pass</Text>
            {" "}will show past papers matched to your level.
          </Text>
        </MotiView>

        {/* Grade grid */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 160, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
          style={{ gap: 20 }}
        >
          {GRADE_SECTIONS.map((section, sectionIdx) => (
            <MotiView
              key={section.label}
              from={{ opacity: 0, translateX: -12 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: "timing", duration: 260, delay: 200 + sectionIdx * 120, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
            >
              <Text style={{
                fontSize: 11, fontWeight: "700", color: "#9CA3AF",
                letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10,
              }}>
                {section.label}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {section.grades.map((grade) => {
                  const active = selected === grade;
                  return (
                    <MotiView
                      key={grade}
                      animate={{
                        scale: active ? 1.03 : 1,
                        backgroundColor: active ? BRAND : "#FAFAFA",
                      }}
                      transition={{ type: "timing", duration: 150, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
                      style={{
                        width: CARD_WIDTH,
                        height: 58,
                        borderRadius: 14,
                        borderWidth: active ? 0 : 1.5,
                        borderColor: "#E5E7EB",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Pressable
                        onPress={() => setSelected(grade)}
                        style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: "600", color: active ? "#FFFFFF" : "#111827" }}>
                          {grade}
                        </Text>
                      </Pressable>
                    </MotiView>
                  );
                })}
              </View>
            </MotiView>
          ))}
        </MotiView>

        <View style={{ flex: 1 }} />

        {/* CTA */}
        <MotiView
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 480, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
        >
          <Button
            loading={loading}
            disabled={!selected}
            onPress={handleContinue}
          >
            Start studying
          </Button>
        </MotiView>

      </View>
    </SafeAreaView>
  );
}
