import { supabase } from "./supabase";
import { Platform } from "react-native";

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!configuredBaseUrl) throw new Error("Missing EXPO_PUBLIC_API_URL");
const baseUrl = Platform.OS === "android"
  ? configuredBaseUrl.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2")
  : configuredBaseUrl;

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        ...init.headers
      }
    });
  } catch {
    throw new ApiError(0, "Couldn’t connect to Convo. Check that the server is running.", "NETWORK_ERROR");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error ?? "Request failed", body.code);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export { baseUrl };
