import { useState } from "react";

import { Button } from "../../components/Button";
import { markInviteSaved } from "../../shared/inviteSaved";

// Inline in the group header for signed-out viewers, until they copy the code or
// link once (or say they've got it): without an account, that is the only handle on
// the group. A light card on the dark band, same treatment as My Groups' settled
// card, so it reads as a distinct notice rather than more header text.
export function InviteReminder({
  joinCode,
  inviteLink,
  onSaved,
}: {
  joinCode: string;
  inviteLink: string;
  onSaved: () => void;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  function save() {
    markInviteSaved(joinCode);
    onSaved();
  }

  // Copying does not dismiss: a copy can miss (permission denied, wrong thing
  // pasted over), so only the explicit acknowledgement retires the card.
  async function copy(field: 'code' | 'link', text: string) {
    await navigator.clipboard?.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="relative mt-3.5 rounded-card bg-surface px-4 py-3.5 shadow-sheet">
      <p className="font-sans text-label font-semibold text-ink">
        Keep the code or link
      </p>
      <p className="mt-1 font-sans text-micro leading-relaxed text-dim">
        You are not signed in, so only this browser remembers this group. You
        need the save the code or link somewhere to come back to it later, and
        to let your friends join.
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="rounded-inner border border-line bg-sunken px-2.5 py-1.5 font-mono text-label font-medium tracking-[0.04em] text-ink">
          {joinCode}
        </span>
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Copy code ${joinCode}`}
          onClick={() => void copy("code", joinCode)}
        >
          <span aria-live="polite">{copied === "code" ? "Copied" : "Copy"}</span>
        </Button>
        <span aria-hidden="true" className="font-sans text-micro text-dim">
          or
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void copy("link", inviteLink)}
        >
          <span aria-live="polite">
            {copied === "link" ? "Copied" : "Copy link"}
          </span>
        </Button>
        <button
          type="button"
          onClick={save}
          className="focus-ring ml-auto min-h-11 rounded px-1 font-sans text-micro text-dim underline hover:opacity-70"
        >
          I Got it
        </button>
      </div>
    </div>
  );
}
