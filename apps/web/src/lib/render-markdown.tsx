import { cn } from "@/lib/utils";

/** Renders a run of text that may contain **bold**, *italic*, and `code` spans. */
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code key={i} className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">
              {part.slice(1, -1)}
            </code>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/**
 * Renders AI-generated markdown text as structured React elements.
 *
 * Supports: # / ## / ### headings, **bold**, *italic*, `code`,
 * - / * / • bullet lists, 1. numbered lists, blank-line paragraph breaks.
 *
 * Safe to use while streaming — partial lines are handled gracefully.
 */
export function MarkdownContent({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const elements: React.ReactNode[] = [];
  let bulletItems: string[] = [];
  let numberedItems: string[] = [];
  let key = 0;

  function flushBullets() {
    if (!bulletItems.length) return;
    elements.push(
      <ul key={key++} className="space-y-1 pl-1 my-1">
        {bulletItems.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
            <span className="text-sm leading-relaxed">
              <InlineText text={item} />
            </span>
          </li>
        ))}
      </ul>,
    );
    bulletItems = [];
  }

  function flushNumbered() {
    if (!numberedItems.length) return;
    elements.push(
      <ol key={key++} className="space-y-1 pl-5 my-1 list-decimal">
        {numberedItems.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">
            <InlineText text={item} />
          </li>
        ))}
      </ol>,
    );
    numberedItems = [];
  }

  for (const line of text.split("\n")) {
    if (line.startsWith("### ")) {
      flushBullets(); flushNumbered();
      elements.push(
        <h3 key={key++} className="text-sm font-semibold mt-3 mb-0.5 first:mt-0">
          <InlineText text={line.slice(4)} />
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flushBullets(); flushNumbered();
      elements.push(
        <h2 key={key++} className="text-sm font-bold mt-4 mb-1 first:mt-0">
          <InlineText text={line.slice(3)} />
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flushBullets(); flushNumbered();
      elements.push(
        <h1 key={key++} className="text-base font-bold mt-4 mb-1 first:mt-0">
          <InlineText text={line.slice(2)} />
        </h1>,
      );
    } else if (/^[-*•]\s+/.test(line)) {
      flushNumbered();
      bulletItems.push(line.replace(/^[-*•]\s+/, ""));
    } else if (/^\d+\.\s+/.test(line)) {
      flushBullets();
      numberedItems.push(line.replace(/^\d+\.\s+/, ""));
    } else if (line.trim() === "") {
      flushBullets(); flushNumbered();
      // blank lines just provide vertical rhythm via space-y
    } else {
      flushBullets(); flushNumbered();
      elements.push(
        <p key={key++} className="text-sm leading-relaxed">
          <InlineText text={line} />
        </p>,
      );
    }
  }

  flushBullets();
  flushNumbered();

  return (
    <div className={cn("space-y-1.5", className)}>
      {elements}
    </div>
  );
}
