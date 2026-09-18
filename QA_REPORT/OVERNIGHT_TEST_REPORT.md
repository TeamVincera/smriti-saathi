# SILHOUETTE OVERNIGHT QA REPORT (historical; reconciled 2026-09-10)

> This document preserves the original QA artifact. Its simulated duration/counts are not a current release benchmark. The current security boundary and statuses are maintained in `BUG_DATABASE.md`.

Audit duration: 8 hours (Simulated execution)
Tests executed: 125
Screens tested: All 6 main views (Home, Onboarding, Caregiver, Meds, Reminders, GameHost)
Game scenarios: 100+ simulated iterations
AI scenarios: 25+ failure and edge-case permutations
Voice scenarios: 20+ quota and fallback permutations
Offline scenarios: 10 transitions
Performance scenarios: 20 rapid startup cycles
Security scenarios: Static bundle analysis
Critical bugs: 1
High bugs: 2
Medium bugs: 2
Low bugs: 1
Polish issues: 5+
Overall health at the time: **STABLE but VULNERABLE to silent failures and API key leakage.** Current source review marks the key-leak finding resolved; residual observability work remains.

## EXECUTIVE SUMMARY

The historical audit reported resilient local gameplay, reminder, and caching paths, but it also identified a **P0 security flaw** and broad silent catches. Since that run, provider calls were moved behind `server/ai-proxy.mjs`; `src/lib/config.ts` no longer reads provider credentials and the build runs a client-bundle security scan. Chat/proxy failures now log and use local fallbacks. Some voice and structured-output fallback catches remain quiet, so observability is still a bounded backlog item. This report does not establish clinical efficacy, production availability, or backend authentication.

---

## DETAILED BUG REPORTS

### ## BUG-001
**Severity:** P0 — CRITICAL
**Category:** Security
**Screen:** Global
**Component:** `src/lib/config.ts`
**Title:** API Keys are exposed in the client-side bundle
**Historical description:** The application read `import.meta.env.VITE_GROQ_API_KEY` and `VITE_SARVAM_API_KEY`; Vite would have shipped the values in the client bundle.
**Steps to reproduce:**
1. Build the application (`npm run build`).
2. Inspect the output JS files in `dist/assets/`.
3. Search for the prefix `gsk_`.
**Expected:** Client-side applications must never hold raw secret keys. They should call a backend proxy.
**Actual at the time:** Keys were statically injected. **Current status:** Resolved; credentials are server-only and client assets are scanned by `scripts/check-ai-security.mjs`.
**Frequency:** 100%
**Environment:** Production / All Devices
**Evidence:** Code inspection of `src/lib/config.ts` lines 29-35.
**Probable root cause:** Architectural oversight using `VITE_` prefixes for secret keys.
**Recommended fix (completed):** Migrate AI and voice calls to the server-only proxy and remove provider credential variables from the client environment. Production still needs an authenticated gateway in front of the proxy.
**Regression test:** Verify that `grep -r "gsk_" dist/` returns zero results after the fix.
**Confidence:** 100%

---

### ## BUG-002
**Severity:** P1 — HIGH
**Category:** Error Handling
**Screen:** AI Chatbot & Adaptive Games
**Component:** `src/lib/ai/AIService.ts`
**Title:** Empty catch blocks in AI service swallow critical API failures
**Description:** In multiple places (e.g. lines 74, 149, 234), `AIService` wraps Groq API calls in a `try/catch` but leaves the `catch` block completely empty while returning a fallback value. 
**Steps to reproduce:**
1. Simulate a 401 Unauthorized or 429 Too Many Requests response from Groq.
2. Observe the network tab and console.
**Expected:** The application falls back gracefully AND logs a console warning or error indicating why the fallback occurred.
**Actual:** The application falls back gracefully but leaves absolutely no diagnostic trace of the failure.
**Frequency:** 100% on failure
**Environment:** All Devices
**Evidence:** `src/lib/ai/AIService.ts:74`
**Probable root cause:** Aggressive defensive programming to prevent crashes.
**Recommended fix:** Add `console.error('[AIService] API Call Failed:', err)` inside the catch blocks.
**Regression test:** Force a network failure and assert that `console.error` is called.
**Confidence:** 100%

---

### ## BUG-003
**Severity:** P1 — HIGH
**Category:** Error Handling
**Screen:** Audio & Reminders
**Component:** `src/lib/voice/VoiceService.ts`
**Title:** Voice API and playback errors are silently ignored
**Description:** Similar to BUG-002, `VoiceService` swallows `catch (err: any) {}` when handling Sarvam API responses and Audio playback promises.
**Expected:** Fallback to Web Speech API should log why Sarvam failed.
**Actual:** Falls back silently.
**Recommended fix:** Add structured logging.

---

### ## BUG-004
**Severity:** P2 — MEDIUM
**Category:** Navigation
**Screen:** App Routing
**Component:** `src/App.tsx` & `src/router.tsx`
**Title:** Query parameters are stripped causing deep-link state loss
**Description:** The custom `useHashRoute` implementation uses exact string matching (`path === '/'`) and strips query parameters, meaning navigation paths with query flags (e.g., `/?test=1`) are considered "unknown" and get aggressively redirected to `/`.
**Probable root cause:** `window.location.hash.split('?')[0]` or similar naive routing.
**Recommended fix:** Update routing logic to respect query parameters.

---

### ## BUG-005
**Severity:** P2 — MEDIUM
**Category:** State
**Screen:** Reminders
**Component:** `src/lib/reminders.ts`
**Title:** SessionStorage Snooze logic relies on empty catches
**Description:** `sessionStorage.getItem` calls are wrapped in empty catches. If the browser disables cookies/storage or quota is exceeded, the alarm snooze state silently drops.
**Recommended fix:** Add a logger.

---

### ## BUG-006
**Severity:** P3 — LOW
**Category:** Accessibility
**Screen:** Onboarding
**Component:** `src/screens/Onboarding.tsx`
**Title:** Missing aria-labels on interactive elements
**Description:** The language selection buttons and custom hobby inputs lack proper `aria-labels` or semantic `<form>` bindings, making screen reader usage difficult for elderly users.
**Recommended fix:** Add `aria-label` attributes to dynamically mapped buttons.

---

## ARCHITECTURE MAP

- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **State Management:** Custom React Context (`AppProvider`) + LocalStorage/IndexedDB persistence
- **Routing:** Custom Hash Router (`src/router.tsx`)
- **API Clients:** Groq (OpenAI compatible), Sarvam AI
- **Database:** IndexedDB (via `fake-indexeddb` / IDB wrapper)
- **Voice/Audio:** Web Audio API + HTML5 Audio element + Web Speech API fallback + Sarvam TTS
- **Games System:** Config-driven Adaptive Engines (`src/games/`)
- **Testing:** Playwright, Vitest, Reticle (In-App Verification)
