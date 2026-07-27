const DEFAULTS = {
  appUrl: "http://localhost:3000",
  apiUrl: "http://localhost:3000",
  notifications: true,
  refreshInterval: 1,
  sound: true
};
const ALARM = "convo-refresh";
const normalizeUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

async function configurePolling() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  const period = Math.max(1, Number(settings.refreshInterval) || 1);
  await chrome.alarms.clear(ALARM);
  await chrome.alarms.create(ALARM, { delayInMinutes: 0.1, periodInMinutes: period });
}

async function checkUnread({ notify = true } = {}) {
  const [settings, local] = await Promise.all([
    chrome.storage.sync.get(DEFAULTS),
    chrome.storage.local.get(["authToken", "lastCheckedAt"])
  ]);
  if (!local.authToken) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  const base = normalizeUrl(settings.apiUrl || settings.appUrl);
  const since = local.lastCheckedAt ? `?since=${encodeURIComponent(local.lastCheckedAt)}` : "";
  try {
    const response = await fetch(`${base}/api/messages/unread${since}`, {
      headers: { Authorization: `Bearer ${local.authToken}` }
    });
    if (response.status === 401) {
      await chrome.storage.local.remove(["authToken", "user", "lastCheckedAt"]);
      await chrome.action.setBadgeText({ text: "" });
      return;
    }
    if (!response.ok) return;
    const result = await response.json();
    const count = Number(result.data?.count) || 0;
    await chrome.action.setBadgeBackgroundColor({ color: "#3B82F6" });
    await chrome.action.setBadgeText({ text: count ? (count > 99 ? "99+" : String(count)) : "" });
    if (notify && settings.notifications && local.lastCheckedAt) {
      for (const message of result.data?.messages || []) {
        const notificationId = `convo:${message.conversationId}:${message.id}`;
        await chrome.notifications.create(notificationId, {
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: message.sender?.username || "New Convo message",
          message: String(message.content || "Sent a message").slice(0, 180),
          contextMessage: "Convo",
          silent: settings.sound === false
        });
      }
    }
    await chrome.storage.local.set({ lastCheckedAt: result.data?.checkedAt || new Date().toISOString() });
  } catch {
    // Network failures are intentionally silent in a service worker.
  }
}

chrome.runtime.onInstalled.addListener(() => {
  configurePolling();
  checkUnread({ notify: false });
});
chrome.runtime.onStartup.addListener(() => {
  configurePolling();
  checkUnread({ notify: false });
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) checkUnread();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && ("refreshInterval" in changes || "apiUrl" in changes || "appUrl" in changes)) {
    configurePolling();
  }
});
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const [, conversationId] = notificationId.split(":");
  const settings = await chrome.storage.sync.get(DEFAULTS);
  if (conversationId) {
    await chrome.tabs.create({
      url: `${normalizeUrl(settings.appUrl)}/conversations/${encodeURIComponent(conversationId)}`
    });
  }
  await chrome.notifications.clear(notificationId);
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "refreshUnread") {
    checkUnread({ notify: false }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === "configurePolling") {
    configurePolling().then(() => checkUnread({ notify: false })).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
