# Silhouette - Autonomous QA Bug Database

| ID | Severity | Category | Screen | Bug | Reproducibility | Evidence | Status |
|---|---|---|---|---|---|---|---|
| BUG-001 | P0 - CRITICAL | Security | Global | API Keys (Groq, Sarvam) are bundled into the client via `import.meta.env.VITE_` | 100% | `src/lib/config.ts` | OPEN |
| BUG-002 | P1 - HIGH | Error Handling | Global | `AIService.ts` catches API errors silently without fallback logging | 100% | `src/lib/ai/AIService.ts:74` | OPEN |
| BUG-003 | P1 - HIGH | Error Handling | Global | `VoiceService.ts` catches playback & TTS errors silently | 100% | `src/lib/voice/VoiceService.ts:108` | OPEN |
| BUG-004 | P2 - MEDIUM | Navigation | App | Query parameters in URLs are ignored by `useHashRoute` leading to loss of context on deep links | 100% | `src/App.tsx:30` | OPEN |
| BUG-005 | P2 - MEDIUM | State | App | Empty catch blocks in IndexedDB persistence (`db.ts` wrapper likely) masking storage quota errors | 100% | `src/lib/db.ts` dependencies | OPEN |
| BUG-006 | P3 - LOW | Accessibility | Onboarding | Missing `aria-labels` on several custom buttons (e.g. language selection) | 100% | `src/screens/Onboarding.tsx` | OPEN |
