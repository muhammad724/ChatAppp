// ============================================================================
// TypeScript Type Definitions for Chat Application
// ============================================================================

// ─── User Types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  password: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: UserProfile;
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

// ─── Conversation Types ──────────────────────────────────────────────────────

export type ConversationType = "one_to_one" | "group";

export interface Participant {
  id: string;
  userId: string;
  conversationId: string;
  joinedAt: Date;
  role: "admin" | "member";
  user: UserProfile;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: Participant[];
  messages: Message[];
  lastMessage: Message | null;
}

export interface ConversationListEntry {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  participants: Participant[];
  updatedAt: Date;
}

// ─── Message Types ──────────────────────────────────────────────────────────

export type MessageType = "text" | "image" | "video" | "file" | "audio" | "system";

export interface Attachment {
  id: string;
  messageId: string;
  url: string;
  type: string;
  name: string;
  size: number;
  createdAt: Date;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
  user: UserProfile;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  isEdited: boolean;
  isDeleted: boolean;
  isDelivered: boolean;
  isSeen: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender: UserProfile;
  attachments: Attachment[];
  reactions: MessageReaction[];
}

// ─── Socket Event Types ─────────────────────────────────────────────────────

export interface ServerToClientEvents {
  receive_message: (message: Message) => void;
  message_seen: (data: { messageId: string; conversationId: string; userId: string }) => void;
  message_delivered: (data: { messageId: string; conversationId: string }) => void;
  user_online: (data: { userId: string }) => void;
  user_offline: (data: { userId: string }) => void;
  typing: (data: { conversationId: string; userId: string; username: string }) => void;
  stop_typing: (data: { conversationId: string; userId: string }) => void;
  group_created: (data: Conversation) => void;
  group_updated: (data: Conversation) => void;
  new_notification: (data: Notification) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  join_conversation: (conversationId: string) => void;
  leave_conversation: (conversationId: string) => void;
  send_message: (data: {
    conversationId: string;
    content: string;
    type: MessageType;
    attachments?: { url: string; type: string; name: string; size: number }[];
  }) => void;
  typing: (conversationId: string) => void;
  stop_typing: (conversationId: string) => void;
  message_seen: (data: { messageId: string; conversationId: string }) => void;
  message_delivered: (data: { messageId: string; conversationId: string }) => void;
}

// ─── Notification Types ─────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: "new_message" | "mention" | "group_invite" | "group_update";
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: Date;
}

// ─── Typing Status Types ────────────────────────────────────────────────────

export interface TypingUser {
  userId: string;
  username: string;
  conversationId: string;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Settings Types ─────────────────────────────────────────────────────────

export interface UserSettings {
  id: string;
  userId: string;
  theme: "light" | "dark" | "system";
  notificationsEnabled: boolean;
  messageSound: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Search Types ───────────────────────────────────────────────────────────

export interface SearchResult {
  users: UserProfile[];
  conversations: Conversation[];
  messages: Message[];
}

