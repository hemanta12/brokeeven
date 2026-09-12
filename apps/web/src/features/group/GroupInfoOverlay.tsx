import { useEffect, useState, type FormEvent } from "react";

import { Button } from "../../components/Button";
import { Overlay } from "../../shared/Overlay";
import { ErrorState } from "../../shared/RouteStates";
import { SUPPORTED_CURRENCIES } from "../../shared/format";
import { InlineFieldRow } from "./EditPersonForm";
import { canEdit } from "./ownership";
import { useDeleteGroup, useUpdateGroupCurrency, useUpdateGroupLabel, useUpdateGroupName } from "./api";

interface GroupInfoOverlayProps {
  joinCode: string;
  inviteLink: string;
  name: string;
  label: string | null;
  currency: string;
  createdByUserId: string | null;
  viewerUserId: string | null;
  // Closed group: currency and name/label are locked like the rest of the ledger.
  readOnly?: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function GroupInfoOverlay({
  joinCode,
  inviteLink,
  name,
  label,
  currency,
  createdByUserId,
  viewerUserId,
  readOnly = false,
  onClose,
  onDeleted,
}: GroupInfoOverlayProps) {
  const [copiedField, setCopiedField] = useState<"code" | "link" | null>(null);
  const updateCurrency = useUpdateGroupCurrency(joinCode);
  const [savedCurrency, setSavedCurrency] = useState(false);
  const updateName = useUpdateGroupName(joinCode);
  const updateLabel = useUpdateGroupLabel(joinCode);
  const [nameValue, setNameValue] = useState(name);
  const [labelValue, setLabelValue] = useState(label ?? "");
  const [savedDetails, setSavedDetails] = useState(false);
  const deleteGroup = useDeleteGroup(joinCode);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isOwner = canEdit(createdByUserId, viewerUserId);
  const canDeleteNow = readOnly && isOwner;

  // Clear the "Saved" cue after 2s, matching the copy buttons above.
  useEffect(() => {
    if (!savedCurrency) return;
    const timer = setTimeout(() => setSavedCurrency(false), 2000);
    return () => clearTimeout(timer);
  }, [savedCurrency]);

  useEffect(() => {
    if (!savedDetails) return;
    const timer = setTimeout(() => setSavedDetails(false), 2000);
    return () => clearTimeout(timer);
  }, [savedDetails]);

  async function handleNameSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nameValue.trim() || nameValue === name) return;
    await updateName.mutateAsync(nameValue);
    setSavedDetails(true);
  }

  async function handleLabelSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = labelValue.trim();
    if (trimmed === (label ?? "")) return;
    await updateLabel.mutateAsync(trimmed || null);
    setSavedDetails(true);
  }

  async function copyText(field: "code" | "link", text: string) {
    await navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <Overlay
      title="Group info"
      isDirty={false}
      compact
      onClose={onClose}
      blockingConfirm={
        confirmingDelete
          ? {
              message: "Delete this group?",
              detail: "This permanently removes it and everything in it — expenses, balances, history — for everyone. This can't be undone.",
              confirmLabel: deleteGroup.isPending ? "Deleting…" : "Delete group",
              cancelLabel: "Cancel",
              danger: true,
              pending: deleteGroup.isPending,
              error: deleteGroup.error?.message,
              onConfirm: () => deleteGroup.mutate(undefined, { onSuccess: onDeleted }),
              onCancel: () => setConfirmingDelete(false),
            }
          : null
      }
    >
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-card bg-sunken px-4 py-3.5">
          <div className="flex items-center gap-1.5">
            <p className="font-sans text-label font-medium text-ink">Details</p>
            {(updateName.isPending || updateLabel.isPending) && (
              <span className="font-sans text-micro text-dim">Saving…</span>
            )}
            {savedDetails && !updateName.isPending && !updateLabel.isPending && (
              <span className="flex items-center gap-1 font-sans text-micro font-medium text-accent">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-3.5 w-3.5">
                  <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span aria-live="polite">Saved</span>
              </span>
            )}
          </div>
          <form onSubmit={handleNameSubmit}>
            <InlineFieldRow
              id="group-name-edit"
              label="Name"
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              maxLength={60}
              saveLabel="Save name"
              disabled={readOnly || updateName.isPending || !nameValue.trim() || nameValue === name}
            />
          </form>
          <form onSubmit={handleLabelSubmit}>
            <InlineFieldRow
              id="group-label-edit"
              label="Label (opt)"
              value={labelValue}
              onChange={(event) => setLabelValue(event.target.value)}
              maxLength={60}
              placeholder="Home, Trip, 1:1…"
              saveLabel="Save label"
              disabled={readOnly || updateLabel.isPending || labelValue.trim() === (label ?? "")}
            />
          </form>
          {readOnly && <p className="font-sans text-micro text-dim">Locked while the group is closed.</p>}
          {updateName.isError && <ErrorState message={updateName.error.message} />}
          {updateLabel.isError && <ErrorState message={updateLabel.error.message} />}
        </div>
        <div className="rounded-card bg-sunken px-4 py-3.5">
          <p className="font-sans text-label text-dim">Join code</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="font-mono text-section font-medium tracking-[0.04em] text-ink">{joinCode}</p>
            <Button variant="secondary" size="sm" onClick={() => copyText("code", joinCode)} className="w-20 shrink-0">
              <span aria-live="polite">{copiedField === "code" ? "Copied!" : "Copy"}</span>
            </Button>
          </div>
        </div>
        <div className="rounded-card bg-accent/10 px-4 py-3.5">
          <p className="font-sans text-label text-dim">Invite link</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="min-w-0 break-all font-mono text-label text-dim">{inviteLink}</p>
            <Button variant="secondary" size="sm" onClick={() => copyText("link", inviteLink)} className="w-20 shrink-0">
              <span aria-live="polite">{copiedField === "link" ? "Copied!" : "Copy"}</span>
            </Button>
          </div>
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
        <p className="border-t border-line pt-4 font-sans text-label text-dim">
          Anyone with the code or link can join. Email invites are coming later.
        </p>
        <div className="mt-auto flex flex-col gap-2 rounded-card border border-down/30 bg-down/5 px-4 py-3.5">
          <p className="font-sans text-label font-medium text-ink">Caution</p>
          <p className="font-sans text-micro text-dim">
            {!readOnly
              ? "Close the group first. Delete is only for groups that are fully settled."
              : !isOwner
                ? "Only the person who created this group can delete it."
                : "Removes this group and everything in it, for everyone, permanently."}
          </p>
          <Button
            variant="primary"
            danger
            disabled={!canDeleteNow}
            onClick={() => setConfirmingDelete(true)}
            className="w-full"
          >
            Delete group
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
