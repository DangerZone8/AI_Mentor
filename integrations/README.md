# CodeQuest assistant source integrations

These are pinned Git submodules. Their tracked source files are kept in their upstream repositories and are not patched or rewritten by CodeQuest.

## Pinned sources

- `free-cluely` — [Prat011/free-cluely](https://github.com/Prat011/free-cluely), pinned at `712ddb3474af22886cd47786f7bb0f0a5bf526df` (upstream `master`). Useful areas to evaluate: screenshot queue/capture, prompt processing, LLM provider abstraction, and Electron IPC/window helpers.
- `OpenCluely` — [TechyCSR/OpenCluely](https://github.com/TechyCSR/OpenCluely/tree/imgbot), pinned at `c54c1199e3befda7649371c5283655f3bf27e724` (upstream `imgbot`). Useful areas to evaluate: streaming responses, speech transcription, capture services, and cross-platform window management.

## Important: source pinning is not runtime integration

The submodules make the exact upstream code available for review and reproducible builds. They do **not** mean either application is already running inside CodeQuest. The two projects are independent Electron applications with their own dependency trees, application entry points, and packaging rules. They must not be imported into CodeQuest's main process as if they were ordinary libraries.

The next integration layer should use a narrow CodeQuest-owned adapter and select capabilities rather than merge the apps wholesale:

1. **User-authorized screen/code capture** — reuse the existing CodeQuest consent flow and expose captured frames only after explicit user action or an enabled session.
2. **Streaming AI responses and conversation context** — adapt provider calls behind CodeQuest's backend API; never ship provider secrets in the desktop renderer or browser config.
3. **Speech-to-text** — add an opt-in microphone session with a visible recording state, explicit stop control, and clear handling of local versus cloud processing.
4. **Cross-platform window and IPC patterns** — adapt only after reviewing each upstream implementation against CodeQuest's context isolation, allow-listed IPC, and updater design.

## Integration constraints

- Do not edit source files inside either submodule. Make CodeQuest-specific changes in `desktop/`, `backend/`, or new adapter files outside the submodules.
- Preserve each upstream license and attribution; review the license and dependency obligations before redistributing built code.
- Do not add hidden capture, covert monitoring, or an overlay designed to conceal assistance from other participants. Capture and microphone use must remain user-controlled and visible.
- Do not assume upstream projects are secure or production-ready merely because they build. Run separate audits and platform tests before shipping.
- A recursive checkout is required to populate submodule directories: `git clone --recurse-submodules https://github.com/DangerZone8/AI_Mentor.git` or `git submodule update --init --recursive`.

## Current limitations

This commit only pins the upstream sources and documents a safe integration boundary. It does not yet provide speech transcription, streaming model output, or either upstream app's capture implementation in the shipped CodeQuest installer. The hosted CodeQuest API still needs a valid deployment URL and provider configuration for server-backed AI features.
