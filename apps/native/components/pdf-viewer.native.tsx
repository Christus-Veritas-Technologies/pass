import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import Pdf from "react-native-pdf";
import { SafeAreaView } from "react-native-safe-area-context";

export interface PdfViewerProps {
  visible: boolean;
  onClose: () => void;
  uri: string;
  /** 1-based page to open at (e.g. the page a diagram is on). */
  page?: number;
  title?: string;
}

/** Full-screen modal that renders the original past-paper PDF. */
export function PdfViewerModal({ visible, onClose, uri, page, title }: PdfViewerProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#111827" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10}>
            <HugeiconsIcon icon={Cancel01Icon} size={22} color="#FFFFFF" />
          </Pressable>
          <Text numberOfLines={1} style={{ flex: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
            {title ?? "Original paper"}
          </Text>
        </View>
        <Pdf
          source={{ uri, cache: true }}
          page={page && page > 0 ? page : 1}
          trustAllCerts={false}
          style={{ flex: 1, backgroundColor: "#111827" }}
          renderActivityIndicator={() => <ActivityIndicator size="large" color="#FFFFFF" />}
        />
      </SafeAreaView>
    </Modal>
  );
}
