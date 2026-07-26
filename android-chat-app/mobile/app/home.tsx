import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { Avatar, IconButton, StateView } from "@/components";
import { colors, fonts } from "@/theme";
import type { Conversation } from "@/types";
import { connectSocket } from "@/socket";

export default function HomeScreen() {
  const { session, profile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    try { setError(""); setItems(await api("/conversations")); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load conversations"); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));
  useEffect(() => {
    if (!session) return;
    const socket = connectSocket(session.access_token);
    socket.on("message:new", load);
    socket.on("message:updated", load);
    socket.on("message:deleted", load);
    return () => { socket.off(); socket.disconnect(); };
  }, [session]);
  if (loading) return <StateView loading title="Loading conversations…" />;
  return (
    <View style={styles.page}>
      <View style={[styles.shell, desktop && styles.shellDesktop]}>
        {desktop && <View style={styles.rail}>
          <View style={styles.railLogo}><Text style={styles.railLogoText}>C</Text></View>
          <View style={styles.railNav}>
            <IconButton name="chatbubbles" label="Conversations" active />
            <IconButton name="search" label="Search people" onPress={() => router.push("/search")} />
            <IconButton name="notifications-outline" label="Notifications" />
          </View>
          <View style={styles.railBottom}>
            <IconButton name="log-out-outline" label="Log out" onPress={() => signOut()} />
            <Pressable onPress={() => router.push("/dashboard")}><Avatar name={profile?.displayName ?? "C"} uri={profile?.avatarUrl} size={40} /></Pressable>
          </View>
        </View>}
        <View style={[styles.listPanel, desktop && styles.listPanelDesktop]}>
          <View style={styles.hero}>
            <View>
              <Text style={styles.eyebrow}>CONVO • YOUR SPACE</Text>
              <Text style={styles.greeting}>Messages</Text>
            </View>
            {!desktop && <Pressable accessibilityLabel="Open profile dashboard" onPress={() => router.push("/dashboard")} style={styles.profileButton}>
              <Avatar name={profile?.displayName ?? "C"} uri={profile?.avatarUrl} size={42} />
            </Pressable>}
          </View>
          <Pressable onPress={() => router.push("/search")} style={styles.search}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <Text style={styles.searchText}>Search conversations</Text>
            <View style={styles.shortcut}><Text style={styles.shortcutText}>⌘ K</Text></View>
          </Pressable>
          <View style={styles.toolbar}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <Text style={styles.count}>{items.length}</Text>
          </View>
          {!!error && <View style={styles.banner}><Text style={styles.bannerText}>Offline or unavailable — pull to retry. {error}</Text></View>}
          <FlatList style={styles.list} data={items} keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
            contentContainerStyle={items.length ? styles.listContent : { flex: 1 }}
            ListEmptyComponent={<StateView title="No conversations yet" detail="Search by username to begin a private conversation." />}
            renderItem={({ item }) => {
              const person = item.members[0]?.user;
              const last = item.messages[0];
              if (!person) return null;
              const preview = last?.deletedForEveryoneAt ? "Message deleted" : last?.type === "IMAGE" ? "📷 Photo" : last?.text ?? "Start chatting";
              return <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id, name: person.displayName, userId: person.id } })}>
                <View><Avatar name={person.displayName} uri={person.avatarUrl} size={52} />{item.unreadCount > 0 && <View style={styles.onlineDot} />}</View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}><Text numberOfLines={1} style={styles.name}>{person.displayName}</Text>
                    <Text style={[styles.time, item.unreadCount > 0 && styles.unreadText]}>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</Text></View>
                  <View style={styles.rowTop}><Text numberOfLines={1} style={styles.preview}>{preview}</Text>
                    {item.unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(item.unreadCount, 99)}</Text></View>}</View>
                </View>
              </Pressable>;
            }} />
          <Pressable accessibilityLabel="Start a new conversation" onPress={() => router.push("/search")} style={styles.fab}>
            <Ionicons name="create-outline" size={23} color="white" />
          </Pressable>
        </View>
        {desktop && <View style={styles.emptyPane}>
          <View style={styles.emptyGlow} />
          <View style={styles.emptyIcon}><Ionicons name="chatbubble-ellipses-outline" size={34} color={colors.accent} /></View>
          <Text style={styles.emptyTitle}>Your conversations, beautifully focused.</Text>
          <Text style={styles.emptyDetail}>Choose a conversation from the sidebar or start a new one. Convo keeps the noise out and the people close.</Text>
          <Pressable onPress={() => router.push("/search")} style={styles.startButton}>
            <Ionicons name="add" size={18} color="white" /><Text style={styles.startButtonText}>New conversation</Text>
          </Pressable>
          <View style={styles.securityNote}><Ionicons name="lock-closed" size={13} color={colors.muted} /><Text style={styles.securityText}>Private one-to-one messaging</Text></View>
        </View>}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1 },
  shellDesktop: { flexDirection: "row", margin: 24, borderRadius: 32, overflow: "hidden", backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOpacity: .06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  rail: { width: 76, backgroundColor: colors.primaryDark, alignItems: "center", paddingVertical: 18 },
  railLogo: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  railLogoText: { color: "white", fontSize: 20, fontFamily: fonts.semibold },
  railNav: { gap: 10, marginTop: 28 },
  railBottom: { marginTop: "auto", gap: 12, alignItems: "center" },
  listPanel: { flex: 1 },
  listPanelDesktop: { flex: 0, width: 350, backgroundColor: colors.surface, overflow: "hidden" },
  hero: { backgroundColor: colors.surface, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: colors.muted, fontSize: 9, fontFamily: fonts.regular, letterSpacing: 1.2 },
  greeting: { color: colors.ink, fontSize: 20, fontFamily: fonts.medium, marginTop: 4, letterSpacing: -.4 },
  profileButton: { borderRadius: 24 },
  search: { marginHorizontal: 18, marginTop: 8, height: 44, borderRadius: 22, backgroundColor: colors.surfaceMuted, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 9 },
  searchText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, flex: 1 },
  shortcut: { backgroundColor: colors.surface, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7 },
  shortcutText: { color: colors.muted, fontSize: 10, fontFamily: fonts.bold },
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 22, paddingTop: 22, paddingBottom: 8 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontFamily: fonts.medium, letterSpacing: -.4 },
  count: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11 },
  banner: { backgroundColor: "#FFF0EE", padding: 10, marginHorizontal: 16, borderRadius: 12 }, bannerText: { color: colors.danger, textAlign: "center", fontFamily: fonts.regular, fontSize: 12 },
  list: { flex: 1 },
  listContent: { paddingBottom: 90 },
  row: { flexDirection: "row", gap: 12, marginHorizontal: 12, marginVertical: 3, padding: 12, alignItems: "center", backgroundColor: colors.surface, borderRadius: 18 },
  rowPressed: { backgroundColor: colors.primarySoft, transform: [{ scale: .995 }] },
  onlineDot: { position: "absolute", width: 12, height: 12, borderRadius: 6, right: 0, bottom: 1, backgroundColor: colors.unread, borderWidth: 2, borderColor: colors.surface },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  name: { fontSize: 14, fontFamily: fonts.medium, color: colors.ink, flex: 1 },
  preview: { color: colors.muted, fontFamily: fonts.regular, marginTop: 4, flex: 1, fontSize: 12 }, time: { color: colors.muted, fontFamily: fonts.light, fontSize: 10 },
  unreadText: { color: colors.unread, fontWeight: "700" },
  badge: { backgroundColor: colors.unread, minWidth: 21, height: 21, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, marginTop: 5 },
  badgeText: { color: "white", fontWeight: "800", fontSize: 11 },
  fab: { position: "absolute", right: 20, bottom: 20, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: colors.shadow, shadowOpacity: .08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  emptyPane: { flex: 1, backgroundColor: colors.chat, alignItems: "center", justifyContent: "center", padding: 48, overflow: "hidden" },
  emptyGlow: { display: "none" },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { color: colors.ink, fontSize: 20, fontFamily: fonts.medium, textAlign: "center", maxWidth: 420, letterSpacing: -.4 },
  emptyDetail: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 430, marginTop: 10 },
  startButton: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 11, marginTop: 22 },
  startButtonText: { color: "white", fontFamily: fonts.medium, fontSize: 13 },
  securityNote: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 18 },
  securityText: { color: colors.muted, fontSize: 11 }
});
