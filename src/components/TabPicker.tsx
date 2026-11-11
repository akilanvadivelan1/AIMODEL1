import { useCallback, useEffect, useMemo, useState } from "react";
import { hostOf, listTabs, tabKey, type BrowserTab } from "../lib/tabs";
import { MAX_TABS } from "../models/tabbrain";

interface Props {
  open: boolean;
  /** Tabs already chosen, so the list opens with them ticked. */
  selected: BrowserTab[];
  onClose: () => void;
  onDone: (tabs: BrowserTab[]) => void;
}

export function TabPicker({ open, selected, onClose, onDone }: Props) {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setFailed("");
    try {
      const res = await listTabs();
      setTabs(res.tabs);
      setErrors(res.errors);
    } catch (e) {
      setFailed(typeof e === "string" ? e : "Could not list your tabs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setPicked(new Set(selected.map(tabKey)));
    setFilter("");
    void load();
    // Only when the window opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const map = new Map<string, BrowserTab[]>();
    for (const t of tabs) {
      if (q && !t.title.toLowerCase().includes(q) && !t.url.toLowerCase().includes(q)) continue;
      map.set(t.browser, [...(map.get(t.browser) ?? []), t]);
    }
    return [...map.entries()];
  }, [tabs, filter]);

  if (!open) return null;

  function toggle(t: BrowserTab) {
    setPicked((prev) => {
      const next = new Set(prev);
      const k = tabKey(t);
      if (next.has(k)) next.delete(k);
      else if (next.size < MAX_TABS) next.add(k);
      return next;
    });
  }

  function done() {
    // Keep tabs the user ticked even if the list changed, but only ones still open.
    onDone(tabs.filter((t) => picked.has(tabKey(t))));
    onClose();
  }

  const readable = tabs.filter((t) => t.readable);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#dcd2bf] bg-[#f4efe4] font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e6ddca] bg-[#ece5d6] px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Ask about your tabs</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#6a6255] transition-colors hover:bg-[#e6ddca] hover:text-ink"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-5 text-xs">
          <p className="leading-relaxed text-[#4d473d]">
            Say you have 15 laptop pages open and want to know which is the best deal. Tick the tabs, type your
            question, and OmniDesk reads only those pages. Answers link back to the tab each fact came from.
          </p>

          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tabs"
              className="min-w-0 flex-1 rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2 text-ink outline-none placeholder:text-[#8a8272] focus:border-ink"
            />
            <button
              onClick={() => void load()}
              className="rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] px-3 py-2 font-bold text-[#4d473d] transition-colors hover:border-ink hover:text-ink"
            >
              Refresh
            </button>
          </div>

          {loading && <div className="text-[#756d5f]">Looking for open tabs...</div>}
          {failed && <div className="rounded-lg border border-[#e8bfb3] bg-[#fbe9e3] p-3 text-[#b3321a]">{failed}</div>}
          {errors.map((e) => (
            <div key={e} className="rounded-lg border border-[#e8bfb3] bg-[#fbe9e3] p-3 leading-relaxed text-[#b3321a]">
              {e}
            </div>
          ))}

          {!loading && !failed && tabs.length === 0 && errors.length === 0 && (
            <div className="rounded-lg border border-[#dcd2bf] bg-[#fbf8f1] p-3 leading-relaxed text-[#4d473d]">
              No open browser found. Open Chrome, Safari, Arc, Brave, Edge or Vivaldi, then press Refresh. The first
              time, macOS asks if OmniDesk may control the browser. Choose Allow.
            </div>
          )}

          {groups.map(([browser, list]) => (
            <div key={browser}>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#756d5f]">{browser}</div>
              <div className="space-y-1">
                {list.map((t) => {
                  const on = picked.has(tabKey(t));
                  return (
                    <button
                      key={tabKey(t)}
                      disabled={!t.readable}
                      onClick={() => toggle(t)}
                      title={t.readable ? t.url : "This page has no text OmniDesk can read"}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                        on ? "border-ink bg-[#fbf8f1]" : "border-[#e6ddca] bg-transparent hover:border-[#bfb4a0]",
                        !t.readable ? "cursor-not-allowed opacity-40" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          on ? "border-ink bg-ink text-cream" : "border-[#bfb4a0]",
                        ].join(" ")}
                      >
                        {on && (
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] text-ink">{t.title || hostOf(t.url)}</span>
                        <span className="block truncate text-[10px] text-[#756d5f]">{hostOf(t.url)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#e6ddca] bg-[#ece5d6] px-5 py-3 text-xs">
          <div className="flex items-center gap-3 text-[#756d5f]">
            <span>
              {picked.size} of {MAX_TABS} max
            </span>
            {readable.length > 0 && (
              <button
                onClick={() => setPicked(new Set(readable.slice(0, MAX_TABS).map(tabKey)))}
                className="underline decoration-[#bfb4a0] underline-offset-2 hover:text-ink"
              >
                Select all
              </button>
            )}
            {picked.size > 0 && (
              <button
                onClick={() => setPicked(new Set())}
                className="underline decoration-[#bfb4a0] underline-offset-2 hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={done}
            className="rounded-lg bg-ink px-4 py-1.5 font-bold text-cream transition-colors hover:bg-[#3a342a]"
          >
            Use {picked.size > 0 ? picked.size : ""} {picked.size === 1 ? "tab" : "tabs"}
          </button>
        </div>
      </div>
    </div>
  );
}
