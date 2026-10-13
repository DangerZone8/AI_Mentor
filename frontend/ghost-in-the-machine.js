/* CodeQuest Ghost Lab — optional, dependency-free enhancement.
 * Safe by design: no network calls, no eval, no repository writes.
 * Add <script src="./ghost-in-the-machine.js" defer></script> before </body>.
 * Simulations are local heuristics, not real cloud billing, load tests, or AI output.
 */
(() => {
  "use strict";
  if (window.__codeQuestGhostLabLoaded) return;
  window.__codeQuestGhostLabLoaded = true;

  const css = `
  #cq-ghost-root{position:fixed;right:18px;bottom:18px;z-index:9998;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#eef2ff}
  #cq-ghost-root *{box-sizing:border-box}
  #cq-ghost-launch{border:1px solid #657cf8;background:linear-gradient(135deg,#536df0,#8957d9);color:white;border-radius:999px;padding:12px 17px;font-weight:750;box-shadow:0 10px 32px #0006;cursor:pointer}
  #cq-ghost-panel{display:none;width:min(420px,calc(100vw - 28px));max-height:min(78vh,720px);overflow:auto;margin-bottom:10px;background:#0e1428;border:1px solid #334269;border-radius:18px;box-shadow:0 18px 60px #0009}
  #cq-ghost-panel.open{display:block}
  #cq-ghost-panel button,#cq-ghost-panel select,#cq-ghost-panel input{font:inherit}
  .cqg-head{position:sticky;top:0;background:#111a32;padding:14px 16px;border-bottom:1px solid #293657;display:flex;justify-content:space-between;align-items:center;gap:8px}
  .cqg-head small{display:block;color:#a5b1d1;font-size:11px;margin-top:2px}
  .cqg-close{background:transparent;color:#dce4ff;border:1px solid #344363;border-radius:8px;padding:5px 9px;cursor:pointer}
  .cqg-tabs{display:flex;gap:5px;padding:10px 12px 0;flex-wrap:wrap}
  .cqg-tab{background:#17213c;color:#bdc8e6;border:1px solid #2b395c;border-radius:9px;padding:7px 9px;cursor:pointer}
  .cqg-tab[aria-selected="true"]{background:#293968;color:white;border-color:#7289ff}
  .cqg-body{padding:14px 16px 17px}
  .cqg-body h3{font-size:15px;margin:0 0 8px}.cqg-body p{color:#b1bddb;margin:7px 0 12px}
  .cqg-muted{font-size:12px;color:#9eaccd!important}
  .cqg-card{border:1px solid #2b385a;background:#141d35;border-radius:12px;padding:12px;margin:10px 0}
  .cqg-action{background:#607cf5;color:white;border:0;border-radius:9px;padding:9px 11px;cursor:pointer;font-weight:700}
  .cqg-secondary{background:#1b2744;color:#e3eaff;border:1px solid #344568;border-radius:9px;padding:8px 10px;cursor:pointer}
  .cqg-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .cqg-body label{display:block;font-size:12px;color:#b6c2df;margin:12px 0 5px}
  .cqg-body input[type=range]{width:100%;accent-color:#8292ff}
  .cqg-body select{width:100%;background:#0b1122;color:#edf1ff;border:1px solid #344363;border-radius:8px;padding:8px}
  .cqg-meter{height:8px;background:#263252;border-radius:20px;overflow:hidden;margin:8px 0}.cqg-meter span{display:block;height:100%;background:linear-gradient(90deg,#58d8c0,#7d8bff);width:0}
  .cqg-pill{display:inline-block;border:1px solid #40527d;border-radius:999px;padding:3px 8px;font-size:11px;color:#cbd7ff}
  .cqg-code{white-space:pre-wrap;overflow-wrap:anywhere;background:#090f1e;border:1px solid #263454;border-radius:9px;padding:10px;color:#b7f2df;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
  .cqg-warning{border-left:3px solid #ffbd69;padding:8px 10px;background:#2a2119;color:#ffdfb1;border-radius:4px;font-size:12px}
  @media(max-width:520px){#cq-ghost-root{right:10px;bottom:10px}.cqg-body{padding:12px}}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "cq-ghost-root";
  root.innerHTML = `
    <section id="cq-ghost-panel" role="dialog" aria-label="CodeQuest Ghost Lab" aria-modal="false">
      <header class="cqg-head"><div><strong>👻 Ghost Lab</strong><small>Local code companion · no code is uploaded</small></div><button class="cqg-close" id="cqg-close" aria-label="Close panel">✕</button></header>
      <nav class="cqg-tabs" role="tablist" aria-label="Ghost Lab tools">
        <button class="cqg-tab" role="tab" data-tab="mentor" aria-selected="true">Mentor</button>
        <button class="cqg-tab" role="tab" data-tab="time" aria-selected="false">Time travel</button>
        <button class="cqg-tab" role="tab" data-tab="adventure" aria-selected="false">Adventure</button>
      </nav>
      <div class="cqg-body" id="cqg-content"></div>
    </section>
    <button id="cq-ghost-launch" aria-expanded="false">👻 Ghost Lab</button>`;
  document.body.appendChild(root);

  const panel = root.querySelector("#cq-ghost-panel");
  const launch = root.querySelector("#cq-ghost-launch");
  const content = root.querySelector("#cqg-content");
  let activeTab = "mentor";
  let idleTimer = null;
  let idleShown = false;
  let simulatedDays = 5;
  let simulatedUsers = 1000;
  let scenario = "retention";

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function getEditor() {
    const selectors = [
      "textarea#codeEditor", "textarea#editor", "textarea[name='code']",
      "#codeEditor textarea", ".CodeMirror textarea", ".monaco-editor textarea",
      "textarea"
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && !root.contains(el) && el.offsetParent !== null) return el;
    }
    return null;
  }
  function getCode() {
    const editor = getEditor();
    if (editor && typeof editor.value === "string") return editor.value;
    const codeNode = document.querySelector("#fileContent, #cqFileContent, pre code");
    return codeNode && !root.contains(codeNode) ? (codeNode.innerText || "") : "";
  }
  function analyzeCode(code) {
    const lines = code.split(/\r?\n/);
    const imports = (code.match(/^\s*(?:import\s|from\s.+\simport\s|require\s*\(|#include\s)/gm) || []).length;
    const functions = (code.match(/^\s*(?:async\s+)?function\s+\w+|^\s*(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(|^\s*def\s+\w+|^\s*class\s+\w+/gm) || []).length;
    const todos = (code.match(/TODO|FIXME|HACK|XXX/g) || []).length;
    const broadCatches = (code.match(/catch\s*\(\s*\w*\s*\)\s*\{\s*\}|except\s*:\s*(?:pass)?/g) || []).length;
    const longLines = lines.filter(line => line.length > 120).length;
    const secrets = (code.match(/(?:api[_-]?key|secret|password)\s*[:=]\s*["'][^"']{8,}["']/gi) || []).length;
    const score = Math.min(100, todos * 7 + broadCatches * 12 + longLines * 2 + Math.max(0, lines.length - 300) / 10);
    return {lines: lines.length, imports, functions, todos, broadCatches, longLines, secrets, score: Math.round(score)};
  }
  function mentorMarkup() {
    const code = getCode();
    const a = analyzeCode(code);
    const hasEditor = !!getEditor();
    return `<h3>Your quiet co-developer</h3>
      <p>Get a lightweight, local heuristic scan and beginner-friendly next steps. This does not change your files.</p>
      <div class="cqg-row"><span class="cqg-pill">${hasEditor ? "Editor detected" : "No editor detected"}</span><span class="cqg-pill">${code ? a.lines+" lines visible" : "Waiting for code"}</span></div>
      <div class="cqg-card"><strong>Gentle nudge</strong><p>${code.trim() ? "Start by identifying the smallest function or component that has one clear responsibility. Then check its inputs, outputs, and failure cases." : "Start with one small function. Write down its input, expected output, and one edge case before writing the implementation."}</p><div class="cqg-row"><button class="cqg-action" id="cqg-scan">Scan visible code</button><button class="cqg-secondary" id="cqg-idle">Show a starter hint</button></div></div>
      <div id="cqg-scan-result"></div>
      <p class="cqg-muted">Idle hints appear inside this panel only. Ghost Lab will never type into your editor, overwrite code, or send repository contents to a server.</p>`;
  }
  function timeMarkup() {
    const a = analyzeCode(getCode());
    const risk = Math.min(100, Math.round((a.todos * 8) + (a.broadCatches * 15) + (a.longLines * 1.5) + (a.imports > 30 ? 15 : 0)));
    const deps = Math.max(1, a.imports);
    const future = Math.max(0, Math.round((simulatedDays / 5) * (deps * 0.7 + a.todos * 1.4)));
    return `<h3>Time-Travel Architecture Sandbox</h3>
      <p>Explore a toy projection of how code complexity can amplify risk. This is a scenario model, not an actual future-version test or load test.</p>
      <label for="cqg-days">Move the timeline: <strong id="cqg-days-label">${simulatedDays} days</strong></label>
      <input id="cqg-days" type="range" min="1" max="730" step="1" value="${simulatedDays}">
      <label for="cqg-users">Simulated concurrent visitors: <strong id="cqg-users-label">${simulatedUsers.toLocaleString()}</strong></label>
      <input id="cqg-users" type="range" min="10" max="100000" step="10" value="${simulatedUsers}">
      <div class="cqg-card"><div class="cqg-row"><strong>Heuristic change-risk index</strong><span class="cqg-pill">${risk}/100</span></div><div class="cqg-meter"><span style="width:${risk}%"></span></div>
      <p>Estimated dependency touchpoints: <strong>${future}</strong></p>
      <p>Illustrative traffic pressure: <strong>${Math.min(100, Math.round(Math.log10(simulatedUsers) * 20))}/100</strong></p>
      <p class="cqg-muted">Based on visible code markers only (${a.imports} import-like lines, ${a.todos} TODO/FIXME markers). No requests are sent and no 50 PRs are created.</p></div>
      <button class="cqg-action" id="cqg-deps">Show local dependency checklist</button><div id="cqg-deps-result"></div>`;
  }
  function adventureMarkup() {
    return `<h3>Choose Your Own Adventure</h3>
      <p>Practice diagnosing a deliberately fictional bug in a local scenario. Nothing here attacks a live site or external system.</p>
      <label for="cqg-scenario">Choose a challenge</label>
      <select id="cqg-scenario">
        <option value="retention" ${scenario==="retention"?"selected":""}>Retention drops after signup</option>
        <option value="scale" ${scenario==="scale"?"selected":""}>App slows as traffic grows</option>
        <option value="security" ${scenario==="security"?"selected":""}>Unsafe input handling</option>
      </select>
      <div class="cqg-card" id="cqg-challenge"></div>
      <div class="cqg-row"><button class="cqg-secondary" data-answer="observe">Inspect symptoms</button><button class="cqg-secondary" data-answer="test">Choose a test</button><button class="cqg-action" data-answer="fix">Reveal a safe fix</button></div>
      <div id="cqg-answer" aria-live="polite"></div>
      <p class="cqg-muted">This is a guided learning exercise, not a deployed vulnerable sandbox.</p>`;
  }
  function render() {
    root.querySelectorAll(".cqg-tab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === activeTab)));
    content.innerHTML = activeTab === "mentor" ? mentorMarkup() : activeTab === "time" ? timeMarkup() : adventureMarkup();
    if (activeTab === "adventure") renderChallenge();
  }
  function renderChallenge() {
    const box = content.querySelector("#cqg-challenge");
    if (!box) return;
    const copy = {
      retention: ["Symptoms: signup completes, but few users return the next day.", "Hypothesis: the first successful action is unclear or the onboarding path loses state.", "Fix idea: instrument the first-session funnel, preserve progress, and test one clear activation action."],
      scale: ["Symptoms: response times rise with traffic; repeated requests read the same records.", "Hypothesis: an unbounded query or missing cache/index causes work to grow with every request.", "Fix idea: paginate results, inspect query plans, add measured indexes, and load-test in a controlled environment."],
      security: ["Symptoms: a search feature treats user input as part of a query or HTML fragment.", "Hypothesis: untrusted input is concatenated into a query or rendered as markup.", "Fix idea: use parameterized queries, contextual output encoding, validation, and least-privilege access."]
    }[scenario];
    box.innerHTML = `<strong>Mission briefing</strong><p>${copy[0]}</p><span class="cqg-pill">Training scenario</span>`;
    content.querySelectorAll("[data-answer]").forEach(b => b.onclick = () => {
      const index = b.dataset.answer === "observe" ? 0 : b.dataset.answer === "test" ? 1 : 2;
      content.querySelector("#cqg-answer").innerHTML = `<div class="cqg-card"><strong>${["Inspect symptoms","Test a hypothesis","A safer direction"][index]}</strong><p>${copy[index]}</p></div>`;
    });
  }
  function openPanel() {
    panel.classList.add("open");
    launch.setAttribute("aria-expanded", "true");
    render();
  }
  launch.addEventListener("click", () => panel.classList.contains("open") ? (panel.classList.remove("open"), launch.setAttribute("aria-expanded", "false")) : openPanel());
  root.querySelector("#cqg-close").addEventListener("click", () => { panel.classList.remove("open"); launch.setAttribute("aria-expanded", "false"); });
  root.querySelectorAll(".cqg-tab").forEach(b => b.addEventListener("click", () => { activeTab = b.dataset.tab; render(); }));
  content.addEventListener("click", e => {
    if (e.target.id === "cqg-scan") {
      const a = analyzeCode(getCode());
      const items = [];
      if (!getCode().trim()) items.push("No visible code was found. Open a file in the editor, then scan again.");
      if (a.todos) items.push(`${a.todos} TODO/FIXME/HACK marker(s): decide whether each is a tracked task.`);
      if (a.broadCatches) items.push(`${a.broadCatches} broad or empty error handler(s): log useful context and handle expected errors explicitly.`);
      if (a.longLines) items.push(`${a.longLines} long line(s): consider extracting a named helper where it improves clarity.`);
      if (a.secrets) items.push("Possible hard-coded secret pattern detected. Verify it locally; if real, revoke/rotate it and move secrets server-side.");
      if (!items.length) items.push("No common heuristic flags found. This is not proof that the code is correct or secure.");
      content.querySelector("#cqg-scan-result").innerHTML = `<div class="cqg-card"><strong>Local scan results</strong><ul>${items.map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul><p class="cqg-muted">Files scanned: only the currently visible editor/text content.</p></div>`;
    }
    if (e.target.id === "cqg-idle") {
      content.querySelector("#cqg-scan-result").innerHTML = `<div class="cqg-card"><strong>Starter hint</strong><div class="cqg-code">1. State the job in one sentence.\n2. List inputs and expected output.\n3. Solve the smallest happy path.\n4. Add one edge case.\n5. Run a test before refactoring.</div></div>`;
    }
    if (e.target.id === "cqg-deps") {
      content.querySelector("#cqg-deps-result").innerHTML = `<div class="cqg-card"><strong>Dependency review checklist</strong><ul><li>Identify the package manifest and lockfile.</li><li>Check supported runtime versions and release notes.</li><li>Run tests against the current pinned versions.</li><li>Upgrade one dependency group at a time in a branch.</li><li>Review transitive dependencies and rollback instructions.</li></ul></div>`;
    }
  });
  content.addEventListener("input", e => {
    if (e.target.id === "cqg-days") { simulatedDays = Number(e.target.value); render(); }
    if (e.target.id === "cqg-users") { simulatedUsers = Number(e.target.value); render(); }
  });
  content.addEventListener("change", e => {
    if (e.target.id === "cqg-scenario") { scenario = e.target.value; renderChallenge(); }
  });

  // A two-minute idle signal is deliberately non-invasive: it displays a hint
  // in Ghost Lab only, never inserts ghost text into an editor.
  function resetIdle() {
    clearTimeout(idleTimer);
    idleShown = false;
    idleTimer = setTimeout(() => {
      if (!document.hidden && getEditor() && panel.classList.contains("open") && activeTab === "mentor" && !idleShown) {
        idleShown = true;
        const result = content.querySelector("#cqg-scan-result");
        if (result) result.innerHTML = `<div class="cqg-card"><strong>Need a nudge?</strong><p>Try writing the function signature and one example input/output first. You can break the task into a happy path, an edge case, and a test.</p></div>`;
      }
    }, 120000);
  }
  document.addEventListener("input", resetIdle, true);
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearTimeout(idleTimer); else resetIdle(); });
  resetIdle();
})();
