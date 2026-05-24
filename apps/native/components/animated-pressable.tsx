import * as React from "react";
import { useRef } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface AnimatedPressableProps extends Omit<PressableProps, "style" | "children"> {
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function AnimatedPressable({
  children,
  containerStyle,
  style,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={(e) => {
        Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }).start();
        onPressOut?.(e);
      }}
      style={containerStyle}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
