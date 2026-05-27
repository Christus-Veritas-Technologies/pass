/**
 * Renders ZIMSEC question text with proper structure (React Native version):
 *   • Instruction headers  ("READ THE FOLLOWING PASSAGE…")
 *   • Passage blocks       ([Passage: …])
 *   • MCQ options          (A … B … C … D … on separate lines)
 *   • Regular paragraphs and bullet/labeled lists
 */
import { Text, View, ScrollView } from "react-native";

const BRAND = "#4F46E5";

// ─── Types ────────────────────────────────────────────────────────────────────

type Block =
  | { kind: "instruction"; text: string }
  | { kind: "passage"; paragraphs: string[] }
  | { kind: "stem"; text: string }
  | { kind: "mcq"; options: Array<{ label: string; text: string }> }
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; items: string[] }
  | { kind: "labeled"; items: string[] };

// ─── MCQ detection ────────────────────────────────────────────────────────────

const MCQ_LINE_RE = /^([A-D])[ \t]+(.+)$/;

function tryExtractMCQ(
  text: string,
): { preamble: string; options: Array<{ label: string; text: string }> } | null {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Strategy 1: options on their own lines  "A …\nB …"
  const lines = normalized.split("\n");
  const optLines: Array<{ label: string; text: string; idx: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(MCQ_LINE_RE);
    if (m) optLines.push({ label: m[1], text: m[2].trim(), idx: i });
  }
  if (optLines.length >= 2) {
    const firstIdx = optLines[0].idx;
    return {
      preamble: lines.slice(0, firstIdx).join("\n").trim(),
      options: optLines.map((o) => ({ label: o.label, text: o.text })),
    };
  }

  // Strategy 2: options inline  "… A option B option C option D option"
  const positions: Array<{ label: string; contentStart: number; matchStart: number }> = [];
  const inlineRe = /(?:^|\s)([A-D])\s+/g;
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(normalized)) !== null) {
    const isWordStart = m.index === 0 || /\s/.test(normalized[m.index]);
    if (isWordStart) {
      const labelIndex = m.index + (m[0].length - m[1].length - 1);
      positions.push({
        label: m[1],
        matchStart: labelIndex,
        contentStart: m.index + m[0].length,
      });
    }
  }

  if (positions.length >= 2 && positions[0].label === "A") {
    const preamble = normalized.slice(0, positions[0].matchStart).trim();
    const options = positions.map((p, i) => {
      const end =
        i + 1 < positions.length ? positions[i + 1].matchStart : normalized.length;
      return { label: p.label, text: normalized.slice(p.contentStart, end).trim() };
    });
    return { preamble, options };
  }

  return null;
}

// ─── Passage detection ────────────────────────────────────────────────────────

function tryExtractPassage(text: string): {
  instruction: string;
  passage: string;
  remainder: string;
} | null {
  const m = text.match(/\[(?:Passage[:\s]*)?([\s\S]+?)\]([\s\S]*)$/);
  if (!m || m[1].trim().length < 60) return null;
  return {
    instruction: text.slice(0, m.index).trim(),
    passage: m[1].trim(),
    remainder: m[2].trim(),
  };
}

// ─── Paragraph / list parser ──────────────────────────────────────────────────

const BULLET_RE = /^[-•]\s+/;
const LABEL_RE = /^(?:\([a-zA-Z0-9ivxlc]+\)|[a-zA-Z0-9]+[.)]\s)/i;

