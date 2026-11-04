# OmniDesk backend

A small API that gives OmniDesk accounts. It handles:

- Sign in with an emailed 6 digit code
- Sign in with Google
- Syncing three things between devices: the user's Gemini key (stored encrypted), the AI they picked, and their writing style
- Deleting an account and everything stored for it

Chats are not stored here. They stay on the user's device.

## Run it locally

You need Node 22.13 or newer.

```bash
cd backend
npm install
cp .env.example .env     # optional for local use
npm run dev
```

The server starts on http://localhost:8787. With no email key set, sign-in codes are printed in the terminal instead of being emailed. That is the easiest way to try it.

To point the web app at it, run the app with:

```bash
VITE_API_URL=http://localhost:8787 npm run dev
```

## Settings (environment variables)

See `.env.example` for the full list.

| Name | Needed | What it is |
| --- | --- | --- |
| `SERVER_SECRET` | production | Long random string used to hash login codes. |
| `ENCRYPTION_KEY` | production | 32 byte key (64 hex characters) that encrypts stored API keys. Losing it makes stored keys unreadable. |
| `RESEND_API_KEY` | production | Sends the sign-in emails through Resend. |
| `MAIL_FROM` | optional | The "from" address on emails. |
| `GOOGLE_CLIENT_ID` | optional | Turns on Continue with Google. |
| `DATA_DIR` | optional | Folder for the SQLite file. Default `./data`. |
| `ALLOWED_ORIGINS` | optional | Extra web addresses allowed to call the API. |
| `TRUST_PROXY` | optional | Set to `1` behind a hosting proxy. |

Make the two secrets with `openssl rand -hex 32`.

In production the server refuses to start if the secrets or the email key are missing.

## Deploying

Any host that runs Node 22.13 or newer works, for example Render, Fly.io, or Railway.

1. Deploy the `backend` folder. Build command `npm install && npm run build`, start command `npm start`.
2. Set the environment variables above and `NODE_ENV=production` and `TRUST_PROXY=1`.
3. Attach a persistent disk and point `DATA_DIR` at it. The database is a SQLite file, so a host with a temporary disk will lose accounts on every restart.
4. In the GitHub repo, open Settings, then Secrets and variables, then Actions, then Variables. Add `API_URL` with the address of your deployed backend (for example `https://omnidesk-api.onrender.com`). Add `GOOGLE_CLIENT_ID` too if you turn on Google sign-in.
5. Re-run the "Deploy to GitHub Pages" workflow and the "Build Mac App" workflow so both pick up the new address.

If `API_URL` is empty, the app hides the sign-in button and works locally only.

## Email (Resend)

1. Create a free account at https://resend.com and make an API key.
2. Without a verified domain, Resend only delivers to your own email address. To email any user, verify a domain in Resend and set `MAIL_FROM` to an address on it.

## Google sign-in

1. In Google Cloud Console, create an OAuth client ID of type Web application.
2. Add `https://akilanvadivelan1.github.io` under Authorized JavaScript origins.
3. Put the client ID in `GOOGLE_CLIENT_ID` on the backend and in the `GOOGLE_CLIENT_ID` GitHub variable.

Google sign-in works on the web version. The Mac app uses the emailed code for now, because Google does not allow its sign-in button inside a desktop app window.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Is the server up |
| GET | `/auth/config` | Which sign-in options are on |
| POST | `/auth/email/start` | Email a code. Body `{ "email" }` |
| POST | `/auth/email/verify` | Trade a code for a session. Body `{ "email", "code" }` |
| POST | `/auth/google` | Sign in with a Google ID token. Body `{ "idToken" }` |
| POST | `/auth/logout` | End the session |
| GET | `/me` | Who is signed in |
| DELETE | `/me` | Delete the account and its data |
| GET | `/settings` | Read synced settings |
| PUT | `/settings` | Save synced settings. Leave a field out to keep it, send `null` to clear it |

Requests after sign-in send `Authorization: Bearer <token>`.

## How it protects people

- Login codes are random, expire in 10 minutes, work once, and lock after 5 wrong tries. Only a keyed hash of the code is stored.
- Session tokens are random and only a hash is stored, so a copy of the database cannot be used to sign in.
- API keys are encrypted with AES-256-GCM before they are saved.
- Requests are rate limited, and each email address can get at most 5 codes per hour.
- Only the app's own web addresses are allowed by CORS.
- Responses are marked `no-store` so nothing is cached.

One honest limit: the server can decrypt a saved Gemini key, because it has to hand the key back to the user's other devices. Anyone running this backend can in principle read those keys, so deploy it yourself and protect `ENCRYPTION_KEY`.

## Not built yet

Connecting Google Workspace and Microsoft 365 (mail, calendar, documents). That needs a Google Cloud app and an Azure app registration, then new routes here.
