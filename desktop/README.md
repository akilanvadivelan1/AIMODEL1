# OmniDesk Desktop (Mac) — Tauri

This wraps the OmniDesk web UI in a native macOS app and adds a **global hotkey**
to summon the assistant over any screen.

## What this gives you

- A real `.app` / `.dmg` for macOS (Apple Silicon and Intel).
- A global shortcut (default **Option + /**) that shows/hides the OmniDesk window from anywhere.
- The same own-API-key model as the web app (your Gemini key stays on your machine).

## Why there is no prebuilt binary in this repo

A macOS app must be compiled on macOS with Xcode command-line tools. The build
is therefore produced by GitHub Actions on a macOS runner (see
`.github/workflows/mac-build.yml`), or locally on your own Mac.

## Build it on your own Mac

Prerequisites (one time):

1. Install Rust: https://rustup.rs
2. Install Xcode command-line tools: `xcode-select --install`
3. Install Node dependencies at the repo root: `npm install`

Then from the repo root:

```bash
npm run build          # build the web UI into dist/
npm run tauri:build    # package the Mac app (output in desktop/src-tauri/target/release/bundle)
```

The `.dmg` and `.app` appear under
`desktop/src-tauri/target/release/bundle/`.

## Run in development (live reload)

```bash
npm run tauri:dev
```

## Notes

- First launch of an unsigned build: right-click the app and choose Open, then
  confirm, because it is not notarized by Apple yet. Distributing it to other
  people without that warning requires a paid Apple Developer account for
  signing and notarization.
- The global hotkey can be changed in `desktop/src-tauri/src/main.rs`.
