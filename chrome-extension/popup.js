const DEFAULTS = {
  appUrl: "https://chat-appp-mu.vercel.app",
  apiUrl: "https://chat-appp-mu.vercel.app",
  notifications: true,
  refreshInterval: 1,
  sound: true,
  theme: "dark"
};

const state = {
  settings: { ...DEFAULTS },
  token: "",
  user: null,
  conversations: [],
  activeConversation: null,
  currentUserId: ""
};
const $ = (id) => document.getElementById(id);
const normalizeUrl = (value) => String(value || "").trim().replace(/\/+$/, "");
const initials = (name) => String(name || "C").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

function setAvatar(element, user, fallbackName) {
  const url = user?.avatar;
  element.textContent = url ? "" : initials(user?.username || fallbackName);
  element.style.backgroundImage = url ? `url("${url.replaceAll('"', "%22")}")` : "";
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function conversationPerson(conversation) {
  if (conversation.type === "group") {
    return { username: conversation.name || "Group chat", avatar: conversation.avatar };
  }
  return conversation.participants?.find((entry) => entry.userId !== state.currentUserId)?.user
    || conversation.participants?.[0]?.user
    || { username: "Conversation", avatar: null };
}

async function api(path, options = {}) {
  const base = normalizeUrl(state.settings.apiUrl || state.settings.appUrl);
  if (!base) throw new Error("Configure the app URL in extension settings.");
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    await chrome.storage.local.remove(["authToken", "user"]);
    state.token = "";
    showLogin("Your session expired. Please sign in again.");
  }
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

function showLogin(message = "") {
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
  $("loginError").textContent = message;
  $("loginError").classList.toggle("hidden", !message);
}

function showApp() {
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("userName").textContent = state.user?.username || state.user?.email || "Convo user";
  setAvatar($("userAvatar"), state.user, state.user?.username);
}

function renderSkeletons() {
  $("conversationList").innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
}

function renderConversations() {
  const query = $("searchInput").value.trim().toLowerCase();
  const items = state.conversations.filter((conversation) => {
    const person = conversationPerson(conversation);
    return !query || person.username?.toLowerCase().includes(query)
      || conversation.lastMessage?.content?.toLowerCase().includes(query);
  });
  const list = $("conversationList");
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = query ? "No matching conversations." : "No conversations yet. Start one in the full Convo app.";
    list.append(empty);
  }

  for (const conversation of items) {
    const person = conversationPerson(conversation);
    const button = document.createElement("button");
    button.className = "conversation";
    button.type = "button";
    const avatarWrap = document.createElement("div");
    avatarWrap.className = "avatar-wrap";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    setAvatar(avatar, person, person.username);
    const presence = document.createElement("i");
    presence.className = "presence";
    avatarWrap.append(avatar, presence);

    const body = document.createElement("div");
    body.className = "conversation-body";
    const line = document.createElement("div");
    line.className = "conversation-line";
    const name = document.createElement("span");
    name.className = "conversation-name";
    name.textContent = person.username || "Conversation";
    const time = document.createElement("time");
    time.className = "conversation-time";
    time.textContent = formatTime(conversation.lastMessage?.createdAt || conversation.updatedAt);
    line.append(name, time);
    const preview = document.createElement("p");
    preview.className = "conversation-preview";
    preview.textContent = conversation.lastMessage?.content || "No messages yet";
    body.append(line, preview);
    button.append(avatarWrap, body);
    if (conversation.unreadCount > 0) {
      const badge = document.createElement("span");
      badge.className = "unread";
      badge.textContent = conversation.unreadCount > 99 ? "99+" : String(conversation.unreadCount);
      button.append(badge);
    }
    button.addEventListener("click", () => openChat(conversation));
    list.append(button);
  }

  const total = state.conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
  $("totalUnread").textContent = total > 99 ? "99+" : String(total);
  $("totalUnread").classList.toggle("hidden", total === 0);
}

async function loadConversations(silent = false) {
  if (!silent) renderSkeletons();
  try {
    const result = await api("/api/chats");
    state.conversations = result.data || [];
    state.currentUserId = result.currentUserId || state.user?.id || "";
    renderConversations();
    chrome.runtime.sendMessage({ type: "refreshUnread" }).catch(() => {});
  } catch (error) {
    $("conversationList").innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = error.message;
    $("conversationList").append(empty);
  }
}

