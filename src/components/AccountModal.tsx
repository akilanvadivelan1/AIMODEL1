import { useEffect, useRef, useState } from "react";
import {
  api,
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
  const googleRef = useRef<HTMLDivElement>(null);
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;

  useEffect(() => {
    if (open) {
      setStep("email");
      setCode("");
      setError("");
      setConfirmDelete(false);
    }
  }, [open]);

  // Draw the Google button on the web version.
  useEffect(() => {
    if (!open || user || step !== "email" || !googleClientId || isTauri) return;
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
  }, [open, user, step, onClose]);

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#333333] bg-[#121212] font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#252525] bg-[#0a0a0a] px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            {user ? "Your account" : "Sign in"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#888888] transition-colors hover:bg-[#222222] hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5 text-xs">
          {user ? (
            <>
              <p className="leading-relaxed text-[#b3b3b3]">
                Signed in as <strong className="text-white">{user.email}</strong>.
              </p>
              <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2.5 leading-relaxed text-[#999999]">
                Synced to your account: your Gemini key (stored encrypted), the AI you
                picked, and your writing style. Your chats stay on this device.
              </div>

              {error && <ErrorBox text={error} />}

              {confirmDelete ? (
                <div className="space-y-2 rounded-lg border border-[#5a2a2a] bg-[#1e1212] p-3">
                  <p className="text-[#e59b9b]">
                    This permanently deletes your account and everything synced to it.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={deleteAccount}
                      disabled={busy}
                      className="rounded-lg bg-[#e59b9b] px-3 py-1.5 font-bold text-black disabled:opacity-40"
                    >
                      Delete everything
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-[#333333] px-3 py-1.5 text-[#cccccc] hover:bg-[#1a1a1a]"
                    >
                      Keep my account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-[11px] text-[#777777] hover:text-white"
                  >
                    Delete my account
                  </button>
                  <button
                    onClick={signOut}
                    disabled={busy}
                    className="rounded-lg bg-white px-4 py-1.5 font-bold text-black transition-colors hover:bg-[#d4d4d4] disabled:opacity-40"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : step === "email" ? (
            <>
              <p className="leading-relaxed text-[#b3b3b3]">
                Sign in to keep your Gemini key, chosen AI, and writing style on every
                device. We will email you a 6 digit code. No password needed.
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && email.trim() && !busy && sendCode()}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] px-3 py-2 text-white placeholder-[#555555] outline-none focus:border-white"
              />

              {error && <ErrorBox text={error} />}

              <button
                onClick={sendCode}
                disabled={busy || !email.trim()}
                className="w-full rounded-lg bg-white px-4 py-2 font-bold text-black transition-colors hover:bg-[#d4d4d4] disabled:opacity-40"
              >
                {busy ? "Sending..." : "Email me a code"}
              </button>

              {googleClientId && !isTauri && (
                <>
                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-[#555555]">
                    <span className="h-px flex-1 bg-[#222222]" />
                    or
                    <span className="h-px flex-1 bg-[#222222]" />
                  </div>
                  <div ref={googleRef} className="flex justify-center" />
                </>
              )}
              {googleClientId && isTauri && (
                <p className="text-[10px] leading-relaxed text-[#666666]">
                  Google sign-in works on the web version for now. In the Mac app, use
                  the email code.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="leading-relaxed text-[#b3b3b3]">
                We sent a 6 digit code to <strong className="text-white">{email.trim()}</strong>.
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
                className="w-full rounded-lg border border-[#2e2e2e] bg-[#1a1a1a] px-3 py-2 text-center text-lg tracking-[0.5em] text-white placeholder-[#444444] outline-none focus:border-white"
              />

              {error && <ErrorBox text={error} />}

              <button
                onClick={verify}
                disabled={busy || code.length !== 6}
                className="w-full rounded-lg bg-white px-4 py-2 font-bold text-black transition-colors hover:bg-[#d4d4d4] disabled:opacity-40"
              >
                {busy ? "Checking..." : "Sign in"}
              </button>

              <button
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                }}
                className="text-[11px] text-[#777777] hover:text-white"
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
    <div className="rounded-lg border border-[#5a2a2a] bg-[#1e1212] px-3 py-2 text-[#e59b9b]">
      {text}
    </div>
  );
}
