import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { Avatar, Button } from "@/components";
import { colors, fonts } from "@/theme";

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  signature: string;
};

export default function DashboardScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
    setUsername(profile?.username ?? "");
    setAvatarUrl(profile?.avatarUrl ?? null);
  }, [profile]);

  const chooseAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: .85, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    const asset = result.assets[0]!;
    setUploading(true); setError("");
    try {
      const sign = await api<UploadSignature>("/uploads/sign", {
        method: "POST",
        body: JSON.stringify({
          fileName: asset.fileName ?? "avatar.jpg",
          mimeType: asset.mimeType ?? "image/jpeg",
          bytes: asset.fileSize ?? 1
        })
      });
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: asset.fileName ?? "avatar.jpg", type: asset.mimeType ?? "image/jpeg" } as any);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("public_id", sign.publicId);
      form.append("signature", sign.signature);
      const uploaded = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: "POST", body: form });
      if (!uploaded.ok) throw new Error("Image upload is not configured yet");
      const data = await uploaded.json();
      setAvatarUrl(data.secure_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload profile picture");
    } finally { setUploading(false); }
  };

  const save = async () => {
    setBusy(true); setError("");
    try {
      await api("/profile", {
        method: "PUT",
        body: JSON.stringify({ displayName, username, avatarUrl })
      });
      await refreshProfile();
      Alert.alert("Profile updated", "Your changes are now visible on Convo.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update profile");
    } finally { setBusy(false); }
  };

  const logout = async () => {
    await signOut();
    router.replace("/auth");
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.kicker}>ACCOUNT DASHBOARD</Text>
          <Text style={styles.title}>Your profile</Text>
          <Text style={styles.subtitle}>Manage how you appear to people across Convo.</Text>
        </View>
        <Pressable accessibilityLabel="Close dashboard" onPress={() => router.back()} style={styles.close}>
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Avatar name={displayName || "C"} uri={avatarUrl} size={104} />
          <Pressable accessibilityLabel="Change profile picture" onPress={chooseAvatar} disabled={uploading} style={styles.camera}>
            <Ionicons name={uploading ? "hourglass-outline" : "camera"} size={18} color="white" />
          </Pressable>
        </View>
        <Text style={styles.profileName}>{displayName || "Your name"}</Text>
        <Text style={styles.profileHandle}>@{username || "username"}</Text>
        <Pressable onPress={chooseAvatar} disabled={uploading} style={styles.photoButton}>
          <Ionicons name="image-outline" size={17} color={colors.accent} />
          <Text style={styles.photoButtonText}>{uploading ? "Uploading…" : "Change profile picture"}</Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionIcon}><Ionicons name="person-outline" size={18} color={colors.accent} /></View>
          <View><Text style={styles.sectionTitle}>Profile information</Text><Text style={styles.sectionDetail}>Keep your public details up to date.</Text></View>
        </View>
        <Text style={styles.label}>DISPLAY NAME</Text>
        <TextInput value={displayName} onChangeText={setDisplayName} maxLength={60} placeholder="Display name"
          placeholderTextColor={colors.muted} style={styles.input} />
        <Text style={styles.label}>USERNAME</Text>
        <View style={styles.usernameRow}>
          <Text style={styles.at}>@</Text>
          <TextInput value={username} onChangeText={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            maxLength={30} autoCapitalize="none" placeholder="username" placeholderTextColor={colors.muted} style={styles.usernameInput} />
        </View>
        <Text style={styles.hint}>Use 3–30 lowercase letters, numbers, or underscores.</Text>
        {!!error && <View style={styles.error}><Ionicons name="alert-circle-outline" size={17} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View>}
        <Button title="Save changes" loading={busy} disabled={!displayName.trim() || username.length < 3} onPress={save} />
      </View>

      <View style={styles.sessionCard}>
        <View style={styles.sessionCopy}>
          <Text style={styles.sessionTitle}>Sign out of Convo</Text>
          <Text style={styles.sessionDetail}>You can sign back in at any time with your email and password.</Text>
        </View>
        <Pressable onPress={logout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} /><Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { width: "100%", maxWidth: 820, alignSelf: "center", padding: 24, gap: 16 },
  headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  kicker: { color: colors.accent, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 1.8 },
  title: { color: colors.ink, fontSize: 40, fontFamily: fonts.bold, letterSpacing: -1.3, marginTop: 5 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 16, marginTop: 5 },
  close: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  profileCard: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: "center" },
  avatarWrap: { position: "relative" },
  camera: { position: "absolute", right: -3, bottom: 1, width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.card, alignItems: "center", justifyContent: "center" },
  profileName: { color: colors.ink, fontSize: 26, fontFamily: fonts.bold, marginTop: 14 },
  profileHandle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 15, marginTop: 3 },
  photoButton: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.primarySoft, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, marginTop: 14 },
  photoButtonText: { color: colors.accent, fontWeight: "700", fontSize: 13 },
  formCard: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 22, gap: 10 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 8 },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  sectionTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 18 },
  sectionDetail: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  label: { color: colors.accent, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 1.3, marginTop: 6 },
  input: { minHeight: 56, borderRadius: 15, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, color: colors.ink, fontFamily: fonts.medium, fontSize: 17 },
  usernameRow: { minHeight: 54, borderRadius: 15, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  at: { color: colors.primary, fontWeight: "900", fontSize: 17 },
  usernameInput: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 17, paddingLeft: 4 },
  hint: { color: colors.muted, fontSize: 11, marginBottom: 6 },
  error: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#FFF0EE", padding: 11, borderRadius: 12 },
  errorText: { color: colors.danger, flex: 1, fontSize: 12 },
  sessionCard: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 18, flexDirection: "row", alignItems: "center", gap: 16 },
  sessionCopy: { flex: 1 },
  sessionTitle: { color: colors.ink, fontWeight: "800" },
  sessionDetail: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  logout: { flexDirection: "row", gap: 7, alignItems: "center", backgroundColor: "#FFF0EE", paddingHorizontal: 15, paddingVertical: 11, borderRadius: 13 },
  logoutText: { color: colors.danger, fontFamily: fonts.medium },
  pressed: { opacity: .78, transform: [{ scale: .97 }] }
});
