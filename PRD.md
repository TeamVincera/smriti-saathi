# Smriti Sathi — Product Requirements and As-Built Boundary

**Version:** 1.1
**Date:** September 10, 2026
**Status:** SIH-ready product brief; implementation status is called out explicitly.
**Platform:** React/Vite web app with Capacitor iOS/Android shells
**Region:** North Eastern Region, India

> Smriti Sathi is an assistive memory, routine, and caregiver-support app. It is not a medical device, diagnostic service, treatment, or proof of cognitive improvement. It must not be used to change medicines or replace professional care.

## 1. Product intent

Smriti Sathi gives older adults and families a calm, culturally familiar set of cognitive activities, medication/routine reminders, and caregiver views. Core activities are designed to remain useful without internet access. Optional online AI adds conversational and speech features when a separately deployed proxy is reachable.

## 2. Current implementation (shipped in this repository)

| Area | Current behavior | Evidence |
|---|---|---|
| Onboarding | Six language choices (Assamese, Bengali, Bodo, Manipuri, Hindi, English), patient/cultural/routine/caregiver fields, optional user-entered clinical context, and optional local caregiver PIN | `src/screens/Onboarding.tsx`, `src/lib/types.ts` |
| Activities | 23 culturally themed games across three unlock phases; phase 2 unlocks after 4 completed sessions and phase 3 after 8 | `src/lib/games.ts` |
| Local adaptation | Local performance tracking, 25-feature question engine (MLP + LinUCB + deterministic safety rules), and a 10-feature session-level LinUCB recommender | `src/lib/adaptive/`, `src/lib/linucb.ts`, `src/lib/ai.ts` |
| Storage | Browser IndexedDB stores profiles, events, sessions, medicines, logs, reminders, appointments, and adaptive state; limited UI preferences also use local storage | `src/lib/db.ts`, `src/state.tsx` |
| Reminders | Medicine, daily routine, and appointment reminders; web/in-app behavior plus Capacitor local notifications when permissions and native support are available | `src/lib/reminders.ts`, `src/lib/alarmService.ts` |
| Caregiver view | Local PIN gate, adherence/session summaries, local alerts, and a non-diagnostic stability indicator derived from recorded sessions | `src/screens/CaregiverHub.tsx`, `src/lib/sathi.ts` |
| Offline fallback | Local game logic, persistence, adaptive logic, prewritten chat fallbacks, cached audio, and browser Web Speech TTS can continue without the online proxy | `src/lib/ai/AIService.ts`, `src/lib/voice/VoiceService.ts` |
| Online enhancement | Chat and caregiver-summary requests use `/api/ai`; speech transcription and neural TTS use the same proxy when available | `src/lib/ai/proxyClient.ts`, `server/ai-proxy.mjs` |
| Security boundary | Groq, Sarvam, and Azure credentials are read only by the proxy server. `npm run build` runs a client-bundle security scan | `server/ai-proxy.mjs`, `scripts/check-ai-security.mjs` |

## 3. Online/offline architecture

The app is local-first, not cloud-synchronized. The browser or native shell owns the profile, activity records, reminders, and adaptive state. Online AI is an optional enhancement:

```text
UI / Capacitor shell
        │
        ├── IndexedDB + local adaptive engines + local fallbacks  (works offline)
        │
        └── /api/ai proxy (online only)
                ├── Groq chat / transcription
                ├── Sarvam neural speech (hi/bn/en)
                └── Azure neural speech (as/bn/hi/en)
```

The client sends requests to a same-origin `/api/ai` route on the web, or to a non-secret `VITE_AI_PROXY_URL` for a packaged Capacitor build. Provider keys belong in the proxy environment only. The proxy validates inputs, restricts origins, rate-limits by IP, bounds request sizes, normalizes upstream errors, and does not log patient text. CORS and rate limiting are abuse controls, not user authentication.

Offline does not mean every voice path is offline: browser Web Speech TTS and cached audio can work locally, while microphone transcription falls back to the proxy when browser speech recognition is unavailable. Online neural speech is optional and may be unavailable even when the device has internet access.

