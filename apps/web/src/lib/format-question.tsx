/**
 * Renders ZIMSEC question text with proper structure:
 *   • Instruction headers  ("READ THE FOLLOWING PASSAGE…")
 *   • Passage blocks       ([Passage: …])
 *   • MCQ options          (A … B … C … D … on separate lines)
 *   • Regular paragraphs and bullet/labeled lists
 */

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

  // Strategy 1: options on their own lines  "A …\nB …\nC …"
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
  // Split at positions where a standalone A/B/C/D letter followed by a space appears
  const inlineRe = /(?:^|(?<=\s))([A-D])\s+/g;
  const positions: Array<{ label: string; contentStart: number; matchStart: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(normalized)) !== null) {
    positions.push({
      label: m[1],
      matchStart: m.index,
      contentStart: m.index + m[0].length,
    });
  }

  // Only treat as MCQ if it starts at A and we have at least 2 options
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
  // Match [Passage: …] or [long text in brackets]
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
      // Find where a list starts within the chunk
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

  // 1. Try passage detection
  const passageData = tryExtractPassage(text);
  if (passageData) {
    const blocks: Block[] = [];
    if (passageData.instruction) {
      blocks.push({ kind: "instruction", text: passageData.instruction });
    }
    // Split passage into paragraphs on double-newline or sentence boundaries
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

  // 2. Try MCQ (no passage)
  const mcq = tryExtractMCQ(text);
  if (mcq) {
    const blocks: Block[] = [];
    if (mcq.preamble) blocks.push(...parseChunks(mcq.preamble));
    blocks.push({ kind: "mcq", options: mcq.options });
    return blocks;
  }

  // 3. Fallback: standard paragraph/list parsing
  return parseChunks(text);
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function FormattedQuestionText({ text }: { text: string }) {
  const blocks = parseQuestionText(text);
  if (!blocks.length) return null;

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "instruction":
            return (
              <p key={i} className="font-semibold uppercase tracking-wide text-xs text-muted-foreground">
                {block.text}
              </p>
            );

          case "passage":
            return (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-2 text-sm leading-relaxed max-h-60 overflow-y-auto"
              >
                {block.paragraphs.map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            );

          case "stem":
            return <p key={i} className="font-medium">{block.text}</p>;

          case "mcq":
            return (
              <div key={i} className="space-y-2 pt-1">
                {block.options.map((opt) => (
                  <div
                    key={opt.label}
                    className="flex items-start gap-3 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {opt.label}
                    </span>
                    <span className="pt-0.5">{opt.text}</span>
                  </div>
                ))}
              </div>
            );

          case "paragraph":
            return <p key={i}>{block.text}</p>;

          case "bullet":
            return (
              <ul key={i} className="space-y-1.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );

          case "labeled":
            return (
              <ol key={i} className="space-y-1.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}
