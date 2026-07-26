export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  lastSeenAt?: string | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  clientId: string;
  type: "TEXT" | "IMAGE";
  text?: string | null;
  imageUrl?: string | null;
  status: "SENT" | "DELIVERED" | "READ";
  createdAt: string;
  editedAt?: string | null;
  deletedForEveryoneAt?: string | null;
  pending?: boolean;
  failed?: boolean;
  progress?: number;
};

export type Conversation = {
  id: string;
  members: { user: User }[];
  messages: Message[];
  unreadCount: number;
  lastMessageAt?: string | null;
};
