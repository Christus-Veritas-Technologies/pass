import {
  BookOpen01Icon,
  Folder01Icon,
  Home01Icon,
  User01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Tabs } from "expo-router";

const BRAND = "#4F46E5";
const MUTED = "#9CA3AF";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={Home01Icon} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: "Resources",
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={BookOpen01Icon} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={Folder01Icon} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <HugeiconsIcon icon={User01Icon} size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
