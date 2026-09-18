# Cloudflare AI proxy

This Worker is the production-friendly replacement for the laptop-hosted
`server/ai-proxy.mjs`. It keeps provider credentials at the edge and exposes
the same routes used by the Capacitor client:

- `GET /api/ai/status`
- `POST /api/ai/chat`
- `POST /api/ai/transcribe`
- `POST /api/ai/tts` for Sarvam Bulbul v3 (`azure` remains a `503` fallback)

The Worker never sends provider credentials to the client. The app only needs
the public Worker URL as `VITE_AI_PROXY_URL` or `VITE_AI_PROXY_URLS`.

## One-time setup

1. Install and authenticate Wrangler:

   ```sh
   npx --yes --package wrangler@4 wrangler login
   ```

2. Edit `wrangler.toml` and set `AI_PROXY_ORIGINS` to the exact origins that
   should be allowed to call the Worker. Keep `capacitor://localhost` for the
   iOS Capacitor build and `http://localhost`/`https://localhost` for Android;
   add the deployed web origin if the web app will use this Worker.

3. Store provider credentials as Worker secrets. These commands prompt for the
   value; do not put the value in source, `.env.local`, or `wrangler.toml`:

   ```sh
   npx --yes --package wrangler@4 wrangler secret put GROQ_API_KEY
   npx --yes --package wrangler@4 wrangler secret put SARVAM_API_KEY
   ```

## Deploy

From the repository root:

```sh
npm run ai-proxy:worker:deploy
```

Wrangler prints the resulting `https://...workers.dev` URL. Use that URL with
the `/api/ai` suffix in the app's ignored build-time configuration, for example:

```dotenv
VITE_AI_PROXY_URL=https://<your-worker-host>/api/ai
```

Then rebuild and sync the native app. Never commit that local environment file;
the URL is routing information, while provider credentials remain Worker
secrets.

## Verify

Check the health contract without sending a prompt:

```sh
curl -i https://<your-worker-host>/api/ai/status \
  -H 'Origin: capacitor://localhost'
```

With `GROQ_API_KEY` configured and reachable, the JSON response is
`{"available":true,"ready":true}`. Missing credentials or an upstream failure
returns the same deterministic unavailable shape as the local proxy.

Sarvam TTS uses the optional non-secret Worker variables `SARVAM_SPEAKER` and
`SARVAM_PACE`; the Worker defaults to the validated `shreya` speaker and `0.9`
pace when they are omitted. Azure TTS intentionally returns `503` so the
client can use its existing on-device/browser speech fallback.

For local Worker emulation, run:

```sh
npm run ai-proxy:worker:dev
```

The local Worker still needs `GROQ_API_KEY` supplied through Wrangler's local
secret mechanism. Do not copy a production credential into the repository.
