import * as React from "react";
import { Text, type TextProps } from "react-native";

interface LabelProps extends TextProps {
  children: React.ReactNode;
}

export function Label({ children, style, ...props }: LabelProps) {
  return (
    <Text
      style={[{ fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 6 }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}
