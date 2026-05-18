import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BRAND = "#4F46E5";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <HugeiconsIcon icon={AlertCircleIcon} size={28} color="#9CA3AF" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 6 }}>Page not found</Text>
          <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center", marginBottom: 24 }}>
            The page you're looking for doesn't exist.
          </Text>
          <Link href="/" asChild>
            <Pressable style={{ backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>Go home</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </>
  );
}
