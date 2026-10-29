import { Bell } from "lucide-react";
import { useState } from "react";
import { useMatch } from "react-router-dom";

import { Overlay } from "../../shared/Overlay";
import { ActivityFeed } from "./ActivityFeed";
import { useGroupByCode } from "./api";
import { useActivityUnread } from "./useActivityUnread";

// Lives in the navbar next to the profile button, but is about one group: it only
// exists on a group page and opens that group's Activity sheet.
export function GroupActivityBell() {
  const code = useMatch("/g/:code")?.params.code;
  return code ? <ActivityBell key={code} code={code} /> : null;
}

function ActivityBell({ code }: { code: string }) {
  // Same query key as GroupPage, so this reads the page's cache (and its realtime updates).
  const { data: group } = useGroupByCode(code);
  const { unread, markSeen } = useActivityUnread(code, group?.lastActivityAt);
  const [open, setOpen] = useState(false);

  if (!group) return null;

  function show() {
    markSeen();
    setOpen(true);
  }

  // Entries can land while the sheet is open; seeing them counts.
  function hide() {
    markSeen();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-label={unread ? "Activity, new" : "Activity"}
        className="focus-ring relative flex size-11 items-center justify-center rounded-full text-ink transition-transform duration-100 hover:bg-ink/10 active:scale-90"
      >
        <Bell aria-hidden="true" className="size-5.5" strokeWidth={1.75} />
        {/* accent, not mint: mint is 1.77:1 on this white bar. */}
        {unread && (
          <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-2.25 rounded-full bg-accent ring-2 ring-surface" />
        )}
      </button>
      {open && (
        <Overlay title="Activity" isDirty={false} onClose={hide}>
          <ActivityFeed code={code} isActive />
        </Overlay>
      )}
    </>
  );
}
