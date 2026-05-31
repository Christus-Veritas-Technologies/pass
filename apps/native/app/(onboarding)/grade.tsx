import { Image } from "expo-image";
import * as SecureStore from "expo-secure-store";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiUpdateProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const BRAND = "#4F46E5";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - 10) / 2;
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.30;

const GRADE_SECTIONS = [
  { label: "Primary", grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7"] },
  { label: "O-Level", grades: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { label: "A-Level", grades: ["Form 5", "Form 6"] },
] as const;

const HERO_IMAGE = require("../../assets/onboarding/welcome_2.jpg") as number;

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
    // Mark the post-signin onboarding as completed so it never shows again
    await SecureStore.setItemAsync("signin_onboarding_shown", "true");
    router.replace("/(drawer)/(tabs)/home");
  }

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
          </View>
        </MotiView>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>

          {/* Progress dots (step 2 of 2) */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 300, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
            style={{ flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 24 }}
          >
            {[0, 1].map((i) => (
              <MotiView
                key={i}
                animate={{ width: i === 1 ? 20 : 6, backgroundColor: i === 1 ? BRAND : "#D1D5DB" }}
                transition={{ type: "timing", duration: 200 }}
                style={{ height: 6, borderRadius: 3 }}
              />
            ))}
          </MotiView>

          {/* Heading */}
          <MotiView
            from={{ opacity: 0, translateY: 18 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 300, delay: 80, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
            style={{ marginBottom: 28 }}
          >
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>
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
            style={{ gap: 20, marginBottom: 32 }}
          >
            {GRADE_SECTIONS.map((section, sectionIdx) => (
              <MotiView
                key={section.label}
                from={{ opacity: 0, translateX: -12 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: "timing", duration: 260, delay: 200 + sectionIdx * 100, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
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
                        transition={{ type: "timing", duration: 140, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
                        style={{
                          width: CARD_WIDTH,
                          height: 54,
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
                          <Text style={{ fontSize: 14, fontWeight: "600", color: active ? "#FFFFFF" : "#111827" }}>
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

          {/* CTA */}
          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 280, delay: 500, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
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
      </ScrollView>
    </SafeAreaView>
  );
}
