"use client";

import Link from "next/link";
import { LogIn, LogOut, Mail, UserRound } from "lucide-react";
import Avatar from "@/src/components/ui/Avatar";
import Button from "@/src/components/ui/Button";
import { useAuth } from "@/src/hooks/useAuth";

export default function SettingsPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] bg-white/80 p-8 text-center shadow-2xl shadow-violet-950/10 dark:bg-white/5">
          <LogIn className="mx-auto mb-4 h-10 w-10 text-violet-600" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Sign in to view your profile
          </h1>
          <Link
            href="/auth/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02]"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl animate-fade-in">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Profile settings
        </h1>
        <p className="mt-1 text-sm text-black dark:text-white">
          View your account and manage your session.
        </p>

        <section className="mt-6 overflow-hidden rounded-[2rem] bg-white/80 shadow-2xl shadow-violet-950/10 dark:bg-white/5">
          <div className="bg-gradient-to-r from-violet-500/15 via-indigo-500/10 to-cyan-400/10 px-6 py-8">
            <div className="flex items-center gap-4">
              <Avatar name={user.username} size="xl" isOnline />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-zinc-900 dark:text-white">
                  {user.username}
                </h2>
                <p className="mt-0.5 text-sm text-green-600 dark:text-green-400">
                  Online
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-6">
            <div className="flex items-center gap-3 rounded-2xl bg-violet-50/80 p-4 dark:bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-zinc-800">
                <UserRound className="h-5 w-5 text-black dark:text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-black dark:text-white">
                  Username
                </p>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {user.username}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-violet-50/80 p-4 dark:bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-zinc-800">
                <Mail className="h-5 w-5 text-black dark:text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-black dark:text-white">
                  Email address
                </p>
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {user.email}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="danger"
              onClick={logout}
              className="mt-2 w-full"
              leftIcon={<LogOut className="h-4 w-4" />}
            >
              Log out
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
