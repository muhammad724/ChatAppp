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
      <div className="flex h-full items-center justify-center bg-[#eef7f3] p-6 text-black">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl shadow-black/10">
          <LogIn className="mx-auto mb-4 h-10 w-10 text-black" />
          <h1 className="text-xl font-semibold text-black">
            Sign in to view your profile
          </h1>
          <Link
            href="/auth/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#dcefdc] px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-[#cde7cd]"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#eef7f3] p-4 text-black sm:p-6">
      <div className="mx-auto max-w-2xl animate-fade-in">
        <h1 className="text-2xl font-bold text-black">
          Profile settings
        </h1>
        <p className="mt-1 text-sm text-black">
          View your account and manage your session.
        </p>

        <section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/10">
          <div className="bg-gradient-to-r from-[#dcefdc] via-[#eef7f3] to-[#fff2e7] px-6 py-8">
            <div className="flex items-center gap-4">
              <Avatar name={user.username} size="xl" isOnline />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-black">
                  {user.username}
                </h2>
                <p className="mt-0.5 text-sm text-black">
                  Online
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-6">
            <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7f4] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <UserRound className="h-5 w-5 text-black" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-black">
                  Username
                </p>
                <p className="text-sm font-medium text-black">
                  {user.username}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7f4] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Mail className="h-5 w-5 text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-black">
                  Email address
                </p>
                <p className="truncate text-sm font-medium text-black">
                  {user.email}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={logout}
              className="mt-2 w-full border-red-200 bg-red-50 text-black hover:bg-red-100"
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
