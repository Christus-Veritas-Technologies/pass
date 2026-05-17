import { Link, Stack } from "expo-router";
import { Button, Surface } from "heroui-native";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Container>
        <View className="flex-1 justify-center items-center p-4">
          <Surface variant="secondary" className="items-center p-6 max-w-sm rounded-lg">
            <View className="mb-3">
              <HugeiconsIcon icon={AlertCircleIcon} size={36} color="#64748b" />
            </View>
            <Text className="text-foreground font-medium text-lg mb-1">Page Not Found</Text>
            <Text className="text-muted text-sm text-center mb-4">
              The page you're looking for doesn't exist.
            </Text>
            <Link href="/" asChild>
              <Button size="sm">Go Home</Button>
            </Link>
          </Surface>
        </View>
      </Container>
    </>
  );
}
