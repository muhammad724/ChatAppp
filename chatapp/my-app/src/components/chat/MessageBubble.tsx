// ============================================================================
// MessageBubble Component - Individual Chat Message
// ============================================================================

"use client";

import { cn, formatMessageTime } from "@/src/lib/utils";
import type { Message } from "@/src/types";
import { Check, CheckCheck, FileText } from "lucide-react";
import { motion } from "framer-motion";
import NextImage from "next/image";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSender?: boolean;
}

export default function MessageBubble({
  message,
  isOwn,
  showSender = true,
}: MessageBubbleProps) {
  const messageClasses = cn(
    "max-w-[78%] rounded-2xl px-4 py-2.5 message-bubble shadow-sm",
    isOwn
      ? "bg-white text-black rounded-br-md shadow-black/5 hover:shadow-md transition-shadow"
      : "bg-black text-white rounded-bl-md shadow-black/10 hover:shadow-md transition-shadow"
  );

  const renderAttachment = () => {
    if (!message.attachments?.length) return null;

    const attachment = message.attachments[0];

    if (message.type === "image") {
      return (
        <div className="mb-2 -mx-4 -mt-2.5 overflow-hidden rounded-t-2xl">
          <NextImage
            src={attachment.url}
            alt={attachment.name}
            width={640}
            height={360}
            className="max-h-64 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
          />
        </div>
      );
    }

    if (message.type === "video") {
      return (
        <div className="mb-2 -mx-4 -mt-2.5 overflow-hidden rounded-t-2xl bg-black">
          <video
            src={attachment.url}
            controls
            className="max-h-64 w-full"
          />
        </div>
      );
    }

    if (message.type === "file") {
      return (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex items-center gap-3 rounded-xl bg-white/10 p-3 hover:bg-white/20 transition-all hover:scale-[1.02]"
        >
          <div className="rounded-lg bg-white/20 p-2">
            <FileText className="h-5 w-5 shrink-0" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{attachment.name}</p>
            <p className="text-xs opacity-70">
              {formatFileSize(attachment.size)}
            </p>
          </div>
        </a>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex mb-1",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div className={messageClasses}>
        {/* Sender name (for group chats) */}
        {showSender && !isOwn && (
          <p className="mb-1 text-xs font-medium text-[#92d18b]">
            {message.sender.username}
          </p>
        )}

        {/* Attachment */}
        {renderAttachment()}

        {/* Message content (if not deleted) */}
        {!message.isDeleted ? (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
            {message.isEdited && (
              <span className="text-[10px] opacity-60 ml-1">(edited)</span>
            )}
          </>
        ) : (
          <p className="text-sm italic opacity-60">This message has been deleted</p>
        )}

        {/* Timestamp & Status */}
        <div className="mt-1 flex items-center justify-end gap-1">
          <span
            className={cn(
              "text-[10px]",
              isOwn ? "text-black" : "text-white"
            )}
          >
            {formatMessageTime(message.createdAt)}
          </span>
          {isOwn && (
            <>
              {message.isSeen ? (
                <CheckCheck className="h-3.5 w-3.5 text-[#65c45b]" />
              ) : message.isDelivered ? (
                <CheckCheck className="h-3.5 w-3.5 text-[#65c45b]" />
              ) : (
                <Check className="h-3.5 w-3.5 text-black" />
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

