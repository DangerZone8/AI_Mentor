const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const main = fs.readFileSync(path.join(__dirname, "..", "main.cjs"), "utf8");

test("desktop registers an explicit display-media capture handler before creating windows", () => {
  const handler = main.indexOf("session.defaultSession.setDisplayMediaRequestHandler");
  const createWindow = main.indexOf("createMainWindow();", handler);
  assert.notEqual(handler, -1, "native Electron display-media handler must be registered");
  assert.notEqual(createWindow, -1, "main window must be created after the capture handler is registered");
  assert.ok(handler < createWindow, "capture handler must be installed before the hosted page can request capture");
});

test("capture handler asks the user to select a source and supports cancellation", () => {
  assert.match(main, /desktopCapturer\.getSources\(/);
  assert.match(main, /Choose what CodeQuest can capture/);
  assert.match(main, /callback\(\{\}\)/);
  assert.match(main, /callback\(grant\)/);
});

test("capture handler does not delegate away from the explicit bridge to the system picker", () => {
  assert.doesNotMatch(main, /setDisplayMediaRequestHandler[\s\S]{0,2500}\},\s*\{\s*useSystemPicker\s*:\s*true\s*\}\s*\)/);
});

test("main CodeQuest window loads the desktop preload bridge", () => {
  const mainWindow = main.indexOf("function createMainWindow()");
  const assistantWindow = main.indexOf("function createAssistantWindow()");
  assert.notEqual(mainWindow, -1, "main window factory must exist");
  assert.notEqual(assistantWindow, -1, "assistant window factory must exist");
  const mainBlock = main.slice(mainWindow, assistantWindow);
  assert.match(mainBlock, /preload:\s*path\.join\(__dirname,\s*"preload\.cjs"\)/,
    "the hosted Ghost Lab needs preload.cjs in the main window, not only the assistant");
  assert.match(mainBlock, /contextIsolation:\s*true/);
  assert.match(mainBlock, /nodeIntegration:\s*false/);
});
