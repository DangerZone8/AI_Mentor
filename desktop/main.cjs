const { app, BrowserWindow, globalShortcut, shell, ipcMain, dialog, desktopCapturer, session, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");
const { indexFolder, searchFiles } = require("./local-indexer.cjs");
const { normalizeApiBase } = require("./api-url.cjs");
const path = require("node:path");

const APP_URL = process.env.CODEQUEST_DESKTOP_URL || "https://ai-mentor-opal.vercel.app/";
let mainWindow;
let assistantWindow;
let manualUpdateCheck = false;
let updateDialogOpen = false;
let updateMenuItem;

function showUpdateMessage(title, message, type = "info") {
  return dialog.showMessageBox(mainWindow && !mainWindow.isDestroyed() ? mainWindow : null, {
    type, title, message, buttons: ["OK"], noLink: true
  });
}

async function checkForUpdates(manual = false) {
  if (!app.isPackaged) {
    if (manual) await showUpdateMessage("Updates unavailable", "Update checks are available in an installed CodeQuest build, not while running from source.");
    return;
  }
  if (manualUpdateCheck) return;
  manualUpdateCheck = manual;
  if (updateMenuItem) updateMenuItem.label = "Checking for Updates…";
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    if (manual) await showUpdateMessage("Could not check for updates", error?.message || "Check your internet connection and try again.", "error");
    manualUpdateCheck = false;
    if (updateMenuItem) updateMenuItem.label = "Check for Updates…";
  }
}

