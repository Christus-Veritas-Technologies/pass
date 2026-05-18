import * as React from "react";
import { Text, View, type TextProps, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  return (
    <View
      style={[{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        overflow: "hidden",
      }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, style, ...props }: CardProps) {
  return (
    <View
      style={[{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardContent({ children, style, ...props }: CardProps) {
  return (
    <View style={[{ padding: 16 }, style]} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ children, style, ...props }: TextProps) {
  return (
    <Text
      style={[{ fontSize: 15, fontWeight: "600", color: "#111827" }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}
