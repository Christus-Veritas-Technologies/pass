import {
  BookOpen01Icon,
  CheckmarkCircle01Icon,
  File01Icon,
  Rocket01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BRAND = "#4F46E5";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_KEY = "onboarding_complete";

const SLIDES = [
  {
    key: "ai",
    icon: SparklesIcon,
    title: "Study with AI",
    description:
      "Use Guide mode to get feedback on your answers, or Free mode to see full worked solutions. Pass adapts to how you learn.",
  },
  {
    key: "resources",
    icon: BookOpen01Icon,
    title: "All your ZIMSEC resources",
    description:
      "Access past papers, marking guides, and syllabi for every subject and grade — O-Level and A-Level.",
  },
  {
    key: "projects",
    icon: Rocket01Icon,
    title: "Get your projects done fast",
    description:
      "Generate heritage studies projects in seconds. Let AI write the structure, then make it your own.",
  },
];

function ProgressDots({ active, count }: { active: number; count: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {Array.from({ length: count }).map((_, i) => (
        <MotiView
          key={i}
          animate={{
            width: i === active ? 22 : 7,
            backgroundColor: i === active ? BRAND : "#D1D5DB",
          }}
          transition={{ type: "timing", duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
          style={{ height: 7, borderRadius: 4 }}
        />
      ))}
    </View>
  );
}

export default function LaunchScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_KEY).then((val) => {
      if (val === "true") {
        // Already seen onboarding — go to auth check
        SecureStore.getItemAsync("pass_access_token").then((token) => {
          if (token) {
            router.replace("/(drawer)/(tabs)/home");
          } else {
            router.replace("/(auth)/login");
          }
        });
      }
    });
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) setActiveIndex(viewableItems[0].index ?? 0);
    },
  ).current;

  async function handleSkip() {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
    router.replace("/(auth)/signup");
  }

  async function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
      router.replace("/(auth)/signup");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Skip */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 24, paddingTop: 8 }}>
        {activeIndex < SLIDES.length - 1 && (
          <Pressable onPress={handleSkip} hitSlop={8}>
            <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "500" }}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item, index }) => (
          <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 16, justifyContent: "center" }}>
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 250, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  backgroundColor: "#EEF2FF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 32,
                }}
              >
                <HugeiconsIcon icon={item.icon} size={36} color={BRAND} />
              </View>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "700",
                  color: "#111827",
                  letterSpacing: -0.5,
                  lineHeight: 34,
                  marginBottom: 16,
                }}
              >
                {item.title}
              </Text>
              <Text style={{ fontSize: 16, color: "#6B7280", lineHeight: 26 }}>
                {item.description}
              </Text>
            </MotiView>
          </View>
        )}
        style={{ flex: 1 }}
      />

      {/* Bottom controls */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 36,
          paddingTop: 20,
          gap: 24,
        }}
      >
        <ProgressDots active={activeIndex} count={SLIDES.length} />

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#4338CA" : BRAND,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          })}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
            {activeIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
