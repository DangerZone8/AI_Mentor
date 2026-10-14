# CodeQuest Desktop

Cross-platform Electron desktop shell for CodeQuest, with a user-invoked assistant panel and an initial local project index/search.

## Development

Requirements: Node.js 20+ and npm.

```sh
cd desktop
npm install
npm start
```

By default, the main window opens `https://ai-mentor-opal.vercel.app/`. To test a different deployment, set `CODEQUEST_DESKTOP_URL` to an HTTPS URL.

## Automated builds and releases

The GitHub Actions workflow at `.github/workflows/desktop-ci.yml` runs the local-indexer tests and builds Windows, macOS, and Linux artifacts. CI artifacts are retained for 14 days. To publish a GitHub Release with installer assets, push a version tag such as `desktop-v0.2.0` after the workflow passes. The release workflow does not publish to the website automatically; a website download page still needs to be connected to GitHub Releases.

## Build installers

```sh
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Installers are written to `desktop/dist/`. Build and test on the target operating system. macOS distribution generally requires signing/notarization for a smooth install.

## Current implemented desktop features

- Separate assistant panel opened by **Ctrl+Shift+Space** (Cmd+Shift+Space on macOS).
- Assistant panel sends questions/code to the existing authenticated `POST /api/v1/mentor/chat` endpoint.
- The panel accepts the deployed API base URL and a current Supabase access token for the session; it does not save either to disk. Only enter a backend URL you control and trust, because the token is sent to that URL. Do not paste an OpenAI API key into the desktop client.
- User-selected local folder indexing for common text/code files, with size/depth/file-count limits and a simple keyword search.
- Isolated Electron renderer: context isolation, Node integration disabled, sandbox enabled, and narrow preload APIs.
- External links open in the system browser.

## Important setup

The hosted API must be deployed and configured with server-side `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. The assistant panel currently requires a valid Supabase access token pasted into the panel; a seamless shared sign-in session still needs integration. Keep all provider secrets on the backend, never in the frontend or desktop package.

## Not yet implemented / not verified

This is not yet a complete Constella or Cluely replacement. The following are still pending: shared desktop/web sign-in, AI-assisted local retrieval (search results must currently be copied into the prompt manually), SQLite/vector embeddings, knowledge graph, scheduler, MCP server, full agent framework, global screen capture/OCR, audio transcription, permission UX for capture, cross-platform window/screen-share testing, update channel, code signing/notarization, a website download page/release integration, CI results on all three operating systems, and end-to-end tests. The assistant is a normal visible window; it does not attempt to evade screen-sharing capture or conceal assistance from people evaluating the work.

## Constella upstream licensing

The requested upstream repository's README and checked-in license metadata appeared inconsistent (README referenced CC BY-NC while LICENSE contained AGPL-3.0 text). This branch does not copy Constella source. Before porting or redistributing its code, resolve the applicable license and comply with its terms.

## Security

The local indexer only reads a user-selected directory and filters to common text/code extensions. It skips common dependency/build directories and caps traversal and file sizes. Treat project files as sensitive; do not index secrets or folders you do not want searched. No OpenAI key is embedded in the desktop app.
