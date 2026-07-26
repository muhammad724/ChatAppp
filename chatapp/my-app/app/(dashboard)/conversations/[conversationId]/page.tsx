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
        <div className="flex items-center gap-1 text-black">
          <button
            type="button"
            onClick={() => setIsPinned((pinned) => !pinned)}
            className={cn(
              "rounded-full p-2 hover:bg-[#f2f5f2]",
              isPinned && "bg-[#eef7f3] text-black"
            )}
            aria-label={isPinned ? "Unpin conversation" : "Pin conversation"}
            aria-pressed={isPinned}
          >
            <Pin className="h-4 w-4" fill={isPinned ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={() =>
              setOpenPanel((panel) => (panel === "images" ? null : "images"))
            }
            className={cn(
              "rounded-full p-2 hover:bg-[#f2f5f2]",
              openPanel === "images" && "bg-[#eef7f3] text-black"
            )}
            aria-label="View shared images"
            aria-pressed={openPanel === "images"}
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setOpenPanel((panel) => (panel === "files" ? null : "files"))
            }
            className={cn(
              "rounded-full p-2 hover:bg-[#f2f5f2]",
              openPanel === "files" && "bg-[#eef7f3] text-black"
            )}
            aria-label="View shared files"
            aria-pressed={openPanel === "files"}
          >
            <FileText className="h-4 w-4" />
          </button>
        </div>
      </div>

      {openPanel && (
        <div className="absolute right-5 top-20 z-20 w-72 rounded-2xl bg-white p-4 shadow-2xl shadow-black/15">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-black">
              Shared {openPanel}
            </h4>
            <button
              type="button"
              onClick={() => setOpenPanel(null)}
              className="rounded-full p-1.5 text-black hover:bg-[#f2f5f2]"
              aria-label="Close shared media"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {openPanel === "images" ? (
            sharedImages.length ? (
              <div className="grid grid-cols-3 gap-2">
                {sharedImages.map((image) => (
                  <a
                    key={image.id}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square overflow-hidden rounded-xl bg-[#eef7f3]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.name}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-[#f5f7f5] p-4 text-center text-xs text-black">
                No shared images yet
              </p>
            )
          ) : sharedFiles.length ? (
            <div className="space-y-2">
              {sharedFiles.map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-[#f5f7f5] p-3 text-xs text-black hover:bg-[#eef7f3]"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-[#f5f7f5] p-4 text-center text-xs text-black">
              No shared files yet
            </p>
          )}
        </div>
      )}

      {/* Messages Area */}
<div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-[#eef7f3] px-4 py-5 sm:px-7"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle className="mb-4 h-12 w-12 text-black dark:text-white" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
              No messages yet
            </h3>
            <p className="mt-1 text-sm text-black dark:text-white">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date Separator */}
<div className="my-4 flex items-center justify-center">
                  <span className="rounded-full bg-white/75 px-4 py-1.5 text-[10px] font-medium text-black">
                    {formatDateSeparator(group.date)}
                  </span>
                </div>

                {/* Messages */}
                {group.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={
                      message.senderId === currentUserId
                    }
                    showSender={conversation?.type === "group"}
                  />
                ))}
              </div>
            ))}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {sendError && (
        <p className="mx-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {sendError}
        </p>
      )}
      <MessageInput
        onSend={handleSend}
        onTyping={() => undefined}
        onStopTyping={() => undefined}
      />
    </div>
  );
}

