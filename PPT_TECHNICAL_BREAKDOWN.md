# Smriti Sathi — SIH Technical Breakdown (Current Build)

This is a presentation aid grounded in the repository as of September 10, 2026. “Implemented” below means code and tests exist; roadmap items must not be presented as shipped capabilities.

## 1. Technology stack

- React 18 + TypeScript, bundled with Vite.
- Capacitor shells for Android and iOS packaging.
- IndexedDB via a small typed wrapper for local persistence; local storage is used for a few browser preferences.
- Pure TypeScript adaptive logic: a 25-feature MLP/question engine and LinUCB policies; no TensorFlow or native ML runtime is bundled.
- Vitest unit/integration tests, Playwright E2E tests, and Reticle instrumentation.

## 2. Architecture

```text
React/Vite UI + Capacitor shell
        │
        ├── IndexedDB: profile, sessions, events, medicines, reminders, adaptive state
        ├── Local games, reminders, adaptive engines, safety rules, and fallback copy
        └── Optional HTTPS /api/ai proxy
              ├── Groq chat and transcription
              ├── Sarvam Bulbul v3 TTS (hi/bn/en)
              └── Azure Speech TTS (as/bn/hi/en)
```

Core gameplay, local state, reminders, and local adaptation do not require internet access. Online AI is a best-effort enhancement. The browser client never receives provider credentials. `server/ai-proxy.mjs` owns provider calls, input validation, origin allowlisting, body limits, per-IP rate limiting, bounded upstream requests, and normalized errors. The proxy has no built-in user authentication; a production deployment must add an authenticated gateway/session or device-attestation layer.

## 3. What is implemented

### Patient and caregiver experience

- Six-language onboarding with patient, cultural, routine, caregiver, optional clinical-context, and local PIN fields.
- 23 culturally themed games, unlocked in three phases at 0, 4, and 8 completed sessions.
- Local session metrics, gentle cues, adaptive difficulty, caregiver summaries, medicine/adherence logging, daily reminders, appointments, and a local caregiver PIN gate.
- PWA and Capacitor packaging, with native local-notification integration where device permissions allow it.

### Local intelligence

- `src/lib/adaptive/MLInferenceEngine.ts`: 25 → 16 → 8 → 1 typed-array MLP used as a deterministic appropriateness scorer. Its source describes a small footprint, but repository tests—not a device benchmark—are the authority for performance; do not promise a fixed latency or clinical calibration.
- `src/lib/adaptive/BanditPolicy.ts`: 25-feature LinUCB arm state with Sherman–Morrison updates for question selection.
- `src/lib/linucb.ts`: 10-feature session-level LinUCB used by the game recommender.
- `src/lib/adaptive/SafetyGuard.ts`: deterministic anti-repetition, failure-protection, fatigue, and gradual-progression rules that can override a model choice.
- `src/lib/sathi.ts`: locally computed trend/stability indicator and caregiver alert candidates. It is an engagement signal, not a diagnosis or prediction of infection, delirium, or disease progression.

### Online AI and voice

- `AIService` first checks browser connectivity and the proxy readiness endpoint. It calls `/api/ai/chat` for optional chat, recommendations, and caregiver summaries, then falls back to local behavior.
- Speech output uses cached audio and browser Web Speech TTS locally; online neural TTS is requested through `/api/ai/tts` when available.
- Browser speech recognition may be used where supported. When unavailable, microphone transcription requires `/api/ai/transcribe` and a configured server provider; guaranteed offline ASR is not implemented.

## 4. Storage and privacy boundary

IndexedDB stores `kv`, `events`, `sessions`, `meds`, `medlog`, `daily_reminders`, and `appointments`. There is no cloud database, account, OTP flow, remote authentication, CRDT engine, Bluetooth/Wi-Fi Direct bridge, or ASHA server sync in this build. A local caregiver PIN is access gating on one device, not identity or encryption. The app does not claim encrypted-at-rest storage or end-to-end encryption.

Provider credentials are server-only (`GROQ_API_KEY`, `SARVAM_API_KEY`, `AZURE_SPEECH_KEY`). `VITE_AI_PROXY_URL` is an endpoint, not a credential. `npm run build` executes `scripts/check-ai-security.mjs`, which scans client assets for provider URLs, credential variables, authorization headers, and common key material.

## 5. Deployment

### Offline demo

Run `npm run build` and serve `dist/`, or run the Capacitor sync commands for native packaging. The static app can demonstrate games, local storage, reminders, and fallback behavior without provider secrets.

### Online AI

Run the proxy with `npm run ai-proxy` or use `npm run dev` for the local proxy plus Vite. For production, deploy the proxy behind HTTPS, set exact `AI_PROXY_ORIGINS`, place provider keys only in the server environment, and set `VITE_AI_PROXY_URL` to the non-secret proxy URL for native clients. See [`docs/AI_PROXY.md`](docs/AI_PROXY.md) for the complete configuration and gateway requirements.

## 6. Testing and evidence

- Unit/integration tests cover local persistence, adaptive logic, safety fallbacks, voice behavior, proxy validation, route behavior, and caregiver flows.
- Playwright suites cover onboarding, games, reminders, caregiver hub, responsive layouts, and PWA/offline behavior.
- The security boundary is tested in `test/unit/ai-proxy-security.test.ts` and enforced in the build script.
- Performance and pilot metrics remain evaluation work. No clinical validation, efficacy, or treatment outcome is established by the repository.

## 7. Roadmap (do not present as implemented)

Production authentication and gateway controls; backup/export; encrypted storage; multi-device/cloud sync; CRDT/P2P ASHA transfer; guaranteed offline ASR; camera emotion models; server-managed content packs; clinical oversight and formal validation.

