# AI proxy development and deployment

The web client uses relative same-origin `/api/ai` endpoints. A packaged Capacitor client must use an absolute HTTPS proxy URL, supplied as the non-secret `VITE_AI_PROXY_URL` build variable (or `window.__SMRITI_AI_PROXY_URL__` before startup). The browser never receives or stores provider credentials.

## Local development

Run `npm run dev` from the repository root. The declared development runner starts the proxy on `http://127.0.0.1:8787` and Vite on `http://localhost:5173`; Vite forwards `/api/ai/*` to the proxy. Put backend-only values in the ignored `.env` file using `.env.example` as a shape guide. On supported Node versions the runner uses Node's `--env-file=.env`; on older Node versions it loads the same values in memory for the proxy process. Values are never printed or bundled into the client. `/api/ai/status` performs a bounded Groq upstream readiness probe using the server-held provider key and caches success/failure briefly; this is not user authentication. If the key or provider is unavailable it reports unavailable and cloud AI stays disabled while local/offline features remain usable.

Run `node server/ai-proxy.mjs` behind the app's HTTPS origin (or mount the exported `handleAiProxy` handler in the existing server). Configure secrets only in the server environment:

- `GROQ_API_KEY` for chat and Whisper transcription
- `SARVAM_API_KEY` for Sarvam speech synthesis
- `SARVAM_SPEAKER` optionally selects an allowlisted Bulbul v3 speaker (default `shreya`)
- `SARVAM_PACE` optionally selects a calm Bulbul v3 pace from `0.5` to `2.0` (default `0.9`)
- `AZURE_SPEECH_KEY` and optional `AZURE_SPEECH_REGION` for Azure speech synthesis
- `PORT` optionally selects the standalone proxy port (default `8787`)
- `HOST` optionally selects the standalone bind address (default `127.0.0.1`; set an externally reachable address only behind a controlled HTTPS reverse proxy)
- `TRUST_PROXY=1` enables `X-Forwarded-For` client-IP extraction; leave it unset unless a trusted reverse proxy overwrites that header.

For production web, serve the built app and route same-origin `/api/ai` to this proxy. Set `AI_PROXY_ORIGINS` to the exact HTTPS web origin (plus any explicitly deployed Capacitor origins); do not use a wildcard. For packaged Capacitor builds, set the non-secret `VITE_AI_PROXY_URL=https://your-proxy.example/api/ai` at build time and deploy the proxy separately over HTTPS. Native clients cannot safely hold a shared proxy secret, so use origin/rate controls and platform access controls available to your deployment.

The proxy allows only origins listed in `AI_PROXY_ORIGINS`, applies per-IP request limits, validates each operation, caps request bodies, and normalizes upstream failures. CORS and rate limits are abuse controls, not authentication. Production must put an authenticated gateway/session or device-attestation layer in front of the proxy; native clients cannot safely hold a shared secret, so never put one in the client. Do not use a `VITE_` credential variable, put a key in `localStorage`, or paste a provider key into the app.

Speech profiles are server-owned: the client sends only a non-secret profile identifier for cache separation, while Sarvam speaker/pace values come from the server allowlist. Azure uses escaped, sentence- and paragraph-aware SSML pauses with conservative rate, pitch, and volume prosody; it does not use voice-specific styles. Patient text is never logged by the proxy.
