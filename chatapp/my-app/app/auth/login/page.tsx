"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/src/lib/validation";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";
import { Mail, Lock, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    router.prefetch("/conversations");
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Login failed");
        return;
      }

      toast.success("Logged in successfully!");
      router.replace("/conversations");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#e9f4ed] p-4">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#fff2e7]/80 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#d6eee0]/80 blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up space-y-8 rounded-[2.25rem] bg-white p-8 shadow-2xl shadow-black/10 sm:p-10">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-black shadow-lg shadow-black/20">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-black">
            Convo
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Welcome to Convo
          </h1>
          <p className="mt-2 text-sm text-black">
            Sign in to your account to continue
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register("password")}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-black">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-black underline decoration-[#8fcf88] decoration-2 underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
