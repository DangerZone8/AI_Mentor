const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("inline frontend scripts parse without syntax errors", () => {
  let count = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attributes = match[1] || "";
    const source = match[2] || "";
    if (/\bsrc\s*=/i.test(attributes) || !source.trim()) continue;
    assert.doesNotThrow(() => new vm.Script(source, { filename: "frontend/index.html:inline-script" }));
    count += 1;
  }
  assert.ok(count > 0, "expected at least one inline script to validate");
});

test("code explanation, debugging, and next-step actions call the real AI mentor", () => {
  assert.match(html, /function askAiMentorFromFeature\(prompt\)/);
  assert.match(html, /askAiMentorFromFeature\("Debug the current CodeQuest mission/);
  assert.match(html, /askAiMentorFromFeature\("Explain this code line by line/);
  assert.match(html, /askAiMentorFromFeature\("Give me the next 3 concrete steps/);
  assert.match(html, /Ask AI to review this file/);
  assert.match(html, /function glStartCapture\(\)/);
  assert.match(html, /navigator\.mediaDevices\.getDisplayMedia/);
  assert.match(html, /tesseract\.createWorker/);
  assert.match(html, /\$\("gl-start"\)\.addEventListener/);
  assert.match(html, /frames are processed locally and are not uploaded/);
  assert.doesNotMatch(html, /No real traceback has been collected here/);
});
