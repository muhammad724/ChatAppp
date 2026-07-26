// ============================================================================
// MessageInput Component - Chat Message Input with Emoji & File Support
// ============================================================================

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/src/lib/utils";
import { Send, Smile } from "lucide-react";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(() => import("./EmojiPicker"), {
  loading: () => null,
  ssr: false,
});

interface MessageInputProps {
  onSend: (content: string) => void | Promise<void>;
  onTyping: () => void;
  onStopTyping: () => void;
  className?: string;
  placeholder?: string;
}

export default function MessageInput({
  onSend,
  onTyping,
  onStopTyping,
  className,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showEmojiPicker) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const handleSend = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await onSend(trimmed);
      setMessage("");
      setShowEmojiPicker(false);

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    } catch {
      inputRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  }, [isSending, message, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    onTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-[#eef7f3] px-4 pb-5 pt-2",
        className
      )}
    >
      {showEmojiPicker && (
        <div className="absolute bottom-full left-4 z-10 mb-2">
          <EmojiPicker onSelect={handleEmojiSelect} />
        </div>
      )}

      <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-full bg-white p-2 shadow-sm shadow-black/5">
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          aria-label="Open emoji picker"
          aria-pressed={showEmojiPicker}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95",
            showEmojiPicker
              ? "bg-[#eef7f3] text-black"
              : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <Smile className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            aria-label="Message input"
            className="w-full resize-none rounded-xl border-0 bg-transparent px-2 py-2 text-sm text-black placeholder-[#a3a8a4] outline-none ring-0 focus:outline-none focus:ring-0"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!message.trim() || isSending}
          aria-label="Send message"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90",
            message.trim() && !isSending
              ? "rounded-full bg-black text-white shadow-md shadow-black/15 hover:scale-105 hover:shadow-lg"
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-700"
          )}
        >
          <Send className={cn("h-5 w-5", isSending && "animate-pulse")} />
        </button>
      </div>
    </div>
  );
}
