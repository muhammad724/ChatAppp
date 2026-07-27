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
      <div className="flex h-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <LogIn className="mx-auto mb-4 h-10 w-10 text-violet-600" />
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Sign in to view your profile
          </h1>
          <Link
            href="/auth/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition hover:opacity-90"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-6">
      <div className="mx-auto max-w-2xl animate-fade-in">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Profile Settings
        </h1>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          View your account information and manage your session.
        </p>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="bg-gradient-to-r from-violet-100 via-indigo-100 to-cyan-100 px-6 py-8 dark:from-violet-900/40 dark:via-indigo-900/30 dark:to-cyan-900/30">
            <div className="flex items-center gap-4">
              <Avatar name={user.username} size="xl" isOnline />

              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold text-zinc-900 dark:text-white">
                  {user.username}
                </h2>

                <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  ● Online
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">
            {/* Username */}
            <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-violet-300 hover:bg-violet-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-violet-500 dark:hover:bg-zinc-800">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40">
                <UserRound className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Username
                </p>

                <p className="text-base font-semibold text-zinc-900 dark:text-white">
                  {user.username}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-violet-300 hover:bg-violet-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-violet-500 dark:hover:bg-zinc-800">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40">
                <Mail className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Email Address
                </p>

                <p className="truncate text-base font-semibold text-zinc-900 dark:text-white">
                  {user.email}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="danger"
              onClick={logout}
              className="mt-4 w-full"
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