function parseChunks(text: string): Block[] {
  const chunks = text.split(/\n{2,}/);
  const result: Block[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    if (lines.length === 1) {
      result.push({ kind: "paragraph", text: lines[0] });
      continue;
    }

    const bulletCount = lines.filter((l) => BULLET_RE.test(l)).length;
    const labelCount = lines.filter((l) => LABEL_RE.test(l)).length;

    if (bulletCount === lines.length) {
      result.push({ kind: "bullet", items: lines.map((l) => l.replace(BULLET_RE, "").trim()) });
    } else if (labelCount === lines.length) {
      result.push({ kind: "labeled", items: lines });
    } else {
      let splitAt = -1;
      for (let i = 0; i < lines.length; i++) {
        if (BULLET_RE.test(lines[i]) || LABEL_RE.test(lines[i])) {
          splitAt = i;
          break;
        }
      }
      if (splitAt > 0) {
        result.push({ kind: "paragraph", text: lines.slice(0, splitAt).join(" ") });
        const rest = lines.slice(splitAt);
        const allBullet = rest.every((l) => BULLET_RE.test(l));
        result.push(
          allBullet
            ? { kind: "bullet", items: rest.map((l) => l.replace(BULLET_RE, "").trim()) }
            : { kind: "labeled", items: rest },
        );
      } else {
        result.push({ kind: "paragraph", text: lines.join(" ") });
      }
    }
  }
  return result;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

function parseQuestionText(raw: string): Block[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];

  const passageData = tryExtractPassage(text);
  if (passageData) {
    const blocks: Block[] = [];
    if (passageData.instruction) {
      blocks.push({ kind: "instruction", text: passageData.instruction });
    }
    const passageParas = passageData.passage
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    blocks.push({ kind: "passage", paragraphs: passageParas.length ? passageParas : [passageData.passage] });

    if (passageData.remainder) {
      const mcq = tryExtractMCQ(passageData.remainder);
      if (mcq) {
        if (mcq.preamble) blocks.push({ kind: "stem", text: mcq.preamble });
        blocks.push({ kind: "mcq", options: mcq.options });
      } else {
        blocks.push(...parseChunks(passageData.remainder));
      }
    }
    return blocks;
  }

  const mcq = tryExtractMCQ(text);
  if (mcq) {
    const blocks: Block[] = [];
    if (mcq.preamble) blocks.push(...parseChunks(mcq.preamble));
    blocks.push({ kind: "mcq", options: mcq.options });
    return blocks;
  }

  return parseChunks(text);
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function FormattedQuestionText({ text }: { text: string }) {
  const blocks = parseQuestionText(text);
  if (!blocks.length) return null;

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "instruction":
            return (
              <Text
                key={i}
                style={{ fontSize: 11, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                {block.text}
              </Text>
            );

          case "passage":
            return (
              <ScrollView
                key={i}
                style={{ maxHeight: 200, backgroundColor: "#F3F4F6", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {block.paragraphs.map((para, j) => (
                  <Text
                    key={j}
                    style={{ fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: j < block.paragraphs.length - 1 ? 8 : 0 }}
                  >
                    {para}
                  </Text>
                ))}
              </ScrollView>
            );

          case "stem":
            return (
              <Text key={i} style={{ fontSize: 15, fontWeight: "600", color: "#111827", lineHeight: 24 }}>
                {block.text}
              </Text>
            );

          case "mcq":
            return (
              <View key={i} style={{ gap: 8, paddingTop: 4 }}>
                {block.options.map((opt) => (
                  <View
                    key={opt.label}
                    style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#EEF2FF", borderRadius: 10, padding: 10 }}
                  >
                    <View
                      style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>{opt.label}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 14, color: "#1E1B4B", lineHeight: 22, paddingTop: 2 }}>
                      {opt.text}
                    </Text>
                  </View>
                ))}
              </View>
            );

          case "paragraph":
            return (
              <Text key={i} style={{ fontSize: 15, color: "#111827", lineHeight: 24 }}>
                {block.text}
              </Text>
            );

          case "bullet":
            return (
              <View key={i} style={{ gap: 7 }}>
                {block.items.map((item, j) => (
                  <View key={j} style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#9CA3AF", marginTop: 9, flexShrink: 0 }} />
                    <Text style={{ flex: 1, fontSize: 15, color: "#111827", lineHeight: 24 }}>{item}</Text>
                  </View>
                ))}
              </View>
            );

          case "labeled":
            return (
              <View key={i} style={{ gap: 7 }}>
                {block.items.map((item, j) => (
                  <Text key={j} style={{ fontSize: 15, color: "#111827", lineHeight: 24 }}>{item}</Text>
                ))}
              </View>
            );
        }
      })}
    </View>
  );
}
