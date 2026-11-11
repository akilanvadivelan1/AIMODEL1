# OmniDesk for Mac

This wraps the OmniDesk web app in a native macOS app (built with Tauri) and adds a quick-search widget you can summon from anywhere.

## How the widget works

Press **Option + /** from any app.

1. The OmniDesk logo appears in the top right corner of your screen.
2. Hover over the logo and a search bar opens. Type a question and press Enter.
3. The answer appears under the bar. You can keep asking follow-ups.
4. Press **Escape** to clear it, and Escape again to hide it. Pressing Option + / again also hides it.

The widget uses the same Gemini key, skill, model, and tools as the main app, so connect your key in the main window first. Clicking another app hides the widget, unless it is holding an answer.

## The main window

The full app opens when you launch OmniDesk. Closing the window does not quit the app, so the shortcut keeps working. Click the OmniDesk icon in the Dock to bring the window back, or use "Open OmniDesk" inside the widget. Press **Cmd + Q** to quit completely.

## Why there is no prebuilt app in this repo

A macOS app has to be built on macOS. GitHub builds it for you on a Mac in the cloud.

1. Open the Actions tab of the repo and pick **Build Mac App**.
2. Click **Run workflow**.
3. When it turns green, open the run and download **omnidesk-mac** from the Artifacts section at the bottom.
4. Unzip it, open the `.dmg`, and drag OmniDesk into Applications.

### First launch

The app is not signed by Apple yet, so macOS may say it is "damaged". It is not. Run this once in Terminal, then open the app normally:

```bash
xattr -dr com.apple.quarantine /Applications/OmniDesk.app
```

Removing the warning for everyone else needs a paid Apple Developer account, for signing and notarizing.

## Build it on your own Mac

One time setup:

1. Install Rust from https://rustup.rs
2. Install the Xcode tools with `xcode-select --install`
3. Run `npm install` at the repo root

Then:

```bash
npm run tauri:icon     # makes the app icons from desktop/src-tauri/icons/icon.png
npm run tauri:build    # builds the app into desktop/src-tauri/target/release/bundle
```

For live reload while developing, run `npm run tauri:dev`.

## Accounts

If the build was given an `API_URL` (see `backend/README.md`), a Sign in button appears in the main window. Signing in keeps your Gemini key, favorite skill and model, and writing style on every device. In the Mac app, sign in with the emailed code.

## Changing the shortcut

The shortcut is set in `desktop/src-tauri/src/main.rs`, in the line that creates `summon`.
