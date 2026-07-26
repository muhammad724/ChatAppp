import { Redirect } from "expo-router";
import { StateView } from "@/components";
import { useAuth } from "@/auth";

export default function Index() {
  const { loading, session, profile } = useAuth();
  if (loading) return <StateView loading title="Restoring your session…" />;
  if (!session) return <Redirect href="/auth" />;
  if (!profile) return <Redirect href="/profile" />;
  return <Redirect href="/home" />;
}
