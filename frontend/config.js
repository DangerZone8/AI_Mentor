// Browser-visible Supabase configuration. Publishable keys are intended for frontend use.
// Never place a Supabase service-role key or OpenAI API key in this file.
window.CODEQUEST_SUPABASE_URL = "https://tiooypmgqwpdfsmjgwmh.supabase.co";
window.CODEQUEST_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_R4I-wQuw0nsob-9je6yUVw_F465gs93";

// Local development uses the local FastAPI server. After deploying the separate
// Vercel backend project (Root Directory: backend), replace the empty production
// value below with that project's actual HTTPS deployment URL.
const isLocalCodeQuest = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
window.CODEQUEST_API_BASE = isLocalCodeQuest ? "http://localhost:8001" : "";
