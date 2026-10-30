import { Coins, Lock, Tag, TriangleAlert, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "../../components/Button";
import { Overlay } from "../../shared/Overlay";
import { ErrorState } from "../../shared/RouteStates";
import { SUPPORTED_CURRENCIES, currencySymbol, formatCurrency, formatDate } from "../../shared/format";
import { InlineFieldRow } from "./EditPersonForm";
import {
  useDeleteGroup,
  useReopenGroup,
  useUpdateGroupCurrency,
  useUpdateGroupLabel,
  useUpdateGroupName,
  useUpdateSettleMode,
} from "./api";
import { canEdit } from "./ownership";
import { SettleModeChoice } from "./SettleModeChoice";
import { effectiveSettleMode, minimizeTransactions, offersFewestPayments } from "./settleUp";
import type { Balance, SettleMode } from "./types";

interface SettingsSheetProps {
  joinCode: string;
  inviteLink: string;
  name: string;
  label: string | null;
  currency: string;
  settleMode: SettleMode;
  balances: Balance[];
  closedAt: string | null;
  createdByUserId: string | null;
  owner: { personId: string | null; pending: boolean } | null;
  viewerUserId: string | null;
  canClose: boolean;
  onRequestClose: () => void;
  onClose: () => void;
  onDeleted: () => void;
}

// Each section announces itself: an icon, a darker heading, and a hairline that
// runs out to the edge, with more air above it than between a heading and its card.
function Section({
  heading,
  note,
  icon,
  tone = "default",
  children,
}: {
  heading: string;
  note?: string;
  icon: ReactNode;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const danger = tone === "danger";
  return (
    <section className="mt-9 first:mt-0">
      <div className="mb-3 flex items-center gap-2">
        <span aria-hidden="true" className={`shrink-0 ${danger ? "text-down" : "text-accent"}`}>
          {icon}
        </span>
        <h3 className={`font-sans text-label font-semibold ${danger ? "text-down" : "text-ink"}`}>
          {heading}
          {note && <span className="font-normal text-dim"> · {note}</span>}
        </h3>
        <span aria-hidden="true" className={`h-px flex-1 ${danger ? "bg-down/25" : "bg-line-strong/30"}`} />
      </div>
      {children}
    </section>
  );
}

function Card({ danger = false, children }: { danger?: boolean; children: ReactNode }) {
  return (
    <div
      className={`divide-y divide-line rounded-card border ${
        danger ? "border-down/30 bg-down/5" : "border-line bg-surface shadow-card"
      }`}
    >
      {children}
    </div>
  );
}

function Row({ title, hint, action }: { title: string; hint: string; action: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-2.5 pl-3.5 pr-2.5">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-body font-medium text-ink [overflow-wrap:anywhere]">{title}</p>
        <p className="mt-px font-sans text-micro text-dim">{hint}</p>
      </div>
      {action}
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button variant="secondary" size="sm" onClick={copy} className="w-20 shrink-0">
      <span aria-live="polite">{copied ? "Copied!" : label}</span>
    </Button>
  );
}

export function SettingsSheet({
  joinCode,
  inviteLink,
  name,
  label,
  currency,
  settleMode,
  balances,
  closedAt,
  createdByUserId,
  owner,
  viewerUserId,
  canClose,
  onRequestClose,
  onClose,
  onDeleted,
}: SettingsSheetProps) {
  const closed = Boolean(closedAt);
  const updateName = useUpdateGroupName(joinCode);
  const updateLabel = useUpdateGroupLabel(joinCode);
  const updateCurrency = useUpdateGroupCurrency(joinCode);
  const updateSettleMode = useUpdateSettleMode(joinCode);
  const reopenGroup = useReopenGroup(joinCode);
  const deleteGroup = useDeleteGroup(joinCode);
  const [nameValue, setNameValue] = useState(name);
  const [labelValue, setLabelValue] = useState(label ?? "");
  const [savedDetails, setSavedDetails] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isOwner = !owner?.pending && canEdit(createdByUserId, viewerUserId);

  // Clears the "Saved" cue after 2s, matching the copy buttons.
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

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const detailsSaving = updateName.isPending || updateLabel.isPending;

  // One slot on Overlay: the delete confirm and the currency confirm never overlap.
  const blockingConfirm = confirmingDelete
    ? {
        message: "Delete this group?",
        detail:
          "This permanently removes it and everything in it — expenses, balances, history — for everyone. This can't be undone.",
        confirmLabel: deleteGroup.isPending ? "Deleting…" : "Delete group",
        cancelLabel: "Cancel",
        danger: true,
        pending: deleteGroup.isPending,
        error: deleteGroup.error?.message,
        onConfirm: () => deleteGroup.mutate(undefined, { onSuccess: onDeleted }),
        onCancel: () => setConfirmingDelete(false),
      }
    : pendingCurrency
      ? {
          message: `Show amounts in ${pendingCurrency} for everyone?`,
          detail: `Only the symbol changes. Amounts aren't converted, so ${formatCurrency(100, currency)} becomes ${currencySymbol(pendingCurrency)}100.00.`,
          confirmLabel: updateCurrency.isPending ? "Changing…" : "Change for everyone",
          cancelLabel: "Cancel",
          pending: updateCurrency.isPending,
          error: updateCurrency.error?.message,
          onConfirm: () => updateCurrency.mutate(pendingCurrency, { onSuccess: () => setPendingCurrency(null) }),
          onCancel: () => {
            updateCurrency.reset();
            setPendingCurrency(null);
          },
        }
      : null;

  return (
    <Overlay title="Group settings" isDirty={false} anchored onClose={onClose} blockingConfirm={blockingConfirm}>
      <div className="flex flex-1 flex-col pb-4">
        {closed && (
          <p className="mb-3 flex items-center gap-1.5 rounded-inner bg-sunken px-3 py-2 font-sans text-label text-dim">
            <Lock aria-hidden="true" className="size-3.5 shrink-0" />
            Group is closed. Reopen it to change these.
          </p>
        )}

        <Section heading="Invite people" icon={<UserPlus className="size-4.5" strokeWidth={1.75} />}>
          <Card>
            <Row
              title={joinCode}
              hint="Join code"
              action={<CopyButton text={joinCode} />}
            />
            <Row
              title={inviteLink.replace(/^https?:\/\//, "")}
              hint="Invite link"
              action={
                canShare ? (
                  <Button
                    size="sm"
                    onClick={() => navigator.share({ title: name, url: inviteLink }).catch(() => undefined)}
                    className="w-20 shrink-0"
                  >
                    Share
                  </Button>
                ) : (
                  <CopyButton text={inviteLink} />
                )
              }
            />
          </Card>
          <p className="mx-0.5 mt-2 font-sans text-micro text-dim">Anyone with the code or link can join.</p>
        </Section>

        <Section heading="Group" icon={<Tag className="size-4.5" strokeWidth={1.75} />}>
          <div className="flex flex-col gap-2 rounded-card border border-line bg-surface px-3.5 py-3 shadow-card">
            <form onSubmit={handleNameSubmit}>
              <InlineFieldRow
                id="group-name-edit"
                label="Name"
                value={nameValue}
                onChange={(event) => setNameValue(event.target.value)}
                maxLength={60}
                saveLabel="Save name"
                disabled={closed || updateName.isPending || !nameValue.trim() || nameValue === name}
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
                disabled={closed || updateLabel.isPending || labelValue.trim() === (label ?? "")}
              />
            </form>
            {detailsSaving && <span className="font-sans text-micro text-dim">Saving…</span>}
            {savedDetails && !detailsSaving && (
              <span aria-live="polite" className="font-sans text-micro font-medium text-accent">
                Saved
              </span>
            )}
            {updateName.isError && <ErrorState message={updateName.error.message} />}
            {updateLabel.isError && <ErrorState message={updateLabel.error.message} />}
          </div>
        </Section>

        <Section heading="Money" note="applies to everyone" icon={<Coins className="size-4.5" strokeWidth={1.75} />}>
          <Card>
            <div className="flex min-h-14 items-center gap-3 py-2.5 pl-3.5 pr-2.5">
              <label htmlFor="group-currency-edit" className="min-w-0 flex-1">
                <span className="block font-sans text-body font-medium text-ink">Currency</span>
                <span className="mt-px block font-sans text-micro text-dim">
                  Changes the symbol, doesn&apos;t convert amounts.
                </span>
              </label>
              <select
                id="group-currency-edit"
                value={currency}
                disabled={closed}
                onChange={(event) => {
                  if (event.target.value !== currency) setPendingCurrency(event.target.value);
                }}
                className="focus-ring min-h-11 w-28 rounded-inner border border-line-strong bg-surface px-3 font-sans text-body text-ink disabled:bg-sunken disabled:text-dim"
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div className="px-3.5 py-3">
              <SettleModeChoice
                mode={effectiveSettleMode(balances, settleMode)}
                groupName={name}
                directCount={balances.length}
                fewestCount={minimizeTransactions(balances).length}
                offersFewest={offersFewestPayments(balances)}
                disabled={closed}
                error={updateSettleMode.isError ? updateSettleMode.error.message : undefined}
                onConfirm={(next) => updateSettleMode.mutateAsync(next)}
              />
            </div>
          </Card>
        </Section>

        <Section heading="Finish up" icon={<Lock className="size-4.5" strokeWidth={1.75} />}>
          <Card>
            {closed ? (
              <Row
                title="Group is closed"
                hint={`Closed ${formatDate(closedAt as string)}. Nothing can be added or changed.`}
                action={
                  <Button variant="secondary" size="sm" onClick={() => reopenGroup.mutate()} disabled={reopenGroup.isPending}>
                    {reopenGroup.isPending ? "Reopening…" : "Reopen"}
                  </Button>
                }
              />
            ) : (
              <Row
                title="Close group"
                hint="Locks the ledger once everything reaches zero. You can reopen it."
                action={
                  <Button variant="secondary" size="sm" aria-label="Close group" onClick={onRequestClose} disabled={!canClose}>
                    Close
                  </Button>
                }
              />
            )}
          </Card>
          {reopenGroup.isError && (
            <div className="mt-2">
              <ErrorState message={reopenGroup.error.message} />
            </div>
          )}
        </Section>

        <Section heading="Danger zone" tone="danger" icon={<TriangleAlert className="size-4.5" strokeWidth={1.75} />}>
          <Card danger>
            <Row
              title="Delete group"
              hint={
                !closed
                  ? "Close the group first. Delete is only for groups that are fully settled."
                  : owner?.pending
                    ? "Waiting for the new owner to open this group."
                    : !isOwner
                      ? "Only the group's owner can delete it."
                      : "Removes this group and everything in it, for everyone, permanently."
              }
              action={
                <Button
                  variant="primary"
                  danger
                  size="sm"
                  disabled={!closed || !isOwner}
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete
                </Button>
              }
            />
          </Card>
        </Section>
      </div>
    </Overlay>
  );
}
