// ============================================================================
// EmojiPicker Component - Wrapper for emoji-picker-react
// ============================================================================

"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamic import of emoji-picker-react
const Picker = dynamic(
  () => import("emoji-picker-react").then((mod) => ({ default: mod.default })),
  { ssr: false }
);

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const handleEmojiClick = useCallback(
    (emojiObject: { emoji: string }) => {
      if (emojiObject?.emoji) {
        onSelect(emojiObject.emoji);
      }
    },
    [onSelect]
  );

  return (
<div className="rounded-xl bg-white shadow-xl shadow-black/10 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
      <Picker onEmojiClick={handleEmojiClick} />
    </div>
  );
}

