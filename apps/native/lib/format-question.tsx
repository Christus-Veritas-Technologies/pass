import { Text, View } from "react-native";

type TextBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[]; bullet: boolean };

const BULLET_RE = /^[-•*–]\s+/;
const LABEL_RE = /^(?:\([a-zA-Z0-9ivxlc]+\)|[a-zA-Z0-9]+[.)]\s)/i;

function parseQuestionText(raw: string): TextBlock[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return [];

  const chunks = text.split(/\n{2,}/);
  const result: TextBlock[] = [];

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
      result.push({
        kind: "list",
        bullet: true,
        items: lines.map((l) => l.replace(BULLET_RE, "").trim()),
      });
    } else if (labelCount === lines.length) {
      result.push({ kind: "list", bullet: false, items: lines });
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
        const listLines = lines.slice(splitAt);
        const allBullet = listLines.every((l) => BULLET_RE.test(l));
        result.push({
          kind: "list",
          bullet: allBullet,
          items: allBullet ? listLines.map((l) => l.replace(BULLET_RE, "").trim()) : listLines,
        });
      } else {
        result.push({ kind: "paragraph", text: lines.join(" ") });
      }
    }
  }

  return result;
}

export function FormattedQuestionText({ text }: { text: string }) {
  const blocks = parseQuestionText(text);
  if (!blocks.length) return null;

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, i) => {
        if (block.kind === "paragraph") {
          return (
            <Text key={i} style={{ fontSize: 15, color: "#111827", lineHeight: 24 }}>
              {block.text}
            </Text>
          );
        }
        return (
          <View key={i} style={{ gap: 7 }}>
            {block.items.map((item, j) => (
              <View key={j} style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
                {block.bullet && (
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: "#9CA3AF",
                      marginTop: 9,
                      flexShrink: 0,
                    }}
                  />
                )}
                <Text style={{ flex: 1, fontSize: 15, color: "#111827", lineHeight: 24 }}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
