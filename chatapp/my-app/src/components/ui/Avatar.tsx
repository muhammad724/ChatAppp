// ============================================================================
// Avatar Component - Reusable User/Group Avatar
// ============================================================================

"use client";

import Image from "next/image";
import { cn, getInitials, stringToColor } from "@/src/lib/utils";
import { useMemo } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

const dotSizeMap = {
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
  xl: "h-4 w-4",
};

export default function Avatar({
  src,
  name,
  size = "md",
  isOnline,
  className,
}: AvatarProps) {
  const initials = useMemo(() => getInitials(name), [name]);
  const bgColor = useMemo(() => stringToColor(name), [name]);

  return (
    <div className={cn("relative inline-flex shrink-0 transition-transform duration-200 hover:scale-105", className)}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size === "sm" ? 32 : size === "md" ? 40 : size === "lg" ? 48 : 64}
          height={size === "sm" ? 32 : size === "md" ? 40 : size === "lg" ? 48 : 64}
          className={cn("rounded-full object-cover ring-2 ring-transparent transition-shadow hover:ring-zinc-200 dark:hover:ring-zinc-700", sizeMap[size])}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full font-medium text-white ring-2 ring-transparent transition-shadow hover:ring-zinc-200 dark:hover:ring-zinc-700",
            sizeMap[size]
          )}
          style={{ backgroundColor: bgColor }}
        >
          {initials}
        </div>
      )}

      {/* Online Indicator */}
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-[2.5px] border-white transition-all duration-300 dark:border-zinc-900",
            dotSizeMap[size],
            isOnline
              ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
              : "bg-zinc-400"
          )}
        />
      )}
    </div>
  );
}

