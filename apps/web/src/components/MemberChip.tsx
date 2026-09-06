import { Avatar } from './Avatar';

interface MemberChipProps {
  name: string;
  isYou?: boolean;
}

// Person as a pill: face first, "you" shown as an accent ring on the avatar.
export function MemberChip({ name, isYou = false }: MemberChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line-strong py-1 pl-1 pr-3 font-sans text-label font-medium text-ink">
      <Avatar name={name} isYou={isYou} />
      {name}
    </span>
  );
}
