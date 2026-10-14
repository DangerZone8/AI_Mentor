const { contextBridge } = require("electron");

// Keep the renderer isolated. Add narrowly scoped, consent-based desktop APIs
// here only when a feature needs them; never expose Node.js or arbitrary IPC.
contextBridge.exposeInMainWorld("codeQuestDesktop", Object.freeze({
  isDesktopApp: true,
  platform: process.platform,
  version: "0.1.0"
}));
