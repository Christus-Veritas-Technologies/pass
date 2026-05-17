import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { apiUpdateProfile } from "@/lib/auth";

const BRAND = "#4F46E5";
const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 24 * 2 - 10) / 2;

const GRADE_SECTIONS = [
  { label: "O-Level", grades: ["Form 1", "Form 2", "Form 3", "Form 4"] },
  { label: "A-Level", grades: ["Form 5", "Form 6"] },
] as const;

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {[0, 1].map((i) => (
        <MotiView
          key={i}
          animate={{ width: i === step ? 20 : 6, backgroundColor: i === step ? BRAND : "#D1D5DB" }}
          transition={{ type: "timing", duration: 200 }}
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
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36 }}>

        {/* Progress */}
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 300 }}>
          <ProgressDots step={1} />
        </MotiView>

        {/* Heading */}
        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 60 }}
          style={{ marginTop: 40, marginBottom: 32 }}
        >
          <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827", letterSpacing: -0.5 }}>
            What grade are you in?
          </Text>
          <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 6, lineHeight: 22 }}>
            We&apos;ll show past papers matched to your level.
          </Text>
        </MotiView>

        {/* Grade grid */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400, delay: 140 }}
          style={{ gap: 20 }}
        >
          {GRADE_SECTIONS.map((section) => (
            <View key={section.label}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#9CA3AF", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>
                {section.label}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {section.grades.map((grade) => {
                  const active = selected === grade;
                  return (
                    <Pressable
                      key={grade}
                      onPress={() => setSelected(grade)}
                      style={{
                        width: CARD_WIDTH,
                        height: 58,
                        borderRadius: 14,
                        borderWidth: active ? 0 : 1.5,
                        borderColor: "#E5E7EB",
                        backgroundColor: active ? BRAND : "#FAFAFA",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: active ? "#FFFFFF" : "#111827",
                      }}>
                        {grade}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </MotiView>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 300, delay: 320 }}
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
