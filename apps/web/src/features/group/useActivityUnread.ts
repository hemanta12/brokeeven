import { useEffect, useState } from 'react';

import { getActivitySeen, hasUnreadActivity, setActivitySeen } from '../../shared/activitySeen';

// Drives the header bell's dot. `markSeen` is for the moments the Activity sheet
// opens and closes.
export function useActivityUnread(code: string | undefined, lastActivityAt: string | null | undefined) {
  const [seenAt, setSeenAt] = useState<string | null>(() => (code ? getActivitySeen(code) : null));

  // First visit on this device: whatever is already in the log predates the
  // viewer, so it becomes the baseline instead of an unread dot.
  useEffect(() => {
    if (!code || !lastActivityAt || seenAt !== null) return;
    setActivitySeen(code, lastActivityAt);
    setSeenAt(lastActivityAt);
  }, [code, lastActivityAt, seenAt]);

  function markSeen() {
    if (!code || !lastActivityAt) return;
    setActivitySeen(code, lastActivityAt);
    setSeenAt(lastActivityAt);
  }

  return { unread: hasUnreadActivity(lastActivityAt, seenAt), markSeen };
}
