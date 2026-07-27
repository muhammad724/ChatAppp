import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, CheckCheck, File, Image, LogOut, Menu, MessageCircle,
  Paperclip, Pin, Plus, Search, Send, Settings, Smile, UserRound, Users, X
} from "lucide-react";
import { WhiteboardModal } from "./components/WhiteboardModal";
import { uploadDrawing } from "./services/mediaUpload";

type User = { id: string; name: string; email: string; password: string; color: string; online: boolean };
type Message = { id: string; senderId: string; text: string; imageUrl?: string; createdAt: number; status: "sent" | "sending" | "error" };
type Chat = { id: string; memberIds: string[]; messages: Message[]; pinned: boolean };

const STORAGE_KEY = "convo-desktop-state-v2";
const SESSION_KEY = "convo-desktop-session-v2";
const colors = ["#E8B5A8", "#AFCDB9", "#C8B9A9", "#A9C5C1", "#D1B8C4", "#BFC9A8"];
const id = () => crypto.randomUUID();

type Store = { users: User[]; chats: Chat[] };
const blankStore: Store = { users: [], chats: [] };

function readStore(): Store {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "") as Store; }
  catch { return blankStore; }
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function timeLabel(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ user, size = "normal" }: { user: User; size?: "small" | "normal" | "large" }) {
  return <div className={`avatar ${size}`} style={{ background: user.color }}>
    {initials(user.name)}{user.online && <i className="online-dot" />}
  </div>;
}

function Auth({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || password.length < 6 || (mode === "register" && name.trim().length < 2)) {
      setError(mode === "register" ? "Enter your name and a password with at least 6 characters." : "Enter a valid email and password.");
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      const store = readStore();
      if (mode === "register") {
        if (store.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
          setLoading(false); setError("An account with this email already exists."); return;
        }
        const user: User = { id: id(), name: name.trim(), email: email.trim().toLowerCase(), password, color: colors[store.users.length % colors.length], online: true };
        const next = { ...store, users: [...store.users, user] };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        localStorage.setItem(SESSION_KEY, user.id);
        onAuthenticated(user);
      } else {
        const user = store.users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password);
        if (!user) { setLoading(false); setError("Email or password is incorrect."); return; }
        localStorage.setItem(SESSION_KEY, user.id);
        onAuthenticated({ ...user, online: true });
      }
      setLoading(false);
    }, 450);
  };

  return <main className="auth-page">
    <div className="ambient one" /><div className="ambient two" />
    <form className="auth-card" onSubmit={submit}>
      <div className="auth-logo"><MessageCircle size={21} fill="currentColor" /></div>
      <div className="auth-brand">Convo</div>
      <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p>{mode === "login" ? "Sign in to continue your conversations." : "Join Convo and start a conversation."}</p>
      {error && <div className="error-banner">{error}</div>}
      {mode === "register" && <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>}
      <label>Email address<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@example.com" /></label>
      <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="At least 6 characters" /></label>
      <button className="primary-action" disabled={loading}>{loading ? <span className="spinner" /> : mode === "login" ? "Sign in" : "Create account"}</button>
      <div className="auth-switch">{mode === "login" ? "New to Convo?" : "Already have an account?"} <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></div>
    </form>
  </main>;
}

