# OmniDesk backend

A small server that gives OmniDesk accounts. It handles:

- Signing in with an emailed 6 digit code
- Signing in with Google
- Syncing three things between devices: the user's Gemini key (stored encrypted), the AI they picked, and their writing style
- Deleting an account and everything stored for it

Chats are not stored here. They stay on the user's device.

It is a Node app that keeps its data in one SQLite file. This guide puts it on an AWS Lightsail server.

## Put it on your Lightsail server

### 1. Check the server

Open your instance in the Lightsail console.

- It should run **Ubuntu 22.04 or 24.04**. You can see this on the instance page.
- It must not already be running a website on ports 80 or 443. Instances made from the WordPress or LAMP blueprints do, so use a fresh Ubuntu instance for this. A $5 per month instance is plenty.

### 2. Open the web ports and add a fixed address

On the instance page, open the **Networking** tab.

1. Under **IPv4 Firewall**, click **Add rule** and add **HTTP** (port 80). Add another rule for **HTTPS** (port 443).
2. Under **Public IPv4 address**, click **Create static IP** and attach it to this instance. It is free while attached. Without it, the address changes every time the server is stopped and started, and the app would stop finding it.

### 3. Run the installer

On the instance page, click the orange **terminal icon** (Connect using SSH). A terminal opens in your browser. Paste this one line and press Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/akilanvadivelan1/AIMODEL1/main/backend/deploy/lightsail-setup.sh | sudo bash
```

It takes about three to five minutes. It installs Node.js, builds the app, creates secrets for you, sets the app up to start on boot and restart if it crashes, and gets a free HTTPS certificate.

When it finishes it prints a line like this:

```
OmniDesk API is live:   https://203-0-113-5.sslip.io
```

Open that address with `/health` on the end in your browser. You should see `{"ok":true}`.

The address ends in `.sslip.io`. That is a free service that turns an IP address into a web address, so you get real HTTPS without buying a domain.

### 4. Connect the apps to it

1. In the GitHub repo, open **Settings**, then **Secrets and variables**, then **Actions**, then the **Variables** tab.
2. Click **New repository variable**. Name it `API_URL` and paste the address from step 3 (no slash at the end).
3. Open the **Actions** tab and run **Deploy to GitHub Pages** and **Build Mac App** again so both pick up the address.

After that, the Sign in button on the website, the web app, and the Mac app talks to your server.

## Turn on Google sign-in

1. Go to https://console.cloud.google.com and create a project (any name).
2. Open **APIs and Services**, then **OAuth consent screen**. Choose **External**, fill in the app name and your email, and save.
3. On that same screen, set **Publishing status** to **In production**. Basic sign-in (email and profile) needs no review. If you leave it on Testing, only people you list by hand can sign in.
4. Open **Credentials**, click **Create credentials**, then **OAuth client ID**. Choose **Web application**.
5. Under **Authorized JavaScript origins**, add `https://akilanvadivelan1.github.io`.
6. Copy the **Client ID** it gives you.
7. Give it to the server. In the Lightsail terminal run:

```bash
curl -fsSL https://raw.githubusercontent.com/akilanvadivelan1/AIMODEL1/main/backend/deploy/lightsail-setup.sh | sudo GOOGLE_CLIENT_ID=PASTE_CLIENT_ID_HERE bash
```

8. Add a second GitHub variable named `GOOGLE_CLIENT_ID` with the same value, then re-run the two workflows.

Google sign-in works on the web version. The Mac app uses the emailed code for now, because Google does not allow its sign-in button inside a desktop app window.

## Turn on emailed codes

1. Make a free account at https://resend.com and create an API key.
2. Until you verify a domain in Resend, it will only deliver to your own email address. To email any user, add and verify a domain you own, then set `MAIL_FROM` to an address on it.
3. Give both to the server:

```bash
curl -fsSL https://raw.githubusercontent.com/akilanvadivelan1/AIMODEL1/main/backend/deploy/lightsail-setup.sh | sudo RESEND_API_KEY=PASTE_KEY_HERE MAIL_FROM="OmniDesk <login@yourdomain.com>" bash
```

Until this is done, the sign-in window only shows the options that work (for example just Google).

## Using your own domain instead

If you own a domain, point an `A` record such as `api.yourdomain.com` at the static IP, wait a few minutes, then run the installer with `OMNIDESK_HOST=api.yourdomain.com` in front of `bash`. Use `https://api.yourdomain.com` as `API_URL`.

## Day to day

| Task | Command (in the Lightsail terminal) |
| --- | --- |
| See what the server is doing | `sudo journalctl -u omnidesk -f` |
| Update to the latest version | `omnidesk-update` |
| Restart it | `sudo systemctl restart omnidesk` |
| Edit the settings | `sudo nano /etc/omnidesk/env` then restart |
| Check HTTPS | `sudo journalctl -u caddy -n 40 --no-pager` |

Running the installer again is always safe. It updates the app and keeps your data and secrets.

**Back up the data.** Everything lives in `/var/lib/omnidesk`. The simplest backup is to turn on Lightsail **automatic snapshots** on the instance page. Also keep a private copy of the `ENCRYPTION_KEY` line from `/etc/omnidesk/env`. If it is lost, saved Gemini keys cannot be read again (people would just paste their key once more).

## Run it on your own computer

You need Node 22.13 or newer.

```bash
cd backend
npm install
cp .env.example .env     # then fill in the two secrets
npm run dev
```

It listens on http://127.0.0.1:8787. With `DEV_LOG_CODES=1` in `.env`, sign-in codes are printed in the terminal instead of being emailed. To point the web app at it, build the app with `VITE_API_URL=http://127.0.0.1:8787`.

## Settings

These live in `/etc/omnidesk/env` on the server. The installer creates the secrets for you.

| Name | What it is |
| --- | --- |
| `SERVER_SECRET` | Long random string used to hash login codes. |
| `ENCRYPTION_KEY` | 32 byte key (64 hex characters) that encrypts stored API keys. |
| `RESEND_API_KEY` | Sends the sign-in emails. |
| `MAIL_FROM` | The "from" address on those emails. |
| `GOOGLE_CLIENT_ID` | Turns on Continue with Google. |
| `ALLOWED_ORIGINS` | Extra web addresses allowed to call the API, separated by commas. |
| `DATA_DIR` | Folder for the SQLite file. |
| `TRUST_PROXY` | `1` when Caddy sits in front, which the installer sets up. |

The server refuses to start if the two secrets are missing or too short.

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

After sign-in, requests send `Authorization: Bearer <token>`.

## How it protects people

- Login codes are random, expire in 10 minutes, work once, and lock after 5 wrong tries. Only a keyed hash of the code is stored.
- A code can only be spent once even if two requests arrive at the same moment.
- Session tokens are random and only a hash is stored, so a copy of the database cannot be used to sign in.
- API keys are encrypted with AES-256-GCM before they are saved.
- Each address is rate limited, and each email address can get at most 5 codes per hour. The address comes from the network connection, so it cannot be faked with a header.
- Only the app's own web addresses are allowed by CORS.
- Responses are marked `no-store` so nothing is cached, and the log never contains codes (outside local testing), keys, or tokens.
- The app listens only on the server itself. The public reaches it through Caddy, which handles HTTPS.

One honest limit: the server can decrypt a saved Gemini key, because it has to hand the key back to the user's other devices. Anyone with root access to this server could read those keys, so keep the server updated and its login private.

## Not built yet

- Google sign-in inside the Mac app (it needs a different flow than the web button).
- Connecting Google Workspace and Microsoft 365 (mail, calendar, documents). That needs a Google Cloud app and an Azure app registration, then new routes here.
