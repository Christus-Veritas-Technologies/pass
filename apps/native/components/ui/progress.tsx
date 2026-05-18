import * as React from "react";
import { View, type ViewProps } from "react-native";

interface ProgressProps extends ViewProps {
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function Progress({
  value,
  color = "#4F46E5",
  trackColor = "#E5E7EB",
  height = 6,
  style,
  ...props
}: ProgressProps) {
  const pct = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <View
      style={[{
        backgroundColor: trackColor,
        borderRadius: height / 2,
        height,
        overflow: "hidden",
      }, style]}
      {...props}
    >
      <View
        style={{
          height: "100%",
          width: pct,
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
