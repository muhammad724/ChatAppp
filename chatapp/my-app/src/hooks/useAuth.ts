// ============================================================================
// useAuth Hook - Authentication State Management
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/src/types";

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        throw new Error("Not authenticated");
      }
      const result = await response.json();
      if (result.success) {
        setState({
          user: result.data,
          isLoading: false,
          isAuthenticated: true,
        });
      }
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Not authenticated");
        const result = await response.json();
        if (isActive && result.success) {
          setState({
            user: result.data,
            isLoading: false,
            isAuthenticated: true,
          });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Login failed");
    }

    setState({
      user: result.data.user,
      isLoading: false,
      isAuthenticated: true,
    });

    return result;
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Registration failed");
    }

    setState({
      user: result.data.user,
      isLoading: false,
      isAuthenticated: true,
    });

    return result;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the request fails, clear local state
    }

    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push("/auth/login");
    router.refresh();
  };

  const updateUser = (user: UserProfile) => {
    setState((prev) => ({ ...prev, user }));
  };

  return {
    ...state,
    login,
    register,
    logout,
    updateUser,
    refetchUser: fetchUser,
  };
}

