import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from "react-native";
import { router } from "expo-router";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components";
import { colors, fonts } from "@/theme";

export default function ProfileScreen() {
  const { refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setError("");
    try {
      await api("/profile", { method: "PUT", body: JSON.stringify({ username, displayName }) });
      await refreshProfile();
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <Text style={styles.kicker}>YOUR IDENTITY</Text>
      <Text style={styles.title}>Make it yours</Text>
      <Text style={styles.note}>Choose a unique username so people can find you on Convo.</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Display name"
        placeholderTextColor={colors.muted} maxLength={60} />
      <TextInput style={styles.input} value={username} onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
        placeholder="username" placeholderTextColor={colors.muted} autoCapitalize="none" maxLength={30} />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Create my profile" loading={busy} disabled={displayName.trim().length < 1 || username.length < 3} onPress={save} />
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 13, justifyContent: "center", backgroundColor: colors.background },
  kicker: { color: colors.accent, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 1.8 },
  title: { fontSize: 40, fontFamily: fonts.bold, color: colors.ink, letterSpacing: -1.3 },
  note: { color: colors.muted, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, marginBottom: 14, maxWidth: 390 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 17, minHeight: 58, paddingHorizontal: 17, fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  error: { color: colors.danger, backgroundColor: "#FFF0EE", padding: 10, borderRadius: 12 }
});
