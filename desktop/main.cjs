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
      preload: path.join(__dirname, "preload.cjs"),
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
