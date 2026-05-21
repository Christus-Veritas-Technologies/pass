export type ColorScheme = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

export interface Colors {
  // Surfaces
  background: string;
  card: string;
  cardSubtle: string;
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textPlaceholder: string;
  // Borders
  border: string;
  borderSubtle: string;
  // Brand
  brand: string;
  brandText: string;
  // Semantic
  success: string;
  successBg: string;
  successBorder: string;
  warning: string;
  warningBg: string;
  warningBorder: string;
  error: string;
  errorBg: string;
  errorBorder: string;
  // Tints used in stat cards
  indigoBg: string;
  indigoBorder: string;
  greenBg: string;
  greenBorder: string;
  orangeBg: string;
  orangeBorder: string;
  purpleBg: string;
  purpleBorder: string;
  // Tab bar
  tabBarBg: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
}

const light: Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  cardSubtle: "#F9FAFB",
  text: "#111827",
  textSecondary: "#374151",
  textTertiary: "#6B7280",
  textPlaceholder: "#9CA3AF",
  border: "#E5E7EB",
  borderSubtle: "#F3F4F6",
  brand: "#4F46E5",
  brandText: "#FFFFFF",
  success: "#059669",
  successBg: "#ECFDF5",
  successBorder: "#6EE7B7",
  warning: "#D97706",
  warningBg: "#FFFBEB",
  warningBorder: "#FCD34D",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
  indigoBg: "#EEF2FF",
  indigoBorder: "#C7D2FE",
  greenBg: "#ECFDF5",
  greenBorder: "#6EE7B7",
  orangeBg: "#FFF7ED",
  orangeBorder: "#FED7AA",
  purpleBg: "#F5F3FF",
  purpleBorder: "#DDD6FE",
  tabBarBg: "#FFFFFF",
  tabBarBorder: "#F3F4F6",
  tabActive: "#4F46E5",
  tabInactive: "#9CA3AF",
};

const dark: Colors = {
  background: "#0F0F11",
  card: "#1A1A1E",
  cardSubtle: "#1A1A1E",
  text: "#F9FAFB",
  textSecondary: "#E5E7EB",
  textTertiary: "#9CA3AF",
  textPlaceholder: "#6B7280",
  border: "#2D2D35",
  borderSubtle: "#222228",
  brand: "#6366F1",
  brandText: "#FFFFFF",
  success: "#34D399",
  successBg: "#052E16",
  successBorder: "#065F46",
  warning: "#FBBF24",
  warningBg: "#1C1407",
  warningBorder: "#78350F",
  error: "#F87171",
  errorBg: "#1F0707",
  errorBorder: "#7F1D1D",
  indigoBg: "#1E1B4B",
  indigoBorder: "#312E81",
  greenBg: "#052E16",
  greenBorder: "#065F46",
  orangeBg: "#1C0A00",
  orangeBorder: "#78350F",
  purpleBg: "#1E1047",
  purpleBorder: "#3B0764",
  tabBarBg: "#0F0F11",
  tabBarBorder: "#2D2D35",
  tabActive: "#6366F1",
  tabInactive: "#6B7280",
};

export const Colors = { light, dark } as const;
