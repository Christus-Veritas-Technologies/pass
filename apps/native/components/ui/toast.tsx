/**
 * Toast notification component — react-native-reusables style.
 * Uses MotiView for animate-in/out. Pair with useToast() hook.
 */
import * as React from "react";
import { Text } from "react-native";
import { MotiView } from "moti";
import { CheckCircle, XCircle } from "@vuduc0801/react-native-phosphor-icons";

export type ToastVariant = "success" | "error";

interface ToastProps {
  visible: boolean;
  message: string;
  variant: ToastVariant;
}

const CONFIG: Record<ToastVariant, { bg: string; border: string }> = {
  success: { bg: "#14532D", border: "#166534" },
  error:   { bg: "#7F1D1D", border: "#991B1B" },
};

export function Toast({ visible, message, variant }: ToastProps) {
  const { bg, border } = CONFIG[variant];
  const Icon = variant === "success" ? CheckCircle : XCircle;

  return (
    <MotiView
      animate={{ opacity: visible ? 1 : 0, translateY: visible ? 0 : 14 }}
      transition={{ type: "timing", duration: 220 }}
      pointerEvents={visible ? "box-none" : "none"}
      style={{
        position: "absolute",
        bottom: 40,
        left: 20,
        right: 20,
        zIndex: 999,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 12,
      }}
    >
      <Icon size={18} color="#fff" weight="bold" />
      <Text style={{ flex: 1, color: "#fff", fontSize: 13, fontWeight: "500", lineHeight: 18 }}>
        {message}
      </Text>
    </MotiView>
  );
}

export interface ToastState {
  visible: boolean;
  variant: ToastVariant;
  message: string;
}

const HIDDEN: ToastState = { visible: false, variant: "success", message: "" };

export function useToast(durationMs = 3500) {
  const [state, setState] = React.useState<ToastState>(HIDDEN);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = React.useCallback((variant: ToastVariant, message: string) => {
    clearTimeout(timer.current);
    setState({ visible: true, variant, message });
    timer.current = setTimeout(() => setState((s) => ({ ...s, visible: false })), durationMs);
  }, [durationMs]);

  const hide = React.useCallback(() => {
    clearTimeout(timer.current);
    setState((s) => ({ ...s, visible: false }));
  }, []);

  React.useEffect(() => () => clearTimeout(timer.current), []);

  return { toastState: state, show, hide };
}
