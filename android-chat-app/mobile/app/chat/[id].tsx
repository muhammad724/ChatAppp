import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "@/api";
import { useAuth } from "@/auth";
import { Avatar, IconButton, StateView } from "@/components";
import { colors, fonts } from "@/theme";
import type { Conversation, Message } from "@/types";
import { getSocket } from "@/socket";

type History = { items: Message[]; nextCursor: string | null };
type UploadAsset = { uri: string; fileName: string; mimeType: string; fileSize: number };

export default function ChatScreen() {
  const { id, name, userId } = useLocalSearchParams<{ id: string; name?: string; userId?: string }>();
  const navigation = useNavigation();
  const { profile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<Message | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const [pinned, setPinned] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socket = getSocket();

  useLayoutEffect(() => navigation.setOptions({ headerShown: false }), [navigation]);
  const merge = useCallback((incoming: Message) => setMessages((current) => {
    const without = current.filter((message) => message.id !== incoming.id && message.clientId !== incoming.clientId);
    return [incoming, ...without].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }), []);
  const load = useCallback(async (next?: string) => {
    if (next) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await api<History>(`/conversations/${id}/messages${next ? `?cursor=${next}` : ""}`);
      setMessages((old) => next ? [...old, ...data.items] : data.items);
      setCursor(data.nextCursor);
      await api(`/conversations/${id}/read`, { method: "POST" });
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load messages"); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [id]);
  useEffect(() => {
    load();
    socket?.emit("conversation:join", { conversationId: id });
    const onNew = (message: Message) => { if (message.conversationId === id) { merge(message); api(`/conversations/${id}/read`, { method: "POST" }); } };
    const onUpdated = (message: Message) => { if (message.conversationId === id) merge(message); };
    const onDeleted = ({ id: messageId, deletedForEveryoneAt }: { id: string; deletedForEveryoneAt: string }) =>
      setMessages((old) => old.map((message) => message.id === messageId ? { ...message, text: null, imageUrl: null, deletedForEveryoneAt } : message));
    const onTyping = (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (payload.conversationId === id && payload.userId !== profile?.id) setTyping(payload.isTyping);
    };
    const onPresence = (payload: { userId: string; online: boolean }) => {
      if (payload.userId === userId) setOnline(payload.online);
    };
    const onReceipt = (payload: { conversationId: string }) => {
      if (payload.conversationId === id) setMessages((old) => old.map((message) =>
        message.senderId === profile?.id ? { ...message, status: "READ" } : message));
    };
    socket?.on("message:new", onNew); socket?.on("message:updated", onUpdated); socket?.on("message:deleted", onDeleted);
    socket?.on("typing:changed", onTyping); socket?.on("presence:changed", onPresence); socket?.on("messages:read", onReceipt);
    return () => {
      socket?.emit("typing:set", { conversationId: id, isTyping: false });
      socket?.off("message:new", onNew); socket?.off("message:updated", onUpdated); socket?.off("message:deleted", onDeleted);
      socket?.off("typing:changed", onTyping); socket?.off("presence:changed", onPresence); socket?.off("messages:read", onReceipt);
    };
  }, [id, load, merge, profile?.id, socket, userId]);
  useEffect(() => {
    if (!desktop) return;
    api<Conversation[]>("/conversations").then(setConversations).catch(() => setConversations([]));
  }, [desktop, id]);

  const updateTyping = (value: string) => {
    setText(value);
    socket?.emit("typing:set", { conversationId: id, isTyping: value.length > 0 });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit("typing:set", { conversationId: id, isTyping: false }), 1200);
  };
  const sendText = async () => {
    const body = text.trim();
    if (!body || !profile) return;
    if (editing) {
      try {
        merge(await api(`/messages/${editing.id}`, { method: "PATCH", body: JSON.stringify({ text: body }) }));
        setEditing(null); setText("");
      } catch (e) { Alert.alert("Edit failed", e instanceof Error ? e.message : "Try again"); }
      return;
    }
    setText("");
    socket?.emit("typing:set", { conversationId: id, isTyping: false });
    const clientId = crypto.randomUUID();
    const optimistic: Message = {
      id: clientId, clientId, conversationId: id, senderId: profile.id, type: "TEXT",
      text: body, status: "SENT", createdAt: new Date().toISOString(), pending: true
    };
    merge(optimistic);
    try {
      merge(await api("/messages", { method: "POST", body: JSON.stringify({ conversationId: id, clientId, type: "TEXT", text: body }) }));
    } catch { merge({ ...optimistic, pending: false, failed: true }); }
  };
  const pickImage = () => Alert.alert("Send a photo", undefined, [
    { text: "Gallery", onPress: async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: .85 });
      if (!result.canceled) upload(toUpload(result.assets[0]!));
    } },
    { text: "Camera", onPress: async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert("Camera permission is required");
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: .85 });
      if (!result.canceled) upload(toUpload(result.assets[0]!));
    } },
    { text: "Cancel", style: "cancel" }
  ]);
  const toUpload = (asset: ImagePicker.ImagePickerAsset): UploadAsset => ({
    uri: asset.uri,
    fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? "image/jpeg",
    fileSize: asset.fileSize ?? 0
  });
  const upload = async (asset: UploadAsset, existingClientId?: string) => {
    if (!profile) return;
    const clientId = existingClientId ?? crypto.randomUUID();
    const optimistic: Message = {
      id: clientId, clientId, conversationId: id, senderId: profile.id, type: "IMAGE", imageUrl: asset.uri,
      status: "SENT", createdAt: new Date().toISOString(), pending: true, progress: 0
    };
    merge(optimistic);
    try {
      const sign = await api<any>("/uploads/sign", { method: "POST", body: JSON.stringify({
        fileName: asset.fileName, mimeType: asset.mimeType, bytes: asset.fileSize || 1
      }) });
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: asset.fileName, type: asset.mimeType } as any);
      form.append("api_key", sign.apiKey); form.append("timestamp", String(sign.timestamp));
      form.append("public_id", sign.publicId); form.append("signature", sign.signature);
      const uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`);
        xhr.upload.onprogress = (event) => merge({ ...optimistic, progress: event.lengthComputable ? event.loaded / event.total : 0 });
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.onload = () => xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error("Upload failed"));
        xhr.send(form);
      });
      merge(await api("/messages", { method: "POST", body: JSON.stringify({
        conversationId: id, clientId, type: "IMAGE", imageUrl: uploaded.secure_url, cloudinaryPublicId: uploaded.public_id
      }) }));
    } catch {
      merge({ ...optimistic, pending: false, failed: true });
      Alert.alert("Image upload failed", "Tap the failed image to retry.");
    }
  };
  const actions = (message: Message) => {
    if (message.failed && message.imageUrl) return upload({ uri: message.imageUrl, fileName: "retry.jpg", mimeType: "image/jpeg", fileSize: 1 }, message.clientId);
    const own = message.senderId === profile?.id;
    const options: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [];
    if (own && message.type === "TEXT" && !message.deletedForEveryoneAt) options.push({ text: "Edit", onPress: () => {
      setEditing(message); setText(message.text ?? "");
    } });
    options.push({ text: "Delete for me", style: "destructive", onPress: async () => {
      await api(`/messages/${message.id}/me`, { method: "DELETE" }); setMessages((old) => old.filter((item) => item.id !== message.id));
    } });
    if (own) options.push({ text: "Delete for everyone", style: "destructive", onPress: () =>
      api(`/messages/${message.id}/everyone`, { method: "DELETE" }).catch((e) => Alert.alert("Delete failed", e.message))
    });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Message options", undefined, options);
  };
  if (loading) return <StateView loading title="Loading messages…" />;
  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View style={[styles.desktopFrame, desktop && styles.desktopFrameActive]}>
      {desktop && <View style={styles.rail}>
        <View style={styles.railLogo}><Text style={styles.railLogoText}>C</Text></View>
        <View style={styles.railNav}>
          <IconButton name="chatbubbles" label="Conversations" active onPress={() => router.replace("/home")} />
          <IconButton name="search" label="Search users" onPress={() => router.push("/search")} />
        </View>
        <View style={styles.railBottom}>
          <IconButton name="settings-outline" label="Settings" onPress={() => router.push("/dashboard")} />
          <IconButton name="log-out-outline" label="Log out" onPress={() => signOut()} />
          <Avatar name={profile?.displayName ?? "C"} uri={profile?.avatarUrl} size={40} />
        </View>
      </View>}
      {desktop && <View style={styles.conversationPanel}>
        <Pressable onPress={() => router.push("/search")} style={styles.sideSearch}>
          <Ionicons name="search" size={17} color={colors.muted} /><Text style={styles.sideSearchText}>Search</Text>
        </Pressable>
        <Text style={styles.sideTitle}>Messages</Text>
        <FlatList data={conversations} keyExtractor={(item) => item.id} contentContainerStyle={styles.sideList}
          showsVerticalScrollIndicator={false} renderItem={({ item }) => {
            const person = item.members[0]?.user;
            if (!person) return null;
            const last = item.messages[0];
            return <Pressable onPress={() => router.replace({ pathname: "/chat/[id]", params: { id: item.id, name: person.displayName, userId: person.id } })}
              style={[styles.sideRow, item.id === id && styles.sideRowActive]}>
              <View><Avatar name={person.displayName} uri={person.avatarUrl} size={44} /><View style={styles.sideOnline} /></View>
              <View style={styles.sideCopy}><View style={styles.sideTop}><Text numberOfLines={1} style={styles.sideName}>{person.displayName}</Text>
                <Text style={styles.sideTime}>{item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</Text></View>
                <Text numberOfLines={1} style={styles.sidePreview}>{last?.type === "IMAGE" ? "Photo" : last?.text ?? "Start chatting"}</Text></View>
            </Pressable>;
          }} />
      </View>}
      <View style={styles.chatMain}>
      <View style={styles.chatHeader}>
        {!desktop && <IconButton name="chevron-back" label="Back" onPress={() => router.back()} />}
        <View><Avatar name={name ?? "C"} size={44} /><View style={[styles.headerStatus, online && styles.headerStatusOnline]} /></View>
        <View style={styles.headerIdentity}>
          <Text numberOfLines={1} style={styles.headerName}>{name ?? "Conversation"}</Text>
          <Text style={[styles.presenceText, typing && styles.typingText]}>{typing ? "typing…" : online ? "Online now" : "Offline"}</Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton name={pinned ? "pin" : "pin-outline"} label="Pin conversation" active={pinned} onPress={() => setPinned((value) => !value)} />
          <IconButton name="image-outline" label="Shared images" onPress={() => Alert.alert("Shared images", "Images shared in this conversation appear here.")} />
          <IconButton name="document-outline" label="Shared files" onPress={() => Alert.alert("Shared files", "Files shared in this conversation appear here.")} />
        </View>
      </View>
      {!!error && <Pressable style={styles.error} onPress={() => load()}><Text style={styles.errorText}>{error} · Tap to retry</Text></Pressable>}
      <FlatList inverted data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        onEndReached={() => cursor && !loadingMore && load(cursor)} onEndReachedThreshold={.3}
        ListFooterComponent={loadingMore ? <Text style={styles.loadingMore}>Loading older messages…</Text> : null}
        ListEmptyComponent={<StateView title="Say hello" detail="Messages in this private conversation appear here." />}
        renderItem={({ item }) => {
          const mine = item.senderId === profile?.id;
          return <Pressable onLongPress={() => actions(item)} onPress={() => item.failed && actions(item)}
            style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            {item.deletedForEveryoneAt ? <Text style={styles.deleted}>This message was deleted</Text> : item.type === "IMAGE" && item.imageUrl
              ? <><Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
                {item.pending && <View style={styles.progress}><View style={[styles.progressFill, { width: `${(item.progress ?? 0) * 100}%` }]} /></View>}</>
              : <Text style={[styles.messageText, !mine && styles.receivedText]}>{item.text}</Text>}
            <View style={styles.meta}><Text style={styles.metaText}>{item.editedAt ? "edited · " : ""}{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              {mine && <Text style={[styles.receipt, item.status === "READ" && styles.read]}>{item.failed ? "!" : item.pending ? "◷" : item.status === "SENT" ? "✓" : "✓✓"}</Text>}</View>
          </Pressable>;
        }} />
      <View style={styles.composer}>
        {editing && <Pressable onPress={() => { setEditing(null); setText(""); }} style={styles.editing}><Text numberOfLines={1} style={styles.editingText}>Editing: {editing.text}</Text><Text style={styles.cancelEdit}>×</Text></Pressable>}
        <Pressable accessibilityLabel="Add emoji" onPress={() => Alert.alert("Emoji", "Emoji picker coming soon.")} style={styles.attach}><Ionicons name="happy-outline" size={21} color={colors.muted} /></Pressable>
        <Pressable accessibilityLabel="Attach image" onPress={pickImage} style={styles.attach}><Ionicons name="attach" size={21} color={colors.muted} /></Pressable>
        <TextInput multiline maxLength={4000} value={text} onChangeText={updateTyping} style={styles.textbox}
          placeholder="Write a message" placeholderTextColor="#A7ACA8" />
        <Pressable accessibilityLabel="Send message" disabled={!text.trim()} onPress={sendText} style={({ pressed }) => [styles.send, !text.trim() && styles.sendDisabled, pressed && styles.sendPressed]}>
          <Ionicons name="arrow-up" size={21} color="white" />
        </Pressable>
      </View>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  desktopFrame: { flex: 1 },
  desktopFrameActive: { flexDirection: "row", margin: 24, borderRadius: 32, overflow: "hidden", backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOpacity: .06, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  chatMain: { flex: 1, backgroundColor: colors.chat },
  rail: { width: 76, backgroundColor: colors.primaryDark, alignItems: "center", paddingVertical: 18 },
  railLogo: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  railLogoText: { color: "white", fontFamily: fonts.semibold, fontSize: 20 },
  railNav: { gap: 10, marginTop: 30 },
  railBottom: { marginTop: "auto", gap: 10, alignItems: "center" },
  conversationPanel: { width: 350, backgroundColor: colors.surface, paddingTop: 22 },
  sideSearch: { height: 42, marginHorizontal: 18, borderRadius: 21, backgroundColor: colors.surfaceMuted, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  sideSearchText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  sideTitle: { color: colors.ink, fontFamily: fonts.medium, fontSize: 20, letterSpacing: -.4, marginHorizontal: 22, marginTop: 22, marginBottom: 10 },
  sideList: { paddingHorizontal: 12, paddingBottom: 20 },
  sideRow: { flexDirection: "row", gap: 11, alignItems: "center", padding: 11, borderRadius: 18, marginVertical: 3 },
  sideRowActive: { backgroundColor: colors.primarySoft },
  sideOnline: { position: "absolute", right: 0, bottom: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.unread, borderWidth: 2, borderColor: colors.surface },
  sideCopy: { flex: 1 },
  sideTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  sideName: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  sideTime: { color: colors.muted, fontFamily: fonts.light, fontSize: 10 },
  sidePreview: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, marginTop: 3 },
  chatHeader: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, backgroundColor: colors.surface, shadowColor: colors.shadow, shadowOpacity: .06, shadowRadius: 10, elevation: 2 },
  headerStatus: { position: "absolute", right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.muted, borderWidth: 2, borderColor: colors.surface },
  headerStatusOnline: { backgroundColor: colors.unread },
  headerIdentity: { flex: 1 },
  headerName: { color: colors.ink, fontSize: 18, fontFamily: fonts.medium },
  headerActions: { flexDirection: "row", gap: 4 },
  presenceText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  typingText: { color: colors.accent },
  error: { backgroundColor: "#FFF0EE", padding: 8 }, errorText: { color: colors.danger, textAlign: "center", fontSize: 12 },
  list: { padding: 13, gap: 8 }, loadingMore: { textAlign: "center", color: colors.muted, padding: 10 },
  bubble: { maxWidth: "76%", borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10 },
  mine: { backgroundColor: colors.surface, alignSelf: "flex-end", borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.received, alignSelf: "flex-start", borderBottomLeftRadius: 6 },
  messageText: { color: colors.ink, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, paddingHorizontal: 2 },
  receivedText: { color: "white" },
  deleted: { color: colors.muted, fontStyle: "italic", paddingHorizontal: 3 },
  image: { width: 230, height: 220, borderRadius: 13, backgroundColor: colors.received },
  progress: { height: 4, backgroundColor: colors.received, borderRadius: 2, marginTop: 5, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: colors.primary },
  meta: { flexDirection: "row", alignSelf: "flex-end", gap: 4, alignItems: "center", marginTop: 3 },
  metaText: { color: colors.muted, fontFamily: fonts.light, fontSize: 10 }, receipt: { color: colors.muted, fontSize: 12, fontWeight: "800" }, read: { color: colors.accent },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, margin: 18, padding: 6, backgroundColor: colors.surface, borderRadius: 28, shadowColor: colors.shadow, shadowOpacity: .06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  editing: { position: "absolute", left: 8, right: 8, bottom: 60, backgroundColor: colors.primarySoft, borderLeftWidth: 4, borderColor: colors.primary, padding: 9, flexDirection: "row", zIndex: 2 },
  editingText: { flex: 1, color: colors.primaryDark }, cancelEdit: { color: colors.muted, fontSize: 20 },
  attach: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  textbox: { flex: 1, maxHeight: 110, minHeight: 44, backgroundColor: "transparent", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: .38, shadowOpacity: 0 },
  sendPressed: { transform: [{ scale: .93 }] }
});
