/**
 * UpgradeModal — shown when a plan-limit 402 is returned from the server.
 * Tells the user which quota they've hit and offers a path to upgrade.
 */
import { useRouter } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { PLAN_LIMITS, type PlanKey } from "@pass/pricing";

const BRAND = "#4F46E5";

const FEATURE_LABELS: Record<string, string> = {
  papers: "past papers",
  projects: "AI projects",
  downloads: "paper PDF downloads",
  aiMessages: "AI answers",
  attachments: "file uploads in chat",
};

export interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature: "papers" | "projects" | "downloads" | "aiMessages" | "attachments";
  /** The user's current plan key, e.g. "FREE" | "STUDY" | "PASS" */
  plan: string;
}

export function UpgradeModal({ visible, onClose, feature, plan }: UpgradeModalProps) {
  const router = useRouter();

  const label = FEATURE_LABELS[feature] ?? feature;
  const limits = PLAN_LIMITS[plan as PlanKey];
  const rawLimit = limits?.[feature as keyof typeof limits] as number | undefined;
  const limitStr = rawLimit === undefined || rawLimit === Infinity ? "all" : `all ${rawLimit}`;
  const planLabel = plan === "FREE" ? "Free" : plan === "STUDY" ? "Study" : plan;
  const isLockedFeature = feature === "attachments";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Card — swallow taps so backdrop dismiss doesn't fire */}
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Text style={styles.iconText}>⚡</Text>
          </View>

          <Text style={styles.title}>Upgrade your plan</Text>
          <Text style={styles.body}>
            {isLockedFeature ? (
              <>
                {label[0].toUpperCase() + label.slice(1)} are a paid feature, not available on your{" "}
                <Text style={styles.planName}>{planLabel}</Text> plan.
                Upgrade to attach photos and PDFs to your questions.
              </>
            ) : (
              <>
                You&apos;ve used {limitStr} {label} on your{" "}
                <Text style={styles.planName}>{planLabel}</Text> plan this month.
                Upgrade for higher limits and more features.
              </>
            )}
          </Text>

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            onPress={() => { router.push("/checkout"); onClose(); }}
          >
            <Text style={styles.primaryText}>View plans</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
            onPress={onClose}
          >
            <Text style={styles.secondaryText}>Maybe later</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  iconText: { fontSize: 20 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
    marginBottom: 20,
  },
  planName: {
    fontWeight: "600",
    color: "#374151",
  },
  primaryBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 10,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
