import * as Network from "expo-network";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();

  async function check() {
    const state = await Network.getNetworkStateAsync();
    setIsOffline(!state.isInternetReachable);
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isOffline) return null;

  return (
    <MotiView
      from={{ translateY: -120 }}
      animate={{ translateY: 0 }}
      transition={{ type: "spring", damping: 18, stiffness: 200 }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingTop: insets.top + 12,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: "#1E1B4B",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Image
        source={require("../assets/images/icon.png")}
        style={{ width: 32, height: 32, borderRadius: 8 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.3 }}>
          You're offline
        </Text>
        <Text style={{ fontSize: 12, color: "#A5B4FC", marginTop: 1 }}>
          Check your connection to keep studying
        </Text>
      </View>
      <Pressable
        onPress={check}
        hitSlop={8}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: "#4F46E5",
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#FFFFFF" }}>Refresh</Text>
      </Pressable>
    </MotiView>
  );
}