async function openChat(conversation) {
  state.activeConversation = conversation;
  const person = conversationPerson(conversation);
  $("chatName").textContent = person.username || "Conversation";
  setAvatar($("chatAvatar"), person, person.username);
  $("listView").classList.add("hidden");
  $("chatView").classList.remove("hidden");
  $("messageList").innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  $("messageError").classList.add("hidden");
  try {
    const result = await api(`/api/chats/${encodeURIComponent(conversation.id)}/messages`);
    state.currentUserId = result.currentUserId || state.currentUserId;
    renderMessages(result.data || []);
    await api("/api/messages/read", {
      method: "PATCH",
      body: JSON.stringify({ conversationId: conversation.id })
    });
    conversation.unreadCount = 0;
    chrome.runtime.sendMessage({ type: "refreshUnread" }).catch(() => {});
  } catch (error) {
    $("messageList").innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = error.message;
    $("messageList").append(empty);
  }
}

function renderMessages(messages) {
  const list = $("messageList");
  list.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No messages yet. Say hello.";
    list.append(empty);
  }
  for (const item of messages) {
    const bubble = document.createElement("div");
    bubble.className = `message${item.senderId === state.currentUserId ? " sent" : ""}`;
    const text = document.createElement("span");
    text.textContent = item.isDeleted ? "Message deleted" : item.content;
    const time = document.createElement("time");
    time.textContent = formatTime(item.createdAt);
    bubble.append(text, time);
    list.append(bubble);
  }
  list.scrollTop = list.scrollHeight;
}

async function submitLogin(event) {
  event.preventDefault();
  const button = $("loginButton");
  button.disabled = true;
  button.textContent = "Signing in…";
  $("loginError").classList.add("hidden");
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: $("email").value.trim(), password: $("password").value })
    });
    state.token = result.data.token;
    state.user = result.data.user;
    await chrome.storage.local.set({ authToken: state.token, user: state.user });
    $("password").value = "";
    showApp();
    await loadConversations();
    chrome.runtime.sendMessage({ type: "configurePolling" }).catch(() => {});
  } catch (error) {
    $("loginError").textContent = error.message;
    $("loginError").classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Sign in";
  }
}

async function sendMessage(event) {
  event.preventDefault();
  const content = $("messageInput").value.trim();
  if (!content || !state.activeConversation) return;
  $("sendButton").disabled = true;
  $("messageError").classList.add("hidden");
  try {
    const result = await api(`/api/chats/${encodeURIComponent(state.activeConversation.id)}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, type: "text" })
    });
    $("messageInput").value = "";
    if (!$("messageList").querySelector(".message")) $("messageList").replaceChildren();
    const bubble = document.createElement("div");
    bubble.className = "message sent";
    const text = document.createElement("span");
    text.textContent = result.data.content;
    const time = document.createElement("time");
    time.textContent = formatTime(result.data.createdAt);
    bubble.append(text, time);
    $("messageList").append(bubble);
    $("messageList").scrollTop = $("messageList").scrollHeight;
  } catch (error) {
    $("messageError").textContent = error.message;
    $("messageError").classList.remove("hidden");
  } finally {
    $("sendButton").disabled = false;
    $("messageInput").focus();
  }
}

function openApp(path = "/conversations") {
  chrome.tabs.create({ url: `${normalizeUrl(state.settings.appUrl)}${path}` });
}

async function initialize() {
  const [settings, local] = await Promise.all([
    chrome.storage.sync.get(DEFAULTS),
    chrome.storage.local.get(["authToken", "user"])
  ]);
  state.settings = { ...DEFAULTS, ...settings };
  state.token = local.authToken || "";
  state.user = local.user || null;
  document.documentElement.dataset.theme = state.settings.theme === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : state.settings.theme;
  if (!state.token) return showLogin();
  showApp();
  await loadConversations();
}

$("loginForm").addEventListener("submit", submitLogin);
$("messageForm").addEventListener("submit", sendMessage);
$("searchInput").addEventListener("input", renderConversations);
$("refreshButton").addEventListener("click", () => loadConversations());
$("optionsButton").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("openOptionsLogin").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("openFullApp").addEventListener("click", () => openApp());
$("backButton").addEventListener("click", () => {
  $("chatView").classList.add("hidden");
  $("listView").classList.remove("hidden");
  state.activeConversation = null;
  renderConversations();
});
$("openConversation").addEventListener("click", () => {
  if (state.activeConversation) openApp(`/conversations/${state.activeConversation.id}`);
});
initialize();
