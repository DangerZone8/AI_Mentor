const fs = require("node:fs/promises");
const path = require("node:path");

const ALLOWED_EXTENSIONS = new Set([".txt", ".md", ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".h", ".cpp", ".hpp", ".json", ".html", ".css", ".sql", ".yaml", ".yml", ".toml", ".xml", ".go", ".rs", ".sh"]);
const SKIP_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", "vendor", ".venv", "venv"]);
const MAX_FILES = 1500;
const MAX_BYTES_PER_FILE = 256 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
let indexed = [];
let indexedRoot = null;

async function indexFolder(root) {
  indexed = [];
  indexedRoot = root;
  let totalBytes = 0;
  async function walk(dir, depth = 0) {
    if (depth > 12 || indexed.length >= MAX_FILES || totalBytes >= MAX_TOTAL_BYTES) return;
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (indexed.length >= MAX_FILES || totalBytes >= MAX_TOTAL_BYTES) break;
      if (entry.name.startsWith(".") && entry.name !== ".github") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(full, depth + 1);
      } else if (entry.isFile() && ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        try {
          const stat = await fs.stat(full);
          if (stat.size > MAX_BYTES_PER_FILE || totalBytes + stat.size > MAX_TOTAL_BYTES) continue;
          const content = await fs.readFile(full, "utf8");
          totalBytes += stat.size;
          indexed.push({ path: path.relative(root, full), content: content.slice(0, MAX_BYTES_PER_FILE) });
        } catch { /* Skip unreadable or changing files. */ }
      }
    }
  }
  await walk(root);
  return { root, files: indexed.length, bytes: totalBytes };
}

function searchFiles(query, limit = 8) {
  const terms = String(query || "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 12);
  if (!terms.length) return { root: indexedRoot, results: [] };
  const results = [];
  for (const file of indexed) {
    const lower = file.content.toLowerCase();
    const score = terms.reduce((n, term) => n + (lower.includes(term) ? 1 : 0), 0);
    if (score) results.push({ path: file.path, score, excerpt: file.content.slice(Math.max(0, lower.indexOf(terms.find(t => lower.includes(t)) || "") - 180), 900) });
  }
  results.sort((a, b) => b.score - a.score);
  return { root: indexedRoot, results: results.slice(0, Math.max(1, Math.min(Number(limit) || 8, 10))) };
}

module.exports = { indexFolder, searchFiles };
