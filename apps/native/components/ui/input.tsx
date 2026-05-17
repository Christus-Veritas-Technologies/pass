import * as React from "react";
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, error, containerClassName, style, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);

    const borderColor = error
      ? "#EF4444"
      : focused
        ? "#4F46E5"
        : "#E5E7EB";

    const borderWidth = focused || error ? 2 : 1;

    return (
      <View className={containerClassName}>
        {label && (
          <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
        )}
        <TextInput
          ref={ref}
          style={[
            {
              height: 52,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth,
              borderColor,
              backgroundColor: "#FFFFFF",
              fontSize: 15,
              color: "#111827",
            },
            style,
          ]}
          placeholderTextColor="#9CA3AF"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <Text className="text-xs text-red-500 mt-1.5">{error}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = "Input";
