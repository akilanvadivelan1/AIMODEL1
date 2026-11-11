import { useEffect, useRef, useState } from "react";
import {
  api,
  backendEnabled,
  clearToken,
  describeError,
  googleClientId,
  isTauri,
  setToken,
  type BackendUser,
} from "../lib/backend";
import { resetSync } from "../lib/sync";

interface Props {
  open: boolean;
  onClose: () => void;
  user: BackendUser | null;
  onSignedIn: (user: BackendUser) => void;
  onSignedOut: () => void;
}

/** Minimal typing for Google Identity Services. */
interface GoogleId {
  initialize: (opts: {
    client_id: string;
    callback: (resp: { credential: string }) => void;
  }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let googleScript: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScript) return googleScript;
  googleScript = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      googleScript = null;
      reject(new Error("google_script_failed"));
    };
    document.head.appendChild(s);
  });
  return googleScript;
}

export function AccountModal({ open, onClose, user, onSignedIn, onSignedOut }: Props) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // What the server can actually do: emailed codes, Google, or both.
  const [options, setOptions] = useState<
    { email: boolean; google: boolean } | "loading" | "error"
  >("loading");
  const canEmail = typeof options === "object" && options.email;
  const canGoogle =
    typeof options === "object" && options.google && !!googleClientId && !isTauri;

  function loadOptions() {
    setOptions("loading");
    api
      .config()
      .then(setOptions)
      .catch(() => setOptions("error"));
  }

  const googleRef = useRef<HTMLDivElement>(null);
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;

  useEffect(() => {
    if (open) {
      setStep("email");
      setCode("");
      setError("");
      setConfirmDelete(false);
      if (backendEnabled && !user) loadOptions();
    }
  }, [open]);

  // Draw the Google button on the web version.
  useEffect(() => {
    if (!open || user || step !== "email" || !canGoogle) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const gid = window.google?.accounts.id;
        if (cancelled || !gid || !googleRef.current) return;
        gid.initialize({
          client_id: googleClientId,
          callback: async (resp) => {
            setBusy(true);
            setError("");
            try {
              const res = await api.google(resp.credential);
              setToken(res.token);
              onSignedInRef.current(res.user);
              onClose();
            } catch (e) {
              setError(describeError(e));
            } finally {
              setBusy(false);
            }
          },
        });
        gid.renderButton(googleRef.current, {
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          width: 300,
        });
      })
      .catch(() => {
        /* the email option still works */
      });
    return () => {
      cancelled = true;
    };
  }, [open, user, step, canGoogle, onClose]);

  if (!open) return null;

  // No backend address was set when this copy of the app was built.
  if (!backendEnabled && !user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#dcd2bf] bg-[#f4efe4] font-mono shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#e6ddca] bg-[#ece5d6] px-5 py-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Sign in</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[#6a6255] transition-colors hover:bg-[#e6ddca] hover:text-ink"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4 p-5 text-xs">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dcd2bf] px-3 py-1 text-[10px] uppercase tracking-widest text-[#4d473d]">
              <span className="pulse-mono h-1.5 w-1.5 rounded-full bg-ink" />
              Coming soon
            </div>
            <p className="leading-relaxed text-[#4d473d]">
              Accounts are not switched on yet. When they are, you will be able to sign
              in with an emailed code or with Google, and your Gemini key, favorite skill and model,
              and writing style will follow you to every device.
            </p>
            <p className="leading-relaxed text-[#756d5f]">
              Until then, OmniDesk saves those things on this device, so you only need
              to set them up once here.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-ink px-4 py-2 font-bold text-cream transition-colors hover:bg-[#3a342a]"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function sendCode() {
    setBusy(true);
    setError("");
    try {
      await api.startEmail(email.trim());
      setStep("code");
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const res = await api.verifyEmail(email.trim(), code.trim());
      setToken(res.token);
      onSignedIn(res.user);
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await api.logout();
    } catch {
      /* sign out locally even if the server cannot be reached */
    }
    clearToken();
    resetSync();
    setBusy(false);
    onSignedOut();
    onClose();
  }

  async function deleteAccount() {
    setBusy(true);
    setError("");
    try {
      await api.deleteAccount();
      clearToken();
      resetSync();
      onSignedOut();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#dcd2bf] bg-[#f4efe4] font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e6ddca] bg-[#ece5d6] px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink">
            {user ? "Your account" : "Sign in"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#6a6255] transition-colors hover:bg-[#e6ddca] hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          {user ? (
            <>
              <p className="leading-relaxed text-[#4d473d]">
                Signed in as <strong className="text-ink">{user.email}</strong>.
              </p>
              <div className="rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2.5 leading-relaxed text-[#5f584d]">
                Synced to your account: your Gemini key (stored encrypted), the AI you
                picked, and your writing style. Your chats stay on this device.
              </div>

              {error && <ErrorBox text={error} />}

              {confirmDelete ? (
                <div className="space-y-2 rounded-lg border border-[#e8bfb3] bg-[#fbe9e3] p-3">
                  <p className="text-[#b3321a]">
                    This permanently deletes your account and everything synced to it.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={deleteAccount}
                      disabled={busy}
                      className="rounded-lg bg-[#b3321a] px-3 py-1.5 font-bold text-cream disabled:opacity-40"
                    >
                      Delete everything
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-[#dcd2bf] px-3 py-1.5 text-[#2e2a23] hover:bg-[#fbf8f1]"
                    >
                      Keep my account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-[11px] text-[#756d5f] hover:text-ink"
                  >
                    Delete my account
                  </button>
                  <button
                    onClick={signOut}
                    disabled={busy}
                    className="rounded-lg bg-ink px-4 py-1.5 font-bold text-cream transition-colors hover:bg-[#3a342a] disabled:opacity-40"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : step === "email" ? (
            <>
              {options === "loading" && (
                <p className="text-[#756d5f]">Checking sign-in options...</p>
              )}

              {options === "error" && (
                <>
                  <ErrorBox text="Could not reach the OmniDesk server. Check your connection and try again." />
                  <button
                    onClick={loadOptions}
                    className="w-full rounded-lg border border-[#dcd2bf] px-4 py-2 text-[#2e2a23] hover:bg-[#fbf8f1]"
                  >
                    Try again
                  </button>
                </>
              )}

              {typeof options === "object" && !options.email && !options.google && (
                <ErrorBox text="Sign-in is not set up on the server yet." />
              )}

              {typeof options === "object" && (options.email || options.google) && (
                <p className="leading-relaxed text-[#4d473d]">
                  Sign in to keep your Gemini key, favorite skill and model, and writing style on every
                  device.
                  {canEmail ? " We will email you a 6 digit code. No password needed." : ""}
                </p>
              )}

              {canEmail && (
                <>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && email.trim() && !busy && sendCode()}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2 text-ink placeholder-[#9a9283] outline-none focus:border-ink"
                  />
                  <button
                    onClick={sendCode}
                    disabled={busy || !email.trim()}
                    className="w-full rounded-lg bg-ink px-4 py-2 font-bold text-cream transition-colors hover:bg-[#3a342a] disabled:opacity-40"
                  >
                    {busy ? "Sending..." : "Email me a code"}
                  </button>
                </>
              )}

              {error && <ErrorBox text={error} />}

              {canEmail && canGoogle && (
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-[#9a9283]">
                  <span className="h-px flex-1 bg-[#e6ddca]" />
                  or
                  <span className="h-px flex-1 bg-[#e6ddca]" />
                </div>
              )}
              {canGoogle && <div ref={googleRef} className="flex justify-center" />}

              {typeof options === "object" && options.google && isTauri && (
                <p className="text-[10px] leading-relaxed text-[#8a8272]">
                  {canEmail
                    ? "Google sign-in works on the web version for now. In the Mac app, use the email code."
                    : "Google sign-in for the Mac app is coming soon. For now, use the web version."}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="leading-relaxed text-[#4d473d]">
                We sent a 6 digit code to <strong className="text-ink">{email.trim()}</strong>.
                It expires in 10 minutes.
              </p>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && code.length === 6 && !busy && verify()}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                className="w-full rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2 text-center text-lg tracking-[0.5em] text-ink placeholder-[#bfb4a0] outline-none focus:border-ink"
              />

              {error && <ErrorBox text={error} />}

              <button
                onClick={verify}
                disabled={busy || code.length !== 6}
                className="w-full rounded-lg bg-ink px-4 py-2 font-bold text-cream transition-colors hover:bg-[#3a342a] disabled:opacity-40"
              >
                {busy ? "Checking..." : "Sign in"}
              </button>

              <button
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                }}
                className="text-[11px] text-[#756d5f] hover:text-ink"
              >
                Use a different email or send a new code
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-[#e8bfb3] bg-[#fbe9e3] px-3 py-2 text-[#b3321a]">
      {text}
    </div>
  );
}
