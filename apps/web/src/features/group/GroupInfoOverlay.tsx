import { useEffect, useState } from "react";

import { Button } from "../../components/Button";
import { Overlay } from "../../shared/Overlay";
import { SUPPORTED_CURRENCIES } from "../../shared/format";
import { useUpdateGroupCurrency } from "./api";

interface GroupInfoOverlayProps {
  joinCode: string;
  inviteLink: string;
  currency: string;
  // Closed group: currency is locked like the rest of the ledger.
  readOnly?: boolean;
  onClose: () => void;
}

export function GroupInfoOverlay({ joinCode, inviteLink, currency, readOnly = false, onClose }: GroupInfoOverlayProps) {
  const [copiedField, setCopiedField] = useState<"code" | "link" | null>(null);
  const updateCurrency = useUpdateGroupCurrency(joinCode);
  const [savedCurrency, setSavedCurrency] = useState(false);

  // Clear the "Saved" cue after 2s, matching the copy buttons above.
  useEffect(() => {
    if (!savedCurrency) return;
    const timer = setTimeout(() => setSavedCurrency(false), 2000);
    return () => clearTimeout(timer);
  }, [savedCurrency]);

  async function copyText(field: "code" | "link", text: string) {
    await navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <Overlay title="Group info" isDirty={false} compact onClose={onClose}>
      <div className="flex flex-1 flex-col gap-3">
        <div className="rounded-card bg-sunken px-4 py-3.5">
          <p className="font-sans text-label text-dim">Join code</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="font-mono text-section font-medium tracking-[0.04em] text-ink">{joinCode}</p>
            <button
              type="button"
              onClick={() => copyText("code", joinCode)}
              aria-label={copiedField === "code" ? "Join code copied" : "Copy join code"}
              className={`focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-transform duration-100 active:scale-90 ${
                copiedField === "code" ? "border-accent/40 text-accent" : "border-line-strong text-ink hover:bg-surface"
              }`}
            >
              {copiedField === "code" ? (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="h-4 w-4">
                  <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="h-4 w-4">
                  <rect x="7" y="7" width="9.5" height="9.5" rx="2" />
                  <path d="M13 7V5.5A2.5 2.5 0 0 0 10.5 3h-5A2.5 2.5 0 0 0 3 5.5v5A2.5 2.5 0 0 0 5.5 13H7" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="rounded-card bg-accent/10 px-4 py-3.5">
          <p className="font-sans text-label text-dim">Invite link</p>
          <p className="mt-1 break-all font-mono text-label text-dim">{inviteLink}</p>
          <Button variant="secondary" onClick={() => copyText("link", inviteLink)} className="mt-3">
            <span aria-live="polite">{copiedField === "link" ? "Copied!" : "Copy link"}</span>
          </Button>
        </div>
        <div className="rounded-card bg-sunken px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <label htmlFor="group-currency-edit" className="font-sans text-label font-medium text-ink">
                Currency
              </label>
              {updateCurrency.isPending && (
                <span className="font-sans text-micro text-dim">Saving…</span>
              )}
              {savedCurrency && !updateCurrency.isPending && (
                <span className="flex items-center gap-1 font-sans text-micro font-medium text-accent">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-3.5 w-3.5">
                    <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span aria-live="polite">Saved</span>
                </span>
              )}
            </span>
            <select
              id="group-currency-edit"
              value={currency}
              disabled={updateCurrency.isPending || readOnly}
              onChange={(event) =>
                updateCurrency.mutate(event.target.value, { onSuccess: () => setSavedCurrency(true) })
              }
              className="focus-ring min-h-11 w-28 rounded-inner border border-line-strong bg-surface px-3 font-sans text-body text-ink disabled:opacity-60"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1.5 font-sans text-micro text-dim">
            {updateCurrency.isError
              ? updateCurrency.error.message
              : readOnly
                ? "Locked while the group is closed."
                : "Changes how amounts are shown, does not convert them."}
          </p>
        </div>
        <p className="mt-auto border-t border-line pt-4 font-sans text-label text-dim">
          Anyone with the code or link can join. Email invites are coming later.
        </p>
      </div>
    </Overlay>
  );
}
