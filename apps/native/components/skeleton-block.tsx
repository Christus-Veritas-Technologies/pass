import { MotiView } from "moti";
import { View } from "react-native";

interface Props {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonBlock({ width = "100%", height = 16, borderRadius = 6, style }: Props) {
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ loop: true, type: "timing", duration: 800 }}
      style={[
        {
          width: width as never,
          height,
          borderRadius,
          backgroundColor: "#E5E7EB",
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        padding: 14,
        marginBottom: 10,
        gap: 8,
      }}
    >
      <SkeletonBlock height={13} width="70%" />
      <SkeletonBlock height={11} width="50%" />
      <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
        <SkeletonBlock height={20} width={60} borderRadius={10} />
        <SkeletonBlock height={20} width={50} borderRadius={10} />
      </View>
    </View>
  );
}
