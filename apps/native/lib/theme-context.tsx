import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Colors, type ColorScheme, type ThemePreference } from "./theme";

const STORAGE_KEY = "pass_theme_preference";

interface ThemeContextValue {
  /** Resolved color scheme — always "light" or "dark", never "system" */
  colorScheme: ColorScheme;
  /** Raw preference saved by the user */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  colors: (typeof Colors)["light"];
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: "light",
  preference: "system",
  setPreference: () => {},
  colors: Colors.light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setPreferenceState(val);
      }
    });
  }, []);

  function setPreference(p: ThemePreference) {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }

  const colorScheme: ColorScheme = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  const colors = Colors[colorScheme];

  return (
    <ThemeContext.Provider value={{ colorScheme, preference, setPreference, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
