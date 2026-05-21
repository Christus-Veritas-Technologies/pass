import { StatCounter } from "../_components/stat-counter";

const STATS = [
  { value: 140, suffix: "+", label: "Past papers" },
  { value: 2000, suffix: "+", label: "Marked questions" },
  { value: 55, suffix: "+", label: "ZIMSEC subjects" },
  { value: 3, suffix: "", label: "Levels — A, O, Grade 7" },
];

export function StatsBar() {
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 md:px-10">
        <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:divide-x md:divide-background/10">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col items-center justify-center text-center md:px-6 ${
                i > 0 ? "md:border-background/10" : ""
              }`}
            >
              <StatCounter
                value={s.value}
                suffix={s.suffix}
                className="text-5xl font-semibold tabular-nums tracking-tight md:text-6xl"
              />
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-background/60">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-xs font-medium uppercase tracking-[0.18em] text-background/50">
          Updated for the 2025 syllabus
        </p>
      </div>
    </section>
  );
}
