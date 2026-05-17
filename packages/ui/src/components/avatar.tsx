import { cn } from "@pass/ui/lib/utils";
import * as React from "react";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-11 w-11 text-base" };

export function Avatar({ src, alt, fallback, size = "md", className, ...props }: AvatarProps) {
  const [imgErr, setImgErr] = React.useState(false);
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground",
        sizes[size],
        className,
      )}
      {...props}
    >
      {src && !imgErr ? (
        <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" onError={() => setImgErr(true)} />
      ) : (
        <span>{fallback ?? alt?.[0]?.toUpperCase() ?? "?"}</span>
      )}
    </div>
  );
}
