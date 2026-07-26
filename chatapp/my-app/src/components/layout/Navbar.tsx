// ============================================================================
// Navbar Component - Top Navigation Bar
// ============================================================================

"use client";

import { cn } from "@/src/lib/utils";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/src/hooks/useTheme";

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme, mounted } = useTheme();

  const getPageTitle = (): string => {
    if (pathname === "/conversations") return "Chats";
    if (pathname.startsWith("/conversations/")) return "Chat";
    if (pathname === "/settings") return "Settings";
    return "Chats";
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between bg-transparent px-5 py-4 lg:px-7",
        className
      )}
    >
      <h2 className="text-lg font-bold tracking-tight text-black dark:text-white">
        {getPageTitle()}
      </h2>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="rounded-2xl bg-violet-100/70 p-2.5 text-black transition-all hover:scale-105 hover:bg-violet-200 active:scale-95 dark:bg-violet-400/10 dark:text-white dark:hover:bg-violet-400/20"
        >
          {mounted && theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      </div>
    </header>
  );
}
