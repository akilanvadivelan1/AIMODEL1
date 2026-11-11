# OmniDesk

One AI, seven skills. OmniDesk runs on Google Gemini with your own free key, and sets Gemini up for different jobs: research with sources, careful thinking, exact math, writing in your voice, code, and build plans.

- Website and web app: https://akilanvadivelan1.github.io/AIMODEL1/
- Mac app: see `desktop/README.md`
- Accounts server: see `backend/README.md`

## The skills

A skill is a set of instructions plus the Gemini tools that suit the job. It does not change the model. It points Gemini's real abilities at your task.

| Skill | What it does | Gemini tools |
| --- | --- | --- |
| Chat | Everyday questions | none |
| Research | Searches the web and shows its sources | Search, Think |
| Reason | Works through hard problems before answering | Think |
| Write | Drafts and edits, and matches your writing style | none |
| Code | Writes complete code and explains tradeoffs | Think |
| Math | Writes and runs Python for exact answers | Run code, Think |
| Spec | Turns an idea into requirements, a design, and tasks | Think |

You can switch Search, Think, and Run code on or off for any skill. Search and Run code cannot be on together, because Gemini does not allow that.

Also built in: attach or paste images and PDFs, teach it your writing style from a sample, and (in the Mac app) press Option + / to get a small search bar in the top right of your screen.

## Run it on your computer

```bash
npm install
npm run build
```

Then open the web app, click Connect, and paste a free key from https://aistudio.google.com/app/apikey.

## How it is organized

```
src/
  models/
    skills.ts        the seven skills, the Gemini models, and the preference types
    gemini.ts        the Gemini client: tools, thinking, retries, readable errors
    ask.ts           builds the instructions for a skill and calls Gemini
    prefs.ts         saving and checking the chosen skill, model, and tools
    styleProfile.ts  learns your writing style from a sample
  components/        the app screens (chat, composer, key and style windows)
  landing/           the website: sections, tutorial, and the animated mock screens
  widget/            the Mac quick-search widget
  lib/               accounts, syncing, and opening links
desktop/             the Mac app (Tauri)
backend/             the accounts server (Node and SQLite)
```

## Your key and your data

Your key is saved on your device. Your questions go straight from your device to Google. Accounts are optional and, when switched on, sync your key (encrypted), your skill and model choices, and your writing style. Chats stay on your device.
