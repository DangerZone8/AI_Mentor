const { app, BrowserWindow, globalShortcut, shell, ipcMain, dialog } = require("electron");
const { indexFolder, searchFiles } = require("./local-indexer.cjs");
const path = require("node:path");

const APP_URL = process.env.CODEQUEST_DESKTOP_URL || "https://ai-mentor-opal.vercel.app/";
let mainWindow;
let assistantWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 940, minWidth: 900, minHeight: 640,
    title: "CodeQuest", backgroundColor: "#0b1020", autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const current = new URL(mainWindow.webContents.getURL());
      const next = new URL(url);
      if (next.origin !== current.origin) {
        event.preventDefault();
        if (next.protocol === "https:" || next.protocol === "http:") shell.openExternal(url);
      }
    } catch { event.preventDefault(); }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.loadURL(APP_URL);
}

function createAssistantWindow() {
  if (assistantWindow && !assistantWindow.isDestroyed()) {
    assistantWindow.show();
    assistantWindow.focus();
    return;
  }
  assistantWindow = new BrowserWindow({
    width: 430, height: 680, minWidth: 360, minHeight: 500,
    title: "CodeQuest Assistant", backgroundColor: "#0b1020",
    alwaysOnTop: true, autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  assistantWindow.setAlwaysOnTop(true);
  assistantWindow.loadFile(path.join(__dirname, "assistant.html"));
  assistantWindow.on("closed", () => { assistantWindow = null; });
}

ipcMain.handle("codequest:choose-index-folder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return { canceled: false, ...await indexFolder(result.filePaths[0]) };
});
ipcMain.handle("codequest:search-local-files", (_event, query) => searchFiles(String(query || "").slice(0, 300)));
ipcMain.handle("codequest:mentor-chat", async (_event, request = {}) => {
  const base = String(request.base || "").trim().replace(/\\/+$/, "");
  const token = String(request.token || "").trim();
  const prompt = String(request.prompt || "").trim();
  let parsed;
  try { parsed = new URL(base); } catch { throw new Error("Enter a valid CodeQuest API URL."); }
  const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) throw new Error("Use HTTPS for the API URL (HTTP is allowed only for localhost development).");
  if (parsed.username || parsed.password) throw new Error("Do not put credentials in the API URL.");
  if (!token) throw new Error("A current Supabase access token is required.");
  if (!prompt || prompt.length > 8000) throw new Error("The request must contain between 1 and 8000 characters.");
  const response = await fetch(base + "/api/v1/mentor/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(60000)
  });
  const raw = await response.text();
  let payload = {};
  try { payload = JSON.parse(raw); } catch { /* Keep an empty payload for non-JSON errors. */ }
  if (!response.ok) throw new Error(payload.detail || "Request failed (" + response.status + "). Check the API URL, token, and backend configuration.");
  return { answer: payload.answer || "The API returned an empty answer." };
});

app.whenReady().then(() => {
  createMainWindow();
  // User-invoked shortcut. The companion is a normal visible window, not a
  // stealth capture-evasion mechanism; share the intended window/display.
  globalShortcut.register("CommandOrControl+Shift+Space", createAssistantWindow);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});
app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
