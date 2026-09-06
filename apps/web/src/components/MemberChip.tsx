import { Avatar } from './Avatar';

interface MemberChipProps {
  name: string;
  isYou?: boolean;
}

// The only way a person is ever drawn in the app, so it leads with the face.
// The chip keeps its pill shape; "you" is now an accent ring on the circle
// rather than an underline under the name, which puts the mark on the thing
// that identifies the person instead of on the text beside it.
export function MemberChip({ name, isYou = false }: MemberChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line-strong py-1 pl-1 pr-3 font-sans text-label font-medium text-ink">
      <Avatar name={name} isYou={isYou} />
      {name}
    </span>
  );
}
