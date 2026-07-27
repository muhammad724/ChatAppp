const DEFAULTS = {
  appUrl: "https://chat-appp-mu.vercel.app",
  apiUrl: "https://chat-appp-mu.vercel.app",
  notifications: true,
  refreshInterval: 1,
  sound: true,
  theme: "dark"
};
const $ = (id) => document.getElementById(id);
const normalizeUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

async function load() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  for (const key of ["appUrl", "apiUrl", "refreshInterval", "theme"]) {
    $(key).value = settings[key];
  }
  $("notifications").checked = settings.notifications;
  $("sound").checked = settings.sound;
}

$("settingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const appUrl = normalizeUrl($("appUrl").value);
  const apiUrl = normalizeUrl($("apiUrl").value);
  try {
    new URL(appUrl);
    new URL(apiUrl);
  } catch {
    $("status").textContent = "Enter valid web and API URLs.";
    $("status").style.color = "#fca5a5";
    return;
  }
  await chrome.storage.sync.set({
    appUrl,
    apiUrl,
    refreshInterval: Number($("refreshInterval").value),
    notifications: $("notifications").checked,
    sound: $("sound").checked,
    theme: $("theme").value
  });
  $("status").style.color = "#86efac";
  $("status").textContent = "Settings saved.";
  chrome.runtime.sendMessage({ type: "configurePolling" }).catch(() => {});
});

$("logoutButton").addEventListener("click", async () => {
  await chrome.storage.local.remove(["authToken", "user", "lastCheckedAt"]);
  await chrome.action.setBadgeText({ text: "" });
  $("status").style.color = "#86efac";
  $("status").textContent = "The extension has been signed out.";
});
load();
