const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { indexFolder, searchFiles } = require("./local-indexer.cjs");

test("indexes supported code files and returns keyword matches", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "codequest-index-"));
  try {
    await fs.mkdir(path.join(root, "src"));
    await fs.mkdir(path.join(root, "node_modules"));
    await fs.writeFile(path.join(root, "src", "solver.js"), "function solveBug() { return 42; }");
    await fs.writeFile(path.join(root, "notes.txt"), "robotics and control systems");
    await fs.writeFile(path.join(root, "ignored.bin"), Buffer.from([0, 1, 2]));
    await fs.writeFile(path.join(root, "node_modules", "hidden.js"), "should not be indexed");
    const indexed = await indexFolder(root);
    assert.equal(indexed.files, 2);
    const result = searchFiles("solveBug");
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].path, path.join("src", "solver.js"));
    assert.match(result.results[0].excerpt, /solveBug/);
    assert.equal(searchFiles("solver").results[0].path, path.join("src", "solver.js"));
    assert.deepEqual(searchFiles("   ").results, []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
