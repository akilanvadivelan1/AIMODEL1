# Multi-Model Chat

A personal chatbot UI that combines four AI models, each routed to its strengths:

| Model | Vendor | Best at |
|-------|--------|---------|
| **Claude** | Anthropic | Multi-file coding, nuanced instructions, long-form writing |
| **Gemini** | Google | Multimodal input, huge context, search-grounded answers |
| **ChatGPT** | OpenAI | Tool/plugin ecosystem, voice/realtime, image generation |
| **Kiro** | AWS | Spec-driven builds, agentic repo work, steering & hooks |

> **Status:** UI with **mocked responses**. Real API calls are not wired in yet.

## Features

- Pick a model per message (manual routing) with a color-coded picker.
- Each assistant reply is tagged with a model badge (hover for that model's strengths).
- Word-by-word streaming with a Stop button.
- Conversation sidebar: new / select / delete, persisted to `localStorage`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

```bash
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Architecture

All model logic is isolated behind a single function so going live never touches the UI:

```
src/
  models/
    types.ts       # ChatMessage, Conversation, ModelId
    registry.ts    # the 4 models + strengths & accent colors
    provider.ts    # sendMessage() — SINGLE SWAP POINT (mock now, real APIs later)
  components/
    Sidebar.tsx
    Composer.tsx
    ModelPicker.tsx
    ModelBadge.tsx
    MessageBubble.tsx
  App.tsx          # state, streaming, persistence
```

To go live, replace the body of `sendMessage` in `src/models/provider.ts` with real API calls
(ideally via a small backend so API keys stay off the client). The UI stays identical.

## Stack

React 18 · TypeScript · Tailwind CSS · Vite
