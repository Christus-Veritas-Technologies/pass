import * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { User } from "@vuduc0801/react-native-phosphor-icons";

interface AvatarProps extends ViewProps {
  size?: number;
  initials?: string;
  color?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export function Avatar({
  size = 44,
  initials,
  color = "#4F46E5",
  textColor = "#FFFFFF",
  borderColor,
  borderWidth = 0,
  style,
  ...props
}: AvatarProps) {
  const fontSize = Math.round(size * 0.34);
  const iconSize = Math.round(size * 0.48);

  return (
    <View
      style={[{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
        ...(borderWidth > 0 ? { borderWidth, borderColor: borderColor ?? "#FFFFFF" } : {}),
      }, style]}
      {...props}
    >
      {initials ? (
        <Text style={{ fontSize, fontWeight: "800", color: textColor, letterSpacing: -0.5 }}>
          {initials}
        </Text>
      ) : (
        <User size={iconSize} color={textColor} />
      )}
    </View>
  );
}