function setupUpdater() {
  if (!app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.on("checking-for-update", () => {
    if (updateMenuItem) updateMenuItem.label = "Checking for Updates…";
  });
  autoUpdater.on("update-available", async (info) => {
    manualUpdateCheck = false;
    if (updateMenuItem) updateMenuItem.label = "Downloading Update…";
    await showUpdateMessage("CodeQuest update available", "Version " + info.version + " is available. CodeQuest will download it in the background.");
  });
  autoUpdater.on("update-not-available", async (info) => {
    const wasManual = manualUpdateCheck;
    manualUpdateCheck = false;
    if (updateMenuItem) updateMenuItem.label = "Check for Updates…";
    if (wasManual) await showUpdateMessage("CodeQuest is up to date", "You are using the latest available version" + (info?.version ? " (" + info.version + ")" : "") + ".");
  });
  autoUpdater.on("download-progress", (progress) => {
    if (updateMenuItem) updateMenuItem.label = "Downloading Update… " + Math.round(progress.percent) + "%";
  });
  autoUpdater.on("update-downloaded", async (info) => {
    if (updateMenuItem) updateMenuItem.label = "Restart to Install Update";
    if (updateDialogOpen) return;
    updateDialogOpen = true;
    try {
      const result = await dialog.showMessageBox(mainWindow && !mainWindow.isDestroyed() ? mainWindow : null, {
        type: "info",
        title: "CodeQuest update ready",
        message: "CodeQuest " + info.version + " is downloaded and ready to install.",
        detail: "Restart CodeQuest to finish installing the update. You can also do this later.",
        buttons: ["Restart and Install", "Later"],
        defaultId: 0, cancelId: 1, noLink: true
      });
      if (result.response === 0) autoUpdater.quitAndInstall();
    } finally {
      updateDialogOpen = false;
    }
  });
  autoUpdater.on("error", async (error) => {
    const wasManual = manualUpdateCheck;
    manualUpdateCheck = false;
    if (updateMenuItem) updateMenuItem.label = "Check for Updates…";
    if (wasManual) await showUpdateMessage("Update check failed", error?.message || "The update service could not be reached.", "error");
  });
  setTimeout(() => checkForUpdates(false), 10000);
  setInterval(() => checkForUpdates(false), 6 * 60 * 60 * 1000);
}

function installAppMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{
      label: "CodeQuest",
      submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }]
    }] : []),
    {
      label: "Help",
      submenu: [
        {
          label: "Check for Updates…",
          click: () => checkForUpdates(true),
          id: "check-for-updates"
        },
        { type: "separator" },
        { label: "Open CodeQuest website", click: () => shell.openExternal(APP_URL) }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  updateMenuItem = menu.getMenuItemById("check-for-updates");
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 940, minWidth: 900, minHeight: 640,
    title: "CodeQuest", backgroundColor: "#0b1020", autoHideMenuBar: false,
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
    if (assistantWindow.isVisible()) assistantWindow.focus();
    else { assistantWindow.show(); assistantWindow.focus(); }
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
  assistantWindow.setAlwaysOnTop(true, "floating");
  assistantWindow.loadFile(path.join(__dirname, "assistant.html"));
  assistantWindow.on("closed", () => { assistantWindow = null; });
}

ipcMain.handle("codequest:assistant-control", (_event, action) => {
  if (!assistantWindow || assistantWindow.isDestroyed()) return { ok: false };
  if (action === "hide") { assistantWindow.hide(); return { ok: true, hidden: true }; }
  if (action === "always-on-top") {
    const enabled = !assistantWindow.isAlwaysOnTop();
    assistantWindow.setAlwaysOnTop(enabled, "floating");
    return { ok: true, alwaysOnTop: enabled };
  }
  if (action === "compact") {
    const compact = assistantWindow.getSize()[0] < 400;
    if (compact) assistantWindow.setSize(430, 680, true);
    else assistantWindow.setSize(340, 480, true);
    assistantWindow.center();
    return { ok: true, compact: !compact };
  }
  return { ok: false, error: "Unknown assistant action." };
});
ipcMain.handle("codequest:choose-index-folder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return { canceled: false, ...await indexFolder(result.filePaths[0]) };
});
ipcMain.handle("codequest:get-app-config", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { apiBase: "" };
  try {
    const expectedOrigin = new URL(APP_URL).origin;
    const currentOrigin = new URL(mainWindow.webContents.getURL()).origin;
    if (currentOrigin !== expectedOrigin) return { apiBase: "" };
    return await mainWindow.webContents.executeJavaScript(
      '({ apiBase: typeof API_BASE_URL === "string" ? API_BASE_URL : (window.CODEQUEST_API_BASE || "") })',
      true
    );
  } catch {
    return { apiBase: "" };
  }
});
ipcMain.handle("codequest:get-session-token", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { token: "" };
  try {
    const expectedOrigin = new URL(APP_URL).origin;
    const currentOrigin = new URL(mainWindow.webContents.getURL()).origin;
    if (currentOrigin !== expectedOrigin) return { token: "" };
    const token = await mainWindow.webContents.executeJavaScript(
      'typeof verifiedAccessToken === "string" ? verifiedAccessToken : ""',
      true
    );
    return { token: typeof token === "string" ? token : "" };
  } catch {
    return { token: "" };
  }
});
ipcMain.handle("codequest:search-local-files", (_event, query) => searchFiles(String(query || "").slice(0, 300)));
ipcMain.handle("codequest:mentor-chat", async (_event, request = {}) => {
  const token = String(request.token || "").trim();
  const prompt = String(request.prompt || "").trim();
  const base = normalizeApiBase(request.base, [APP_URL, process.env.CODEQUEST_API_BASE_URL]);
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
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 0, height: 0 },
        fetchWindowIcons: false
      });
      if (!sources.length) { callback({}); return; }
      const choices = sources.slice(0, 5);
      const buttons = choices.map((source, index) =>
        (index + 1) + ". " + String(source.name || "Screen/window").slice(0, 48)
      );
      buttons.push("Cancel");
      const result = await dialog.showMessageBox({
        type: "question",
        title: "Choose what CodeQuest can capture",
        message: "Select the screen or window to share.",
        detail: "Only the source you choose will be captured. Stop sharing at any time.",
        buttons,
        defaultId: 0,
        cancelId: buttons.length - 1,
        noLink: true
      });
      if (result.response < 0 || result.response >= choices.length) {
        callback({});
        return;
      }
      const selected = choices[result.response];
      const grant = { video: selected };
      if (request.audioRequested && process.platform === "win32") grant.audio = "loopback";
      callback(grant);
    } catch {
      callback({});
    }
  }, { useSystemPicker: true });

  installAppMenu();
  createMainWindow();
  setupUpdater();
  globalShortcut.register("CommandOrControl+Shift+Space", createAssistantWindow);
  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (assistantWindow && !assistantWindow.isDestroyed() && assistantWindow.isVisible()) assistantWindow.hide();
    else createAssistantWindow();
  });
  globalShortcut.register("CommandOrControl+Shift+Enter", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.executeJavaScript(
      'document.getElementById("gl-scan-now")?.click()'
    ).catch(() => {});
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});
app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
