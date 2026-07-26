import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/supabase";
import { Button } from "@/components";
import { colors, fonts } from "@/theme";

export default function AuthScreen() {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true); setError("");
    const result = registering
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    if (registering && !result.data.session) {
      setError("Check your email to confirm your account, then log in.");
      setRegistering(false);
      return;
    }
    router.replace("/");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <View style={styles.brand}>
        <View style={styles.glow} />
        <View style={styles.mark}><Text style={styles.markText}>C</Text><View style={styles.markDot} /></View>
        <Text style={styles.title}>Convo</Text>
        <Text style={styles.tagline}>Real conversations. One beautiful place.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>{registering ? "Create account" : "Welcome back"}</Text>
        <Text style={styles.subheading}>{registering ? "Create your space and say hello." : "Your conversations are waiting for you."}</Text>
        <Text style={styles.label}>EMAIL</Text>
        <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email address"
          placeholderTextColor={colors.muted} style={styles.input} value={email} onChangeText={setEmail} />
        <Text style={styles.label}>PASSWORD</Text>
        <TextInput autoCapitalize="none" autoComplete={registering ? "new-password" : "current-password"} secureTextEntry
          placeholder="Password (at least 6 characters)" placeholderTextColor={colors.muted} style={styles.input}
          value={password} onChangeText={setPassword} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button title={registering ? "Register" : "Log in"} loading={busy}
          disabled={!email.trim() || password.length < 6} onPress={submit} />
        <Text onPress={() => { setRegistering(!registering); setError(""); }} style={styles.switch}>
          {registering ? "Already registered? Log in" : "New here? Create an account"}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24, overflow: "hidden" },
  brand: { alignItems: "center", marginBottom: 28 },
  glow: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: colors.primaryDark, opacity: 1, top: -110 },
  mark: {
    width: 70, height: 70, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center",
    justifyContent: "center"
  },
  markText: { color: "white", fontSize: 34, fontFamily: fonts.semibold },
  markDot: { position: "absolute", right: 13, bottom: 13, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
  title: { color: colors.ink, fontSize: 34, fontFamily: fonts.medium, marginTop: 14, letterSpacing: -1 },
  tagline: { color: colors.muted, fontFamily: fonts.regular, marginTop: 4, fontSize: 14 },
  card: {
    backgroundColor: colors.surface, borderRadius: 36, padding: 26, gap: 11,
    shadowColor: colors.shadow, shadowOpacity: .06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 3
  },
  heading: { color: colors.ink, fontSize: 24, fontFamily: fonts.medium, letterSpacing: -.5 },
  subheading: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  label: { color: colors.muted, fontSize: 10, fontFamily: fonts.medium, letterSpacing: 1.2, marginTop: 3 },
  input: {
    minHeight: 54, borderRadius: 16,
    paddingHorizontal: 16, color: colors.ink, fontFamily: fonts.regular, fontSize: 13, backgroundColor: colors.surfaceMuted, borderWidth: 0
  },
  error: { color: colors.danger, lineHeight: 19, backgroundColor: "#FFF0EE", padding: 10, borderRadius: 12 },
  switch: { color: colors.ink, fontFamily: fonts.medium, textAlign: "center", padding: 8, marginTop: 2, textDecorationLine: "underline", textDecorationColor: colors.accent }
});
