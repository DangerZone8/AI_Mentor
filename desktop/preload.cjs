const { contextBridge, ipcRenderer } = require("electron");

// Narrow allow-listed bridge only; renderer never receives Node.js or raw IPC.
contextBridge.exposeInMainWorld("codeQuestDesktop", Object.freeze({
  isDesktopApp: true,
  platform: process.platform,
  version: "0.1.0",
  chooseIndexFolder: () => ipcRenderer.invoke("codequest:choose-index-folder"),
  searchLocalFiles: (query) => ipcRenderer.invoke("codequest:search-local-files", String(query || "").slice(0, 300)),
  mentorChat: (request) => ipcRenderer.invoke("codequest:mentor-chat", {
    base: String(request?.base || "").slice(0, 500),
    token: String(request?.token || "").slice(0, 8192),
    prompt: String(request?.prompt || "").slice(0, 8000)
  })
}));
