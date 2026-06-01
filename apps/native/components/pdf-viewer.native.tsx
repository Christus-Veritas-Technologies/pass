import { X } from "@vuduc0801/react-native-phosphor-icons";
import { useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
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
          <Pressable onPress={handleClose} hitSlop={10}>
            <X size={22} color="#FFFFFF" />
          </Pressable>
          <Text numberOfLines={1} style={{ flex: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
            {title ?? "Original paper"}
          </Text>
        </View>
        {error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 }}>
            <Text style={{ color: "#F87171", fontSize: 15, fontWeight: "600", textAlign: "center" }}>
              Could not load PDF
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", lineHeight: 20 }}>
              {error}
            </Text>
            <Pressable
              onPress={handleClose}
              style={{ marginTop: 8, backgroundColor: "#374151", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Close</Text>
            </Pressable>
          </View>
        ) : (
          <Pdf
            source={{ uri, cache: true }}
            page={page && page > 0 ? page : 1}
            trustAllCerts={false}
            style={{ flex: 1, backgroundColor: "#111827" }}
            renderActivityIndicator={() => <ActivityIndicator size="large" color="#FFFFFF" />}
            onError={(err) => {
              const msg = err instanceof Error ? err.message : String(err);
              setError(msg.includes("404") || msg.includes("not found")
                ? "This paper file isn't available on the server yet. Try downloading it instead."
                : "Failed to load the PDF. Check your connection and try again.");
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
