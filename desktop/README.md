# CodeQuest Desktop

This folder is a first desktop-app packaging scaffold. It wraps the deployed CodeQuest web app in a cross-platform Electron window so the same web UI can be installed on Windows, macOS, and Linux.

## Development

Requirements: Node.js 20+ and npm.

```sh
cd desktop
npm install
npm start
```

By default, the app opens `https://ai-mentor-opal.vercel.app/`. To test a different deployment:

- Windows PowerShell: `$env:CODEQUEST_DESKTOP_URL="https://your-preview.example"; npm start`
- macOS/Linux: `CODEQUEST_DESKTOP_URL="https://your-preview.example" npm start`

## Build installers

```sh
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Installers are written to `desktop/dist/`. Builds should be run on the target OS (especially macOS signing/notarization). These packaging commands are scaffolded but have not yet been run in CI.

## Integration plan

1. Keep the existing CodeQuest web frontend and API as the shared product surface.
2. Add a dedicated Electron adapter for native desktop capabilities through a minimal preload API and main-process IPC. Browser permissions and explicit user consent are required for screen capture, microphone, accessibility, or any background feature.
3. Port selected Constella capabilities behind separate modules: user-selected local-folder indexing, local search/memory, and knowledge-graph views. Do not merge both upstream branches wholesale; compare them and port specific features with attribution and license compliance.
4. Add platform-specific CI builds, signing, auto-updates, crash reporting, and end-to-end tests before calling the app production-ready.

## Upstream project notes

The requested Constella repository is an Electron/React desktop prototype with local-first file indexing, SQLite/vector search, knowledge graph synthesis, and an MCP bridge. Its `main` and `development` branches differ; they should be compared feature-by-feature rather than overlaid blindly.

The repository's README and LICENSE metadata are inconsistent: the README mentions CC BY-NC while the checked-in LICENSE file is AGPL-3.0. Before copying or distributing upstream implementation code, resolve the applicable license and satisfy its obligations. This scaffold does not copy Constella source code.

## Current limitations

- This is a desktop wrapper around the hosted website, not yet a fully offline/local-first app.
- The desktop bridge currently exposes only an app marker and platform/version metadata.
- Screen observation, global hotkeys, microphone access, local-folder indexing, and Constella's knowledge engine are not implemented by this scaffold.
- The web app still requires its configured hosted API and authentication providers.
