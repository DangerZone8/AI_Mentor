const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));

test("installer build scripts never attempt to publish during packaging", () => {
  for (const scriptName of ["dist:win", "dist:mac", "dist:linux"]) {
    assert.match(packageJson.scripts[scriptName], /--publish never$/,
      scriptName + " must build locally; the release workflow publishes assets separately");
    assert.doesNotMatch(packageJson.scripts[scriptName], /onTagOrDraft|always/,
      scriptName + " must not require a GitHub publisher token");
  }
});

test("packaged app includes the preload bridge required by the main window", () => {
  assert.ok(packageJson.build.files.includes("main.cjs"));
  assert.ok(packageJson.build.files.includes("preload.cjs"));
});
