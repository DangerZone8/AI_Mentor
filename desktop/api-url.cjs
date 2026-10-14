const LOCAL_HTTP_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function normalizeApiBase(input, allowedOrigins = []) {
  let parsed;
  try { parsed = new URL(String(input || "").trim()); }
  catch { throw new Error("Enter a valid CodeQuest API URL."); }

  const localHttp = parsed.protocol === "http:" && LOCAL_HTTP_HOSTS.has(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) {
    throw new Error("Use HTTPS for the API URL (HTTP is allowed only for localhost development).");
  }
  if (parsed.username || parsed.password) throw new Error("Do not put credentials in the API URL.");
  if (parsed.search || parsed.hash || (parsed.pathname !== "/" && parsed.pathname !== "")) {
    throw new Error("Enter the API origin only, without a path, query, or fragment.");
  }

  const allowed = new Set(allowedOrigins.filter(Boolean).map(value => {
    try { return new URL(value).origin; } catch { return ""; }
  }).filter(Boolean));
  if (!allowed.has(parsed.origin) && !localHttp) {
    throw new Error("This API origin is not trusted by this desktop app. Configure CODEQUEST_API_BASE_URL for your backend, or use the configured CodeQuest origin.");
  }
  return parsed.origin;
}

module.exports = { normalizeApiBase };
