interface MemberChipProps {
  name: string;
  isYou?: boolean;
}

export function MemberChip({ name, isYou = false }: MemberChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border border-ink-forest px-3 py-1 font-sans text-label font-medium text-ink-forest ${
        isYou ? 'border-b-2 border-b-brass' : ''
      }`}
    >
      {name}
    </span>
  );
}
