/**
 * OmniDesk runs one model, Google Gemini. A "skill" is a way of using it:
 * a set of instructions plus the Gemini tools that suit the job.
 *
 * This does not change Gemini's brain. It points Gemini's real abilities
 * (web search, extended thinking, running code) at the task, and tells it how
 * to behave, so each kind of request gets the right treatment.
 */

export type SkillId = "chat" | "research" | "reason" | "write" | "code" | "math" | "spec";

export interface Prefs {
  /** Gemini model id, such as "gemini-2.5-flash". */
  model: string;
  skill: SkillId;
  /** Google Search grounding: current facts with sources. */
  search: boolean;
  /** Extended thinking: the model reasons before it answers. */
  think: boolean;
  /** Code execution: the model writes and runs Python for exact answers. */
  code: boolean;
}

export type ToolId = "search" | "think" | "code";

export interface Skill {
  id: SkillId;
  name: string;
  /** One line for the chip tooltip. */
  tagline: string;
  /** Plain-language description for the website. */
  summary: string;
  /** Instructions added to the system prompt. */
  prompt: string;
  /** Gemini tools this skill turns on by default. */
  tools: Record<ToolId, boolean>;
  temperature: number;
  /** An example request, shown on the website and as a starting point in the app. */
  starter: string;
}

export const SKILLS: Skill[] = [
  {
    id: "chat",
    name: "Chat",
    tagline: "Everyday questions and conversation",
    summary: "A clear, direct assistant for everyday questions. It matches the length of the answer to the question.",
    prompt:
      "Be a clear, helpful, direct assistant. Match the depth of the answer to the question: short for simple questions, thorough for complex ones. Use Markdown only when it helps, such as lists, tables, or code.",
    tools: { search: false, think: false, code: false },
    temperature: 0.7,
    starter: "Explain how vaccines train the immune system, like I am in 8th grade.",
  },
  {
    id: "research",
    name: "Research",
    tagline: "Searches the web and cites sources",
    summary: "Searches Google, cross-checks what it finds, and shows its sources. It says so when sources disagree or when it cannot find something.",
    prompt:
      "You are a careful research assistant. Use Google Search to find current, reliable information. Break the question into parts, cross-check claims across sources, and say plainly when sources disagree or when you could not find something. Lead with the answer, then give the evidence. Never invent facts, names, numbers, or quotes. Do not present anything as current unless a source supports it.",
    tools: { search: true, think: true, code: false },
    temperature: 0.4,
    starter: "What changed in the newest Raspberry Pi, and is it worth upgrading from a Pi 4?",
  },
  {
    id: "reason",
    name: "Reason",
    tagline: "Thinks it through before answering",
    summary: "Works through hard problems step by step, checks its own first idea, and gives you the conclusion first with the key reasoning after.",
    prompt:
      "Think before you answer. Work through the problem step by step in your own reasoning. Check your assumptions, consider counterarguments and edge cases, and look for the flaw in your first idea. In your reply, give the conclusion first, then the key reasoning in a short, readable form. Be honest about what you are unsure of, and do not pad the answer.",
    tools: { search: false, think: true, code: false },
    temperature: 0.7,
    starter: "I can pay off a 7% loan early or invest in an index fund. Walk me through how to decide.",
  },
  {
    id: "write",
    name: "Write",
    tagline: "Drafts and edits in your voice",
    summary: "Drafts and edits in clean, natural English. Teach it your writing style once and it matches your voice.",
    prompt:
      "You are a skilled writer and editor of clear, natural English. Prefer plain words, concrete detail, and varied sentence length. Cut filler and cliches. When asked to draft something, give the draft itself with no preamble. When asked to edit, give the improved text first, then a short list of what you changed and why. If the user's writing style is provided below, match it closely.",
    tools: { search: false, think: false, code: false },
    temperature: 0.9,
    starter: "Rewrite this so it sounds warm but professional: \"hey, just checking if you got my last email\"",
  },
  {
    id: "code",
    name: "Code",
    tagline: "Writes and explains working code",
    summary: "Writes complete, readable code, thinks about edge cases and security, and tells you what it assumed.",
    prompt:
      "You are a senior software engineer. Write correct, readable, production-quality code in the language and style the user already uses. Think about edge cases, errors, and security. Explain the approach briefly, then give complete code in fenced blocks that name the language. Point out tradeoffs and anything you assumed. If something is ambiguous, state your assumption instead of stalling.",
    tools: { search: false, think: true, code: false },
    temperature: 0.3,
    starter: "Write a TypeScript function that debounces an async search call and cancels stale requests.",
  },
  {
    id: "math",
    name: "Math",
    tagline: "Runs real code for exact answers",
    summary: "Does not guess at arithmetic. It writes and runs Python to get exact numbers, shows the code, and checks the result.",
    prompt:
      "You solve math and data problems exactly. Do not do arithmetic in your head. Write and run Python code for calculations, statistics, unit conversions, and for checking results. Show the setup, the code you ran, and the final answer with units. State your assumptions, and double-check with a second method when that is practical.",
    tools: { search: false, think: true, code: true },
    temperature: 0.2,
    starter: "A $12,000 loan at 6.5% APR over 36 months. What is the monthly payment and the total interest?",
  },
  {
    id: "spec",
    name: "Spec",
    tagline: "Turns an idea into a build plan",
    summary: "Turns a rough idea into a build-ready plan: goals, numbered requirements, a design, and small tasks you can check off one at a time.",
    prompt:
      "You turn rough ideas into build-ready plans, spec first. If the request is vague, ask up to three sharp questions before anything else. Otherwise write, in this order: 1) Goal and non-goals. 2) Requirements as numbered statements in the form \"When <event>, the system shall <response>\". 3) Design: the main parts, the data, and the key decisions with their tradeoffs. 4) Tasks: an ordered checklist, each small enough to do on its own, with how to verify it. 5) Risks and open questions. Keep every part tight.",
    tools: { search: false, think: true, code: false },
    temperature: 0.5,
    starter: "I want an app where students swap used textbooks. Turn it into a spec I can build from.",
  },
];

export function getSkill(id: string): Skill {
  return SKILLS.find((s) => s.id === id) ?? SKILLS[0];
}

export interface GeminiModel {
  id: string;
  name: string;
  desc: string;
}

export const MODELS: GeminiModel[] = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Fast and capable. The best default." },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Strongest reasoning. Limited on free keys." },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite", desc: "Fastest and lightest." },
];

export const DEFAULT_MODEL = MODELS[0].id;