## 4. Scope and requirements

### Shipped now

- Large-touch, responsive patient flows and caregiver-assisted onboarding.
- Local language content for the six languages listed above; content breadth and speech-provider coverage vary by language.
- Twenty-three games with gentle cues, session metrics, local adaptive selection, and local session history.
- Medicine, daily routine, appointment scheduling, adherence logging, snooze/dismiss actions, and native notification integration where supported.
- Local caregiver PIN gate. This is device-local access control, not an account, OTP, identity proof, or remote authentication system.
- Non-diagnostic local/online caregiver summaries with safety filtering and local fallback text.

### Planned / not implemented

- Accounts, OTP login, remote identity, multi-device authorization, or caregiver cloud access.
- CRDT synchronization, cloud database, ASHA peer-to-peer transfer, Bluetooth/Wi-Fi Direct exchange, and district-server ingestion.
- Clinical validation, randomized trials, efficacy claims, or regulatory clearance.
- Camera-based emotion inference, on-device IndicConformer/Sherpa/Vosk models, or guaranteed offline speech recognition.
- Encrypted application database, end-to-end encryption, or a production authenticated gateway in front of the optional AI proxy.
- Background asset/content distribution and server-managed clinical configuration.

## 5. Safety and language

The product must use assistive, non-diagnostic language. It may offer general education, comfort, and routine support; it must not diagnose, claim to treat or cure a condition, infer infection/delirium, or advise starting, stopping, or changing a medicine or dose. Alerts are prompts for caregiver attention, not clinical predictions. A clinician or pharmacist remains responsible for medical decisions.

## 6. Deployment requirements

### Offline-only web or native demo

Build the static app with `npm run build`, then serve `dist/` or sync it into a Capacitor shell. Games, local storage, adaptive logic, reminders, and local fallbacks do not require provider credentials. Notification permissions and exact-alarm behavior depend on the browser/OS.

### Online AI deployment

Deploy `server/ai-proxy.mjs` (or mount its exported handler) behind HTTPS. Configure server-only `GROQ_API_KEY`, `SARVAM_API_KEY`, and/or `AZURE_SPEECH_KEY` plus `AI_PROXY_ORIGINS`; use `VITE_AI_PROXY_URL` only as a non-secret client endpoint. Production still needs an authenticated gateway, session, or device-attestation layer if the proxy is exposed beyond a controlled demo. See [`docs/AI_PROXY.md`](docs/AI_PROXY.md).

## 7. Evaluation plan (future, not results)

Pilot targets such as adherence, usability, crash rate, and caregiver satisfaction are hypotheses for a properly approved evaluation. No clinical efficacy, treatment, or pilot outcome is established by this repository. Any future study must define consent, privacy, clinical oversight, analysis methods, and a registered evaluation protocol before results are presented.

## 8. Release framing

- **Current demo/MVP:** onboarding, 23 games, local adaptation, reminders, caregiver view, PWA/native packaging, and optional proxy-backed AI.
- **Next engineering tranche:** production gateway/authentication, privacy review, device backup/export, accessibility review, and operational monitoring.
- **Later roadmap:** multi-device sync, ASHA workflows, additional speech/content packs, and formal evaluation. These are roadmap items, not current capabilities.

## 9. Risks and mitigations

| Risk | Current mitigation / remaining work |
|---|---|
| Medical over-interpretation | Non-diagnostic copy, safety routing, no treatment advice; clinical review still required |
| Device loss or browser-data clearing | Local persistence only; backup/export and recovery are not implemented |
| Proxy abuse | Origin allowlist, body limits, rate limits, normalized errors; production authentication remains required |
| Voice availability | Cached/browser speech fallback; offline ASR is not guaranteed |
| Notification reliability | Permission/status UI and native scheduling; delivery depends on OS/browser settings |
| Multi-device continuity | Not implemented; no CRDT/P2P/cloud sync claim should be made |
