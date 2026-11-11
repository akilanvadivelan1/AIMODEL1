import { Children, isValidElement, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "./ExternalLink";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = textOf(children).replace(/\n$/, "");

  const first = Children.toArray(children)[0];
  const className = isValidElement(first)
    ? ((first.props as { className?: string }).className ?? "")
    : "";
  const lang = /language-([\w+-]+)/.exec(className)?.[1] ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#0b0b0b]">
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#777777]">
        <span>{lang || "code"}</span>
        <button onClick={copy} className="transition-colors hover:text-white">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-[#e6e6e6]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Renders an answer from Gemini. Raw HTML in the text is never rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          a: ({ href, children }) => <ExternalLink href={href}>{children}</ExternalLink>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
