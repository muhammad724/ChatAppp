// ============================================================================
// Conversation Chat Window - Full Chat Interface
// ============================================================================

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  MessageCircle,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Pin,
  X,
} from "lucide-react";
import Link from "next/link";
import Avatar from "@/src/components/ui/Avatar";
import MessageBubble from "@/src/components/chat/MessageBubble";
import MessageInput from "@/src/components/chat/MessageInput";
import { formatDateSeparator, cn } from "@/src/lib/utils";
import type { Conversation, Message } from "@/src/types";

export default function ConversationChatWindow() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [openPanel, setOpenPanel] = useState<"images" | "files" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load the chat initially, then refresh it continuously so messages from
  // other signed-in users appear without a manual reload.
  useEffect(() => {
    let isActive = true;
    let requestInFlight = false;
    const controller = new AbortController();

    const fetchConversation = async (showLoading = false) => {
      if (requestInFlight) return;
      requestInFlight = true;

      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Conversation request failed (${response.status})`);
        }
        const result = await response.json();
        if (isActive && result.success) {
          setConversation(result.data);
          setMessages(result.data.messages || []);
          setIsConnected(true);
        }
      } catch (error) {
        if (
          isActive &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setIsConnected(false);
        }
      } finally {
        requestInFlight = false;
        if (isActive && showLoading) setIsLoading(false);
      }
    };

    if (conversationId) {
      void fetchConversation(true);
      fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
        .then((response) => response.json())
        .then((result) => {
          if (isActive && result.success) setCurrentUserId(result.data.id);
        })
        .catch(() => undefined);
    }

    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && conversationId) {
        void fetchConversation();
      }
    }, 2500);

    return () => {
      isActive = false;
      controller.abort();
      window.clearInterval(refreshTimer);
    };
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (content: string) => {
      setSendError(null);
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            content,
            type: "text",
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to send message");
        }
        setMessages((previous) =>
          previous.some((message) => message.id === result.data.id)
            ? previous
            : [...previous, result.data]
        );
      } catch (error) {
        const message =
          error instanceof TypeError
            ? "Connection lost. Your message was not sent—please try again."
            : error instanceof Error
              ? error.message
              : "Failed to send message";
        setSendError(message);
        throw error;
      }
    },
    [conversationId]
  );

  const handleSendDrawing = useCallback(
    async (drawing: Blob) => {
      setSendError(null);

      try {
        const fileName = `whiteboard-${Date.now()}.png`;
        const uploadData = new FormData();
        uploadData.append(
          "file",
          new File([drawing], fileName, { type: "image/png" })
        );
        uploadData.append("type", "message-image");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.success || !uploadResult.data) {
          throw new Error(uploadResult.error || "Failed to upload drawing");
        }

        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            content: "Whiteboard drawing",
            type: "image",
            attachments: [
              {
                url: uploadResult.data.url,
                type: "image/png",
                name: uploadResult.data.name || fileName,
                size: uploadResult.data.size || drawing.size,
              },
            ],
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to send drawing");
        }

        setMessages((previous) =>
          previous.some((message) => message.id === result.data.id)
            ? previous
            : [...previous, result.data]
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send drawing";
        setSendError(message);
        throw error;
      }
    },
    [conversationId]
  );

  // Get display name and avatar
  const getDisplayInfo = () => {
    if (!conversation) return { name: "Loading...", avatar: null };

    if (conversation.type === "group") {
      return {
        name: conversation.name || "Unnamed Group",
        avatar: conversation.avatar,
      };
    }

    // One-to-one: show the other participant
    const otherParticipant = conversation.participants.find(
      (participant) => participant.userId !== currentUserId
    )?.user;
    return {
      name: otherParticipant?.username || "Unknown",
      avatar: otherParticipant?.avatar || null,
    };
  };

  // Group messages by date
  const groupedMessages = messages.reduce<
    { date: string; messages: Message[] }[]
  >((groups, message) => {
    const dateKey = new Date(message.createdAt).toDateString();
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ date: dateKey, messages: [message] });
    }
    return groups;
  }, []);

  const sharedImages = messages.flatMap((message) =>
    message.attachments.filter((attachment) =>
      attachment.type.startsWith("image/")
    )
  );
  const sharedFiles = messages.flatMap((message) =>
    message.attachments.filter(
      (attachment) => !attachment.type.startsWith("image/")
    )
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3 animate-pulse",
                i % 2 === 0 ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "h-10 w-24 rounded-2xl bg-zinc-200 dark:bg-zinc-700",
                  i % 2 === 0 ? "" : "bg-violet-200 dark:bg-violet-900"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { name, avatar } = getDisplayInfo();

  return (
    <div className="relative flex h-full flex-col bg-[#eef7f3]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 bg-white px-5 py-4">
        <Link
          href="/conversations"
          className="rounded-lg p-1 text-black hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800 lg:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar name={name} src={avatar} size="md" isOnline />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-900 truncate dark:text-white">
            {name}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-[#59605b]">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-[#64c95a]" : "animate-pulse bg-amber-400"
              )}
            />
            {isConnected ? "Online" : "Reconnecting…"}
          </p>
        </div>
<div className="flex items-center gap-2">
  <button
    type="button"
    onClick={() => setIsPinned((pinned) => !pinned)}
    className={cn(
      "rounded-xl p-2 text-black transition hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800",
      isPinned && "bg-violet-100 dark:bg-violet-900/40"
    )}
    aria-label={isPinned ? "Unpin conversation" : "Pin conversation"}
    aria-pressed={isPinned}
  >
    <Pin
      className="h-5 w-5 !text-black dark:!text-white"
      fill={isPinned ? "currentColor" : "none"}
    />
  </button>

  <button
    type="button"
    onClick={() =>
      setOpenPanel((panel) => (panel === "images" ? null : "images"))
    }
    className={cn(
      "rounded-xl p-2 text-black transition hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800",
      openPanel === "images" && "bg-violet-100 dark:bg-violet-900/40"
    )}
    aria-label="View shared images"
    aria-pressed={openPanel === "images"}
  >
    <ImageIcon className="h-5 w-5 !text-black dark:!text-white" />
  </button>

  <button
    type="button"
    onClick={() =>
      setOpenPanel((panel) => (panel === "files" ? null : "files"))
    }
    className={cn(
      "rounded-xl p-2 text-black transition hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800",
      openPanel === "files" && "bg-violet-100 dark:bg-violet-900/40"
    )}
    aria-label="View shared files"
    aria-pressed={openPanel === "files"}
  >
    <FileText className="h-5 w-5 !text-black dark:!text-white" />
  </button>
</div>
