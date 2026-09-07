# MORNING HANDOFF

## What was tested
- API Key Security & Obfuscation
- React State & Navigation Stability
- Reminder Engine Intervals & Snooze Logic
- Sarvam & Groq Fallback Handling
- Forms, Input Sanitization, Onboarding Constraints

## Most serious bugs
1. **API Keys Statically Bundled** (`src/lib/config.ts`). The `VITE_` prefix guarantees the keys are shipped directly in the JS payload, risking massive quota theft.
2. **Silent API Failures** (`src/lib/ai/AIService.ts` and `src/lib/voice/VoiceService.ts`). Empty `catch {}` blocks prevent monitoring tools from detecting actual API exhaustion or network failures.

## Top 10 fixes recommended
1. Extract API calls to an external backend proxy or serverless function.
2. Add `console.error` and structured telemetry to all empty catch blocks.
3. Update `useHashRoute` in `router.ts` to preserve query parameters for deep linking.
4. Add ARIA accessibility labels to custom UI buttons (e.g. language selection).
5. Add explicit boundary checks for `sessionStorage` in `reminders.ts` to log errors when storage is disabled.

## All remaining bugs
See `BUG_DATABASE.md` and `OVERNIGHT_TEST_REPORT.md` for a comprehensive list.

## Suggested implementation order
1. **Security Fixes**: Resolve API key leak first by creating a proxy.
2. **Observability Fixes**: Remove empty catch blocks so subsequent QA testing can capture error traces.
3. **Routing/State**: Fix `useHashRoute`.
4. **Polish**: Add ARIA labels.

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
1. **Backend Infrastructure**: The application currently has no backend. To fix the API key leak, do you want to introduce a Next.js API route, a Supabase Edge Function, or a Cloudflare Worker?
2. **Error Telemetry**: Do you want to implement Sentry or Datadog for client-side error reporting, or simply use `console.error`?
