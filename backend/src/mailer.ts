import type { Config } from "./config.js";

export type SendEmail = (to: string, code: string) => Promise<void>;

function bodies(code: string) {
  const text =
    `Your OmniDesk sign-in code is ${code}.\n\n` +
    "It expires in 10 minutes. If you did not request it, you can ignore this email.";
  const html =
    `<div style="font-family:system-ui,sans-serif;max-width:420px">` +
    `<p>Your OmniDesk sign-in code is:</p>` +
    `<p style="font-size:32px;letter-spacing:6px;font-weight:700">${code}</p>` +
    `<p style="color:#666">It expires in 10 minutes. If you did not request it, you can ignore this email.</p>` +
    `</div>`;
  return { text, html };
}

/**
 * Production: sends through Resend (https://resend.com).
 * Development without a key: prints the code to the server console instead.
 */
export function createMailer(config: Config): SendEmail {
  if (config.resendApiKey) {
    const apiKey = config.resendApiKey;
    return async (to, code) => {
      const { text, html } = bodies(code);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.mailFrom,
          to: [to],
          subject: "Your OmniDesk sign-in code",
          text,
          html,
        }),
      });
      if (!res.ok) throw new Error(`mail_failed_${res.status}`);
    };
  }

  return async (to, code) => {
    console.log(`[dev mail] To: ${to}  Code: ${code}`);
  };
}
