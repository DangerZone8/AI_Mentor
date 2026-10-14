const $ = (id) => document.getElementById(id);
const ask = $("ask");
const status = $("status");
const answer = $("answer");
ask.addEventListener("click", async () => {
  const base = $("api").value.trim().replace(/\/+$/, "");
  const token = $("token").value.trim();
  const prompt = $("prompt").value.trim();
  if (!base || !/^https?:\/\//i.test(base)) { answer.textContent = "Enter your deployed CodeQuest API base URL."; return; }
  if (!token) { answer.textContent = "Sign in to CodeQuest and provide a current Supabase access token."; return; }
  if (!prompt) { answer.textContent = "Enter a question or code snippet first."; return; }
  ask.disabled = true; status.textContent = "Thinking…"; answer.textContent = "Working…";
  try {
    const response = await fetch(base + "/api/v1/mentor/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || "Request failed (" + response.status + "). Check the API URL, sign-in token, and server configuration.");
    answer.textContent = payload.answer || "The API returned an empty answer.";
    status.textContent = "Done";
  } catch (error) {
    answer.textContent = error.message || "Could not reach CodeQuest API.";
    status.textContent = "Error";
  } finally { ask.disabled = false; }
});
$("clear").addEventListener("click", () => { $("prompt").value = ""; answer.textContent = "Your answer will appear here."; status.textContent = "Ready"; });
