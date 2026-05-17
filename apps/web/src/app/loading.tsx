import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Image src="/icon.png" alt="Pass" width={48} height={48} className="rounded-2xl" />
        <span className="absolute -bottom-1 -right-1 block h-3 w-3 rounded-full border-2 border-background bg-primary animate-pulse" />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
