const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeApiBase } = require("./api-url.cjs");

const trusted = ["https://ai-mentor-opal.vercel.app", "https://api.example.test"];

test("accepts a trusted HTTPS origin and normalizes a trailing slash", () => {
  assert.equal(normalizeApiBase("https://api.example.test/", trusted), "https://api.example.test");
});

test("rejects untrusted HTTPS origins to protect bearer tokens", () => {
  assert.throws(() => normalizeApiBase("https://attacker.example", trusted), /not trusted/);
});

test("rejects non-local HTTP", () => {
  assert.throws(() => normalizeApiBase("http://api.example.test", trusted), /Use HTTPS/);
});

test("allows localhost HTTP for development", () => {
  assert.equal(normalizeApiBase("http://localhost:8000", trusted), "http://localhost:8000");
});

test("rejects embedded credentials, paths, query strings, and fragments", () => {
  assert.throws(() => normalizeApiBase("https://user:pass@api.example.test", trusted), /credentials/);
  assert.throws(() => normalizeApiBase("https://api.example.test/v1", trusted), /origin only/);
  assert.throws(() => normalizeApiBase("https://api.example.test?x=1", trusted), /origin only/);
  assert.throws(() => normalizeApiBase("https://api.example.test#fragment", trusted), /origin only/);
});
