import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from "react-native";

const buttonVariants = cva(
  "h-[52px] flex-row items-center justify-center rounded-[12px] px-6 active:opacity-80",
  {
    variants: {
      variant: {
        default: "bg-[#4F46E5]",
        outline: "border-2 border-[#4F46E5] bg-transparent",
        ghost: "bg-transparent",
        destructive: "bg-red-500",
        white: "bg-white border border-gray-200",
        success: "bg-emerald-600",
      },
      size: {
        default: "h-[52px]",
        sm: "h-11 rounded-[10px] px-4",
        lg: "h-14 rounded-[14px] px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const textVariants = cva("text-[15px] font-semibold", {
  variants: {
    variant: {
      default: "text-white",
      outline: "text-[#4F46E5]",
      ghost: "text-[#4F46E5]",
      destructive: "text-white",
      white: "text-gray-800",
      success: "text-white",
    },
  },
  defaultVariants: { variant: "default" },
});

interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  variant,
  size,
  loading,
  disabled,
  children,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      // @ts-expect-error — className works via uniwind
      className={buttonVariants({ variant, size, className })}
      disabled={isDisabled}
      style={{ opacity: isDisabled ? 0.6 : 1 }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "default" || variant === "destructive" || variant === "success" ? "#fff" : "#4F46E5"} />
      ) : typeof children === "string" ? (
        // @ts-expect-error — className works via uniwind
        <Text className={textVariants({ variant, className: textClassName })}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