function App() {
  const [store, setStore] = useState<Store>(readStore);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const store = readStore(); return store.users.find((user) => user.id === localStorage.getItem(SESSION_KEY)) || null;
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [panel, setPanel] = useState<"media" | "files" | "settings" | null>(null);
  const [userSearch, setUserSearch] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [connection, setConnection] = useState<"online" | "reconnecting" | "error">("online");
  const [attachmentMenu, setAttachmentMenu] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store]);

  const chats = useMemo(() => {
    if (!currentUser) return [];
    return store.chats.filter((chat) => chat.memberIds.includes(currentUser.id)).sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.messages[b.messages.length - 1]?.createdAt || 0) - (a.messages[a.messages.length - 1]?.createdAt || 0);
    });
  }, [store, currentUser]);
  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;
  const otherUser = activeChat && currentUser ? store.users.find((user) => activeChat.memberIds.includes(user.id) && user.id !== currentUser.id) : null;
  const discoverUsers = currentUser ? store.users.filter((user) => user.id !== currentUser.id && user.name.toLowerCase().includes(query.toLowerCase())) : [];
  const visibleChats = chats.filter((chat) => {
    const other = store.users.find((user) => chat.memberIds.includes(user.id) && user.id !== currentUser?.id);
    return other?.name.toLowerCase().includes(query.toLowerCase());
  });

  const openUser = (user: User) => {
    if (!currentUser) return;
    let chat = store.chats.find((item) => item.memberIds.includes(currentUser.id) && item.memberIds.includes(user.id));
    if (!chat) {
      chat = { id: id(), memberIds: [currentUser.id, user.id], messages: [], pinned: false };
      setStore((value) => ({ ...value, chats: [...value.chats, chat!] }));
    }
    setActiveChatId(chat.id); setUserSearch(false); setQuery(""); setDrawer(false);
  };

  const send = () => {
    if (!draft.trim() || !activeChat || !currentUser || connection !== "online") return;
    const message: Message = { id: id(), senderId: currentUser.id, text: draft.trim(), createdAt: Date.now(), status: "sending" };
    setDraft("");
    setStore((value) => ({ ...value, chats: value.chats.map((chat) => chat.id === activeChat.id ? { ...chat, messages: [...chat.messages, message] } : chat) }));
    window.setTimeout(() => setStore((value) => ({ ...value, chats: value.chats.map((chat) => chat.id === activeChat.id ? { ...chat, messages: chat.messages.map((item) => item.id === message.id ? { ...item, status: "sent" } : item) } : chat) })), 350);
  };

  const sendDrawing = async (blob: Blob) => {
    if (!activeChat || !currentUser) return;
    const messageId = id();
    const placeholder: Message = { id: messageId, senderId: currentUser.id, text: "Whiteboard drawing", createdAt: Date.now(), status: "sending" };
    setStore((value) => ({ ...value, chats: value.chats.map((chat) => chat.id === activeChat.id ? { ...chat, messages: [...chat.messages, placeholder] } : chat) }));
    try {
      const imageUrl = await uploadDrawing(blob);
      setStore((value) => ({ ...value, chats: value.chats.map((chat) => chat.id === activeChat.id ? { ...chat, messages: chat.messages.map((message) => message.id === messageId ? { ...message, imageUrl, status: "sent" } : message) } : chat) }));
    } catch {
      setStore((value) => ({ ...value, chats: value.chats.map((chat) => chat.id === activeChat.id ? { ...chat, messages: chat.messages.map((message) => message.id === messageId ? { ...message, status: "error" } : message) } : chat) }));
      throw new Error("Drawing upload failed");
    }
  };

  const logout = () => { localStorage.removeItem(SESSION_KEY); setCurrentUser(null); setActiveChatId(null); };
  if (!currentUser) return <Auth onAuthenticated={(user) => { setStore(readStore()); setCurrentUser(user); }} />;

  return <main className="desktop-page">
    <section className="app-frame">
      <nav className="nav-rail">
        <div className="logo-square"><MessageCircle size={20} fill="currentColor" /></div>
        <div className="nav-center">
          <button className="active" title="Messages"><MessageCircle size={19} /></button>
          <button onClick={() => { setUserSearch(true); setDrawer(true); }} title="People"><Users size={19} /></button>
        </div>
        <div className="nav-bottom">
          <button onClick={() => setPanel("settings")} title="Settings"><Settings size={18} /></button>
          <button onClick={logout} title="Log out"><LogOut size={18} /></button>
          <Avatar user={currentUser} size="small" />
        </div>
      </nav>

      <aside className={`messages-panel ${drawer ? "drawer-open" : ""}`}>
        <div className="mobile-panel-head"><strong>Convo</strong><button onClick={() => setDrawer(false)}><X size={18} /></button></div>
        <label className="conversation-search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setUserSearch(false)} placeholder={userSearch ? "Find a person" : "Search messages"} />
        </label>
        <div className="messages-heading"><h1>{userSearch ? "People" : "Messages"}</h1><button onClick={() => { setUserSearch(true); setQuery(""); window.setTimeout(() => document.querySelector<HTMLInputElement>(".conversation-search input")?.focus(), 0); }}><Plus size={18} /></button></div>
        <div className="conversation-list">
          {userSearch ? discoverUsers.map((user) => <button className="conversation" key={user.id} onClick={() => openUser(user)}>
            <Avatar user={user} /><span className="conversation-copy"><strong>{user.name}</strong><span>{user.email}</span></span>
          </button>) : visibleChats.map((chat) => {
            const user = store.users.find((item) => chat.memberIds.includes(item.id) && item.id !== currentUser.id)!;
            const last = chat.messages[chat.messages.length - 1];
            return <button className={`conversation ${activeChatId === chat.id ? "selected" : ""}`} key={chat.id} onClick={() => { setActiveChatId(chat.id); setDrawer(false); }}>
              <Avatar user={user} /><span className="conversation-copy"><strong>{user.name}</strong><span>{last?.text || "Start a conversation"}</span></span>
              <span className="conversation-meta">{chat.pinned && <Pin size={10} fill="currentColor" />}{last ? timeLabel(last.createdAt) : ""}</span>
            </button>;
          })}
          {((userSearch && !discoverUsers.length) || (!userSearch && !visibleChats.length)) && <div className="empty-list"><UserRound size={25} /><strong>{userSearch ? "No people found" : "No conversations yet"}</strong><p>{userSearch ? "Try another name." : "Create another account, then find them here."}</p></div>}
        </div>
      </aside>

      <section className="chat-area">
        <button className="mobile-menu" onClick={() => setDrawer(true)}><Menu size={19} /></button>
        {connection !== "online" && <button className={`connection-state ${connection}`} onClick={() => { setConnection("reconnecting"); setTimeout(() => setConnection("online"), 900); }}>
          {connection === "reconnecting" ? "Reconnecting…" : "Connection lost — click to retry"}
        </button>}
        {activeChat && otherUser ? <>
          <header className="chat-header">
            <div className="chat-person"><Avatar user={otherUser} /><div><h2>{otherUser.name}</h2><span><i />Online</span></div></div>
            <div className="chat-tools">
              <button className={activeChat.pinned ? "pressed" : ""} onClick={() => setStore((value) => ({ ...value, chats: value.chats.map((chat) => chat.id === activeChat.id ? { ...chat, pinned: !chat.pinned } : chat) }))}><Pin size={17} fill={activeChat.pinned ? "currentColor" : "none"} /></button>
              <button onClick={() => setPanel("media")}><Image size={18} /></button>
              <button onClick={() => setPanel("files")}><File size={17} /></button>
            </div>
          </header>
          <div className="message-canvas">
            {!activeChat.messages.length && <div className="empty-chat"><Avatar user={otherUser} size="large" /><h2>Start a conversation with {otherUser.name.split(" ")[0]}</h2><p>Messages you send will appear here.</p></div>}
            {activeChat.messages.map((message) => {
              const mine = message.senderId === currentUser.id;
              return <div className={`message-row ${mine ? "outgoing" : "incoming"}`} key={message.id}>
                <div className={`message-bubble ${message.imageUrl ? "image-message" : ""}`}>
                  {message.imageUrl ? <img src={message.imageUrl} alt="Whiteboard drawing" /> : message.text}
                  {message.status === "sending" && !message.imageUrl && message.text === "Whiteboard drawing" && <span className="drawing-uploading">Uploading drawing…</span>}
                </div>
                <span>{timeLabel(message.createdAt)} {mine && (message.status === "sending" ? "Sending…" : message.status === "error" ? "Failed" : <CheckCheck size={13} />)}</span>
              </div>;
            })}
          </div>
          <footer className="message-composer">
            <button><Smile size={19} /></button>
            <div className="attachment-wrap">
              <button onClick={() => setAttachmentMenu(!attachmentMenu)} aria-label="Attachments"><Paperclip size={18} /></button>
              {attachmentMenu && <div className="attachment-menu">
                <button onClick={() => { setAttachmentMenu(false); setWhiteboardOpen(true); }}><span>🎨</span><div><strong>Whiteboard</strong><small>Draw and send an idea</small></div></button>
              </div>}
            </div>
            <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Write a message" />
            <button className="send-button" onClick={send} disabled={!draft.trim()}><Send size={17} fill="currentColor" /></button>
          </footer>
        </> : <div className="welcome-state">
          <div className="welcome-logo"><MessageCircle size={24} fill="currentColor" /></div><h1>Your conversations</h1>
          <p>Select a message or find someone to start talking.</p><button onClick={() => { setUserSearch(true); setDrawer(true); }}>Start a message</button>
        </div>}
      </section>

      {panel && <div className="side-sheet">
        <header><button onClick={() => setPanel(null)}><ArrowLeft size={18} /></button><strong>{panel === "media" ? "Shared images" : panel === "files" ? "Shared files" : "Settings"}</strong></header>
        {panel === "settings" ? <div className="settings-content"><Avatar user={currentUser} size="large" /><h2>{currentUser.name}</h2><p>{currentUser.email}</p><button onClick={() => setConnection(connection === "online" ? "error" : "online")}>Test connection state</button><button className="danger" onClick={logout}>Log out</button></div> : <div className="sheet-empty">{panel === "media" ? <Image size={27} /> : <File size={27} />}<strong>No shared {panel} yet</strong><p>Items shared in this conversation will appear here.</p></div>}
      </div>}
      {whiteboardOpen && <WhiteboardModal onClose={() => setWhiteboardOpen(false)} onSend={sendDrawing} />}
      {drawer && <button className="drawer-scrim" onClick={() => setDrawer(false)} aria-label="Close menu" />}
    </section>
  </main>;
}

export default App;
