import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { api } from "@/api";
import { Avatar, StateView } from "@/components";
import { colors, fonts } from "@/theme";
import type { User } from "@/types";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        setUsers(await api(query.length >= 2 ? `/users/search?q=${encodeURIComponent(query)}` : "/users"));
      } catch (e) {
        setUsers([]);
        setError(e instanceof Error ? e.message : "Could not load users");
      }
      finally { setLoading(false); }
    }, query.length >= 2 ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query]);
  const open = async (user: User) => {
    try {
      const conversation = await api<{ id: string }>("/conversations", { method: "POST", body: JSON.stringify({ userId: user.id }) });
      router.replace({ pathname: "/chat/[id]", params: { id: conversation.id, name: user.displayName, userId: user.id } });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start conversation"); }
  };
  return (
    <View style={styles.page}>
      <View style={styles.intro}>
        <Text style={styles.title}>Find your people</Text>
        <Text style={styles.subtitle}>Browse everyone on Convo or search by username.</Text>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.primary} />
        <TextInput autoFocus autoCapitalize="none" style={styles.input} placeholder="Search @username"
          placeholderTextColor={colors.muted} value={query} onChangeText={(v) => setQuery(v.toLowerCase().trimStart())} />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList data={users} keyExtractor={(item) => item.id}
        ListEmptyComponent={<StateView loading={loading} title={loading ? "Loading people…" : "No users found"}
          detail={!loading ? query.length >= 2 ? "Try a different username." : "New Convo members will appear here." : undefined} />}
        contentContainerStyle={users.length ? styles.results : { flex: 1 }}
        renderItem={({ item }) => <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => open(item)}>
          <View><Avatar name={item.displayName} uri={item.avatarUrl} size={50} /><View style={styles.statusDot} /></View>
          <View style={styles.person}><Text style={styles.name}>{item.displayName}</Text><Text style={styles.handle}>@{item.username}</Text></View>
          <View style={styles.arrow}><Ionicons name="chatbubble-outline" size={16} color={colors.primary} /></View>
        </Pressable>} />
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: 16 },
  intro: { marginTop: 4, marginBottom: 18 },
  title: { color: colors.ink, fontSize: 34, fontFamily: fonts.bold, letterSpacing: -1 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, marginTop: 5 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 17, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginBottom: 10 },
  input: { minHeight: 54, flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  error: { color: colors.danger, marginVertical: 8, backgroundColor: "#FFF0EE", padding: 10, borderRadius: 12 },
  results: { paddingTop: 5, paddingBottom: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 13, padding: 13, backgroundColor: colors.surface, borderRadius: 18, marginVertical: 5, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: .8 },
  statusDot: { position: "absolute", right: 0, bottom: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.unread, borderWidth: 2, borderColor: colors.surface },
  person: { flex: 1 },
  name: { fontSize: 18, fontFamily: fonts.semibold, color: colors.ink }, handle: { color: colors.muted, fontFamily: fonts.regular, marginTop: 3, fontSize: 14 },
  arrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
});
