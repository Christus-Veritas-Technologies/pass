import * as SecureStore from "expo-secure-store";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useRef, useState } from "react";
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
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.50;
const ONBOARDING_KEY = "onboarding_complete";

const SLIDES = [
  {
    key: "welcome",
    image: require("../assets/onboarding/welcome_1.jpg") as number,
    badge: "Welcome to Pass",
    title: "Study smarter,\nnot harder",
    description:
      "Pass adapts to your learning style. Get AI-powered feedback in Guide mode or see full worked solutions in Free mode.",
    accent: "#4F46E5",
  },
  {
    key: "resources",
    image: require("../assets/onboarding/welcome_2.jpg") as number,
    badge: "ZIMSEC Ready",
    title: "All your past\npapers in one place",
    description:
      "Access O-Level and A-Level past papers, marking guides, and syllabi for every subject — all for free.",
    accent: "#059669",
  },
  {
    key: "projects",
    image: require("../assets/onboarding/welcome_3.jpg") as number,
    badge: "Save Time",
    title: "Projects done\nin seconds",
    description:
      "Generate structured study guides for any topic in seconds. AI writes the outline — you make it yours.",
    accent: "#7C3AED",
  },
];

function Dot({ active, color }: { active: boolean; color: string }) {
  return (
    <MotiView
      animate={{
        width: active ? 24 : 8,
        backgroundColor: active ? color : "#D1D5DB",
        opacity: active ? 1 : 0.6,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      style={{ height: 8, borderRadius: 4 }}
    />
  );
}

export default function LaunchScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const slide = SLIDES[activeIndex]!;

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

  async function handleLogin() {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
    router.replace("/(auth)/login");
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* ── Image carousel ─────────────────────────────────────────────────── */}
      <View style={{ height: IMAGE_HEIGHT, overflow: "hidden" }}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <Image
              source={item.image}
              style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}
              contentFit="cover"
              transition={300}
            />
          )}
        />

        {/* Skip — floated over image */}
        {!isLast && (
          <Pressable
            onPress={handleSkip}
            hitSlop={12}
            style={{
              position: "absolute",
              top: 16,
              right: 20,
              backgroundColor: "rgba(0,0,0,0.28)",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: 13, color: "#FFFFFF", fontWeight: "600" }}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* ── Content section below image ─────────────────────────────────────
            justifyContent: "space-between" keeps text at the top and controls
            pinned to the bottom regardless of how many controls are shown.
            This prevents the "mushed" appearance on step 3 when the sign-in
            link joins the dots + button at the bottom. ─────────────────────── */}
      <View style={{ flex: 1, justifyContent: "space-between" }}>

        {/* Animated text content — sits at the top of the flex space */}
        <MotiView
          key={activeIndex}
          from={{ opacity: 0, translateY: 18 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 320, easing: Easing.bezier(0.23, 1, 0.32, 1) }}
          style={{ paddingHorizontal: 28, paddingTop: 28 }}
        >
          {/* Badge */}
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: `${slide.accent}18`,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 5,
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: slide.accent, letterSpacing: 0.3 }}>
              {slide.badge}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: "#111827",
              letterSpacing: -0.8,
              lineHeight: 34,
              marginBottom: 12,
            }}
          >
            {slide.title}
          </Text>
          <Text style={{ fontSize: 15, color: "#6B7280", lineHeight: 24 }}>
            {slide.description}
          </Text>
        </MotiView>

        {/* ── Bottom controls — pinned to the bottom of the flex space ─────── */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
          {/* Progress dots */}
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 16 }}>
            {SLIDES.map((s, i) => (
              <Dot key={s.key} active={i === activeIndex} color={slide.accent} />
            ))}
          </View>

          {/* Primary CTA */}
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => ({
              backgroundColor: pressed ? `${slide.accent}e0` : slide.accent,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.1 }}>
              {isLast ? "Get Started" : "Next"}
            </Text>
          </Pressable>

          {/* Sign-in link — only on last slide, fades in below the button */}
          {isLast && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 200, delay: 100 }}
              style={{ marginTop: 16 }}
            >
              <Pressable onPress={handleLogin} hitSlop={8}>
                <Text style={{ textAlign: "center", fontSize: 14, color: "#6B7280" }}>
                  Already have an account?{" "}
                  <Text style={{ color: slide.accent, fontWeight: "700" }}>Sign in</Text>
                </Text>
              </Pressable>
            </MotiView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
