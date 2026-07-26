"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/src/lib/utils";
import Avatar from "@/src/components/ui/Avatar";
import type { UserProfile } from "@/src/types";

interface SidebarProps {
  className?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [startingChatId, setStartingChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/api/auth/me", { signal: controller.signal, cache: "no-store" }),
      fetch("/api/users?excludeMe=false", {
        signal: controller.signal,
        cache: "no-store",
      }),
    ])
      .then(async ([authResponse, usersResponse]) => {
        const authResult =
          (await authResponse.json()) as ApiResponse<UserProfile>;
        const usersResult =
          (await usersResponse.json()) as ApiResponse<UserProfile[]>;

        if (!authResponse.ok || !authResult.data) {
          throw new Error(authResult.error || "Unable to load your profile.");
        }
        if (!usersResponse.ok || !usersResult.success) {
          throw new Error(usersResult.error || "Unable to load people.");
        }

        setCurrentUser(authResult.data);
        setUsers(usersResult.data ?? []);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load people."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [searchQuery, users]);

  async function startChat(userId: string) {
    if (userId === currentUser?.id || startingChatId) return;
    setStartingChatId(userId);
    setError("");

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "one_to_one", recipientId: userId }),
      });
      const result = (await response.json()) as ApiResponse<{ id: string }>;
      if (!response.ok || !result.data?.id) {
        throw new Error(result.error || "Unable to open this conversation.");
      }
      setIsOpen(false);
      router.push(`/conversations/${result.data.id}`);
    } catch (chatError) {
      setError(
        chatError instanceof Error
          ? chatError.message
          : "Unable to open this conversation."
      );
    } finally {
      setStartingChatId(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/auth/login");
    router.refresh();
  }

  const railItem =
    "grid h-11 w-11 place-items-center rounded-full text-black transition-all hover:bg-white hover:text-black";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white shadow-xl lg:hidden"
        aria-label={isOpen ? "Close messages" : "Open messages"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Users className="h-5 w-5" />}
        {isOpen ? "Close" : "Messages"}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[430px] max-w-[92vw] overflow-hidden bg-[#f7f5ee] transition-transform duration-300",
          "lg:relative lg:inset-auto lg:h-full lg:max-w-none lg:translate-x-0 lg:rounded-l-[2rem]",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex w-[76px] shrink-0 flex-col items-center bg-[#eef5ec] py-7">
          <Link
            href="/conversations"
            className="mb-10 grid h-11 w-11 place-items-center rounded-2xl bg-black text-lg font-black text-white"
            aria-label="Convo home"
          >
            C
          </Link>

          <nav className="flex flex-1 flex-col items-center gap-3">
            <Link href="/conversations" className={railItem} aria-label="Home">
              <Home className="h-5 w-5" />
            </Link>
            <button
              type="button"
              className={railItem}
              aria-label="New conversation"
              onClick={() => {
                setIsOpen(true);
                searchInputRef.current?.focus();
              }}
            >
              <Plus className="h-5 w-5" />
            </button>
            <span className={cn(railItem, "bg-black text-white hover:bg-black hover:text-white")}>
              <MessageCircle className="h-5 w-5" />
            </span>
          </nav>

          <div className="flex flex-col items-center gap-3">
            <Link href="/settings" className={railItem} aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={logout}
              className={cn(railItem, "hover:bg-red-50 hover:text-red-600")}
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <Avatar
              name={currentUser?.username || "User"}
              size="sm"
              isOnline
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="p-3 pb-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search"
                className="w-full rounded-2xl bg-[#f6f7f5] py-3 pl-11 pr-4 text-sm text-black outline-none placeholder:text-[#9ca09d] focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <h1 className="text-xl font-semibold tracking-tight text-black">
              Messages
            </h1>
            <span className="text-xs text-black">{filteredUsers.length}</span>
          </div>

          {error && (
            <p className="mx-3 mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="mx-1 mb-1 flex animate-pulse items-center gap-3 rounded-2xl px-3 py-3"
                  >
                    <div className="h-11 w-11 rounded-full bg-[#ecefeb]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/5 rounded bg-[#ecefeb]" />
                      <div className="h-2.5 w-4/5 rounded bg-[#f1f3f0]" />
                    </div>
                  </div>
                ))
              : filteredUsers.map((user) => {
                  const isMe = user.id === currentUser?.id;
                  const isStarting = startingChatId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={isMe || startingChatId !== null}
                      onClick={() => startChat(user.id)}
                      className={cn(
                        "mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                        "hover:bg-[#eef7f3] disabled:cursor-default",
                        pathname.includes(user.id) && "bg-[#eef7f3]"
                      )}
                    >
                      <Avatar name={user.username} size="md" isOnline />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-black">
                            {user.username}
                            {isMe && (
                              <span className="ml-1 text-black">(You)</span>
                            )}
                          </p>
                          <span className="shrink-0 text-[10px] text-black">
                            {isMe ? "Now" : ""}
                          </span>
                        </div>
                        <p className="truncate text-xs text-black">
                          {isMe ? "Your account" : "Click to start a conversation"}
                        </p>
                      </div>
                      {isStarting && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      )}
                    </button>
                  );
                })}
          </div>
        </div>
      </aside>

      {isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close messages panel"
        />
      )}
    </>
  );
}
