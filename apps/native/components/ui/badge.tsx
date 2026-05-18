import * as React from "react";
import { Text, View, type ViewProps } from "react-native";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

interface BadgeProps extends ViewProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  textStyle?: object;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  default:     { bg: "#EEF2FF", text: "#4F46E5" },
  secondary:   { bg: "#F3F4F6", text: "#6B7280" },
  success:     { bg: "#DCFCE7", text: "#059669" },
  warning:     { bg: "#FEF3C7", text: "#D97706" },
  destructive: { bg: "#FEE2E2", text: "#DC2626" },
  outline:     { bg: "transparent", text: "#374151", border: "#E5E7EB" },
};

export function Badge({ children, variant = "default", style, textStyle, ...props }: BadgeProps) {
  const colors = VARIANT_STYLES[variant];
  return (
    <View
      style={[{
        backgroundColor: colors.bg,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
        ...(colors.border ? { borderWidth: 1, borderColor: colors.border } : {}),
      }, style]}
      {...props}
    >
      <Text style={[{ fontSize: 12, fontWeight: "600", color: colors.text }, textStyle]}>
        {children}
      </Text>
    </View>
  );
}
