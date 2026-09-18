# API TEST REPORT (historical simulation; reconciled 2026-09-10)

> This report records the earlier mocked-provider exercise. It is not evidence of production availability, clinical efficacy, or a deployed backend. Current requests go through the server-only proxy documented in `docs/AI_PROXY.md`.

## API Simulation Protocol
- **Groq API**: Normal calls, simulated empty payloads, timeout delays, and malformed JSON schemas.
- **Sarvam API**: Rate limit 429 exhaustion simulation, 401 unauth checks.

## Key Findings

| Test Scenario | Subsystem | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| Groq 429 Rate Limit | `AIService` | Fallback to local policy | Successfully falls back. Current proxy normalizes 429s; chat/proxy failures log diagnostics. | PASS |
| Groq Network Timeout | `AIService` | 5s timeout triggers fallback | Timeout triggers local fallback. | PASS |
| Groq Malformed Schema | `AIService` | Reject JSON, return null | Returns null. | PASS |
| Sarvam 401 Unauth | `VoiceService` | Toggle off voice capability | Toggle off voice. | PASS |
| Sarvam 429 Exceeded | `VoiceService`| Fallback without repeated failure loop | Falls back to available local speech path; provider/cache catches remain an observability backlog item. | PASS (fallback) |
| Sarvam Network Drop | `VoiceService` | Fallback to Web Speech API | Triggers native text-to-speech fallback smoothly. | PASS |

## Conclusion
The current proxy/fallback boundary is covered by mocked tests, but this is not a production deployment certification. Remaining risk is **observability**: some voice and structured-output fallback catches intentionally return safe fallbacks without structured telemetry. Production authentication, monitoring, and provider credentials must be configured outside the client.
