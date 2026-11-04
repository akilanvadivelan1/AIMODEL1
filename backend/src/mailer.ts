import type { Env } from "./env";
import type { Config } from "./config";

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
 * Returns the function that delivers a sign-in code, or null if email is not set up.
 * With a Resend key it sends real email. With DEV_LOG_CODES=1 it prints the code
 * in the log instead, which is for local testing only.
 */
export function mailerFor(env: Env, config: Config): SendEmail | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (apiKey) {
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

  if (env.DEV_LOG_CODES === "1") {
    return async (to, code) => {
      console.log(`[dev mail] To: ${to}  Code: ${code}`);
    };
  }

  return null;
}
