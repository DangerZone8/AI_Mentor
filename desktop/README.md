# CodeQuest Desktop

Cross-platform Electron desktop companion for CodeQuest, with a separate user-invoked coding assistant and bounded local project indexing/search.

## Development

Requirements: Node.js 20+ and npm.

```sh
cd desktop
npm install
npm start
npm test
```

By default, the main window opens `https://ai-mentor-opal.vercel.app/`. To test another deployment, set `CODEQUEST_DESKTOP_URL` to its HTTPS URL.

## Build installers

```sh
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Installers are written to `desktop/dist/`. Build and test on the target operating system. macOS distribution generally requires signing/notarization for a smooth install.

## CI and releases

`.github/workflows/desktop-ci.yml` runs indexer tests, syntax checks, and Windows/macOS/Linux installer builds on relevant pull requests and pushes. Build artifacts are retained for 14 days. `.github/workflows/desktop-release.yml` builds the three installers for a `desktop-v*` tag and publishes a **draft** GitHub Release with the assets. Review the draft and test each installer before making a release public. The website's Download Desktop page links to GitHub Releases.

## Implemented features

- Main CodeQuest web workspace inside Electron.
- Separate assistant panel opened with **Ctrl+Shift+Space** (Cmd+Shift+Space on macOS).
- Assistant requests sent to `POST /api/v1/mentor/chat` through a narrow Electron IPC handler, avoiding browser CORS issues from a `file://` renderer.
- Attempts to retrieve the active Supabase access token from the main CodeQuest window in memory; manual entry is available as a fallback. This requires the hosted frontend's authentication configuration to be set up and the user to be signed in.
- Optional checkbox to include matching excerpts from the user's selected local project folder with an assistant request. Excerpts are sent only when this option is checked.
- Bounded local indexer for common text/code formats: 1,500 files maximum, 256 KiB per file, 20 MiB total, depth limit 12, and common dependency/build folders skipped.
- Isolated Electron renderers, Node integration disabled, sandbox enabled, and IPC methods exposed only to the assistant window.
- External links open in the system browser.

## Required configuration and limitations

The backend must be deployed and configured with server-side `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. The desktop assistant requires the correct backend URL and a valid Supabase session. Only enter a backend URL you control and trust; the access token is sent to that URL. Never paste an OpenAI API key into the desktop app.

This is not yet a complete Constella or Cluely replacement. Persistent SQLite memory, semantic vector retrieval/embeddings, knowledge graph, scheduler, MCP servers, and a full agent framework are not implemented. It does not capture the screen, run OCR, transcribe audio, or conceal assistance from screen-sharing participants. Code signing/notarization, automatic updates, and end-to-end testing are also pending. CI has been configured but its results have not yet been verified.

## Constella upstream licensing

The requested upstream repository's README and checked-in license metadata appeared inconsistent (README referenced CC BY-NC while LICENSE contained AGPL-3.0 text). This branch does not copy Constella source. Resolve the applicable license before porting or redistributing its code.

## Security

The local indexer reads only a user-selected folder and supported text/code extensions. Avoid indexing secrets or directories you do not want searched. Provider API keys must remain server-side.
