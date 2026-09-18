# MORNING HANDOFF (historical; reconciled 2026-09-10)

> This handoff preserves the earlier QA state. The security and routing findings below were subsequently addressed in the current working tree; remaining observability work is explicitly labeled.

## What was tested
- API Key Security & Obfuscation
- React State & Navigation Stability
- Reminder Engine Intervals & Snooze Logic
- Sarvam & Groq Fallback Handling
- Forms, Input Sanitization, Onboarding Constraints

## Historical most serious bugs and current status
1. **API Keys Statically Bundled** (`src/lib/config.ts`) — **RESOLVED**. Provider calls now cross `server/ai-proxy.mjs`; the client bundle scan is part of `npm run build`.
2. **Silent API Failures** (`src/lib/ai/AIService.ts` and `src/lib/voice/VoiceService.ts`) — **PARTIALLY RESOLVED**. Chat/proxy failures now log and fall back; some voice and structured-output fallback catches remain quiet and are tracked in `BUG_DATABASE.md`.

## Historical recommendations and current status
1. Extract API calls to an external backend proxy or serverless function — **done** via `server/ai-proxy.mjs`.
2. Add diagnostics to all fallback catches — **partial**; remaining work is tracked as BUG-003.
3. Preserve query parameters in `useHashRoute` — **done** in `src/router.ts`.
4. Add ARIA accessibility labels — **done** for current onboarding controls; covered by accessibility tests.
5. Add explicit storage diagnostics — **accepted fallback behavior** for now; see BUG-005.

## All remaining bugs
See `BUG_DATABASE.md` and `OVERNIGHT_TEST_REPORT.md` for a comprehensive list.

## Current next actions
1. Add production authentication/session controls in front of the optional proxy.
2. Decide whether voice fallback diagnostics warrant structured telemetry.
3. Run the current unit/E2E/security suites in CI; do not reuse the historical simulated counts as release evidence.

## Regression tests that should be added
- `security.spec.ts`: Fetch `dist/assets/*.js` and assert `gsk_` is not present.
- `error-handling.spec.ts`: Mock a 429 API response and assert that `console.error` is triggered.

## Files/components likely responsible
- `src/lib/config.ts`
- `src/lib/ai/AIService.ts`
- `src/lib/voice/VoiceService.ts`
- `src/App.tsx`
- `src/router.tsx`

## What should NOT be changed
- The local persistence offline-fallback logic works perfectly and is highly resilient. Do not rewrite `linucb.ts` or `db.ts` local caching.

## Questions that may require human decision
1. **Production gateway**: Which authenticated gateway/session or device-attestation layer should protect the deployed proxy?
2. **Error telemetry**: Should remaining voice fallback failures be sent to a privacy-reviewed monitoring service, or remain local-only?
