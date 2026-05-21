interface Props {
  quote: string;
  author: string;
  context: string;
}

export function TestimonialCard({ quote, author, context }: Props) {
  return (
    <figure className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-background p-6 md:p-7">
      <blockquote className="font-marketing-serif text-lg italic font-normal leading-snug text-foreground md:text-xl">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-auto">
        <p className="text-sm font-semibold text-foreground">{author}</p>
        <p className="text-xs text-muted-foreground">{context}</p>
      </figcaption>
    </figure>
  );
}
