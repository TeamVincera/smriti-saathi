# QA Bug Database — Audited 2026-09-10

This file preserves the historical findings from the autonomous QA pass. Statuses below were reconciled against the current source and tests; the original finding is retained instead of being deleted.

| ID | Historical finding | Current status | Current evidence / next action |
|---|---|---|---|
| BUG-001 | Provider API keys were bundled through `VITE_*` client variables. | **RESOLVED** | `src/lib/config.ts` contains no provider credentials; calls cross `src/lib/ai/proxyClient.ts`; `server/ai-proxy.mjs` owns secrets; `test/unit/ai-proxy-security.test.ts` and `scripts/check-ai-security.mjs` cover the boundary. Re-run the build security scan for each release. |
| BUG-002 | `AIService` swallowed provider failures without diagnostics. | **PARTIALLY RESOLVED** | Chat and low-level proxy failures now log warnings/errors and return local fallbacks. Structured-output parse/fallback catches at `src/lib/ai/AIService.ts:188,286` remain intentionally quiet; add observability only if product requirements call for it. |
| BUG-003 | `VoiceService` swallowed playback/TTS failures. | **OPEN — reduced impact** | Web Speech/cached-audio fallback remains functional, but provider/cache/playback catches in `src/lib/voice/VoiceService.ts` still omit structured diagnostics. Keep this as an observability backlog item. |
| BUG-004 | Hash-route query parameters were lost on deep links. | **RESOLVED** | `src/router.ts` now returns `{ path, query }` and `navigate(path, true)` preserves the query string; route tests cover the behavior. |
| BUG-005 | Storage failures could be hidden by fallback catches. | **ACCEPTED FALLBACK / MONITOR** | `src/lib/db.ts` now rejects transaction/request failures with store and phase context; read helpers intentionally return safe defaults. `src/lib/reminders.ts` still tolerates unavailable browser storage. Add user-visible diagnostics only if the product chooses to surface storage failures. |
| BUG-006 | Onboarding controls lacked accessible labels. | **RESOLVED** | Current onboarding language, photo, avatar, and custom controls include labels/ARIA attributes; accessibility suites cover the onboarding flow. |

## Security and scope notes

- The proxy has origin allowlisting, per-IP rate limiting, body limits, validation, and normalized errors. These are abuse controls, not authentication. A production proxy still needs an authenticated gateway/session or device-attestation layer.
- The app has no OTP, account login, remote identity, cloud database, CRDT/P2P sync, or clinical validation. Those remain roadmap items and are not QA pass criteria for this build.
- Historical report names (“Silhouette”, “overnight execution”, and simulated counts) describe the original QA artifact, not a reproducible release benchmark. Use current test commands and CI output for release claims.
