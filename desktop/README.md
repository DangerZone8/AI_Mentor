# CodeQuest Desktop

Cross-platform Electron desktop companion for CodeQuest, with a separate user-invoked coding assistant, bounded local project indexing/search, and consent-based screen capture for OCR-based code review.

## Development

Requirements: Node.js 20+ and npm.

```sh
cd desktop
npm install
npm start
npm test
```

By default, the main window opens `https://ai-mentor-opal.vercel.app/`. To test another deployment, set `CODEQUEST_DESKTOP_URL` to its HTTPS URL. If the backend is hosted on a different origin, set `CODEQUEST_API_BASE_URL` to that trusted HTTPS origin; the assistant rejects API origins that are not explicitly trusted. Localhost HTTP is permitted for development.

## Build installers

```sh
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Installers are written to `desktop/dist/`. Build and test on the target operating system. macOS distribution generally requires signing/notarization for a smooth install.

## CI and releases

`.github/workflows/desktop-ci.yml` runs unit tests, syntax checks, and Windows/macOS/Linux installer builds sequentially on relevant pull requests and pushes. Build artifacts are retained for 14 days. The desktop integration CI run completed all four stages successfully; run it again for any later changes. `.github/workflows/desktop-release.yml` builds the three installers for a `desktop-v*` tag and publishes a **draft** GitHub Release with the assets. Review the draft and test each installer before making a release public. The website's Download Desktop page links to GitHub Releases.

## Implemented features

- Main CodeQuest web workspace inside Electron.
- Separate assistant panel opened with **Ctrl+Shift+Space** (Cmd+Shift+Space on macOS).
- Assistant requests sent to `POST /api/v1/mentor/chat` through a narrow Electron IPC handler, avoiding browser CORS issues from a `file://` renderer.
- Attempts to retrieve the active Supabase access token from the main CodeQuest window in memory; manual entry is available as a fallback. This requires the hosted frontend's authentication configuration to be set up and the user to be signed in.
- Optional checkbox to include matching excerpts from the user's selected local project folder with an assistant request. Excerpts are sent only when this option is checked.
- Bounded local indexer for common text/code formats: 1,500 files maximum, 256 KiB per file, 20 MiB total, depth limit 12, and common dependency/build folders skipped.
- Consent-based screen/window capture through Electron's display-media handler, using the OS picker where available and an explicit source-choice dialog as fallback. Captured frames are OCR'd locally; screen images are not uploaded.
- A manual **Analyze current screen** action sends OCR text—not the screenshot—to the configured CodeQuest AI endpoint for a technical explanation. **Ctrl+Shift+Enter** (Cmd+Shift+Enter on macOS) triggers that action while screen sharing is active. Stopping a session requests an AI review of the collected text when the user is signed in.
- Isolated Electron renderers, Node integration disabled, sandbox enabled, and IPC methods exposed only to the assistant window.
- External links open in the system browser.

## Required configuration and limitations

The backend must be deployed and configured with server-side `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. The desktop assistant requires the correct backend URL and a valid Supabase session. The desktop assistant accepts only the configured CodeQuest origin or the explicit `CODEQUEST_API_BASE_URL` origin (localhost is allowed for development). This prevents a typo or arbitrary URL from receiving the bearer token. If the frontend uses a different backend host, configure the trusted origin before launching the app. Never paste an OpenAI API key into the desktop app.

This is not yet a complete Constella replacement. Persistent SQLite memory, semantic vector retrieval/embeddings, knowledge graph, scheduler, MCP servers, and a full agent framework are not implemented. Meeting microphone/system-audio recording, speech transcription, speaker diarization, and live spoken-response suggestions are not implemented yet. The custom CodeQuest mark is now used in the web workspace and assistant panel; the packaged Windows executable still needs a dedicated ICO/PNG installer icon. The screen-aware feature requires the user to start capture and select a source; it is not a hidden screen-sharing bypass. Code signing/notarization, automatic updates, and end-to-end testing are also pending.

## Constella upstream licensing

The requested upstream repository's README and checked-in license metadata appeared inconsistent (README referenced CC BY-NC while LICENSE contained AGPL-3.0 text). This branch does not copy Constella source. Resolve the applicable license before porting or redistributing its code.

## Security

The local indexer reads only a user-selected folder and supported text/code extensions. Avoid indexing secrets or directories you do not want searched. Provider API keys must remain server-side.
