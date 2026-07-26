// ============================================================================
// TypingIndicator Component - Shows who is typing
// ============================================================================

"use client";

import { cn } from "@/src/lib/utils";
import type { TypingUser } from "@/src/types";

interface TypingIndicatorProps {
  usernames: TypingUser[];
  className?: string;
}

export default function TypingIndicator({
  usernames,
  className,
}: TypingIndicatorProps) {
  if (usernames.length === 0) return null;

  const getText = () => {
    if (usernames.length === 1) {
      return `${usernames[0].username} is typing`;
    }
    if (usernames.length === 2) {
      return `${usernames[0].username} and ${usernames[1].username} are typing`;
    }
    return `${usernames[0].username} and ${usernames.length - 1} others are typing`;
  };

return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-4 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 animate-fade-in",
        className
      )}
    >
      {/* Typing dots animation */}
      <div className="flex items-center gap-1">
        <span className="typing-dot h-2 w-2 rounded-full bg-blue-400 dark:bg-blue-500" />
        <span className="typing-dot h-2 w-2 rounded-full bg-blue-400 dark:bg-blue-500" />
        <span className="typing-dot h-2 w-2 rounded-full bg-blue-400 dark:bg-blue-500" />
      </div>
      <span className="italic">{getText()}</span>
    </div>
  );
}

