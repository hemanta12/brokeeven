interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  isYou?: boolean;
  className?: string;
}

// Five hues, each checked for a white initial at 4.5:1 (5.7 to 6.9:1), and
// deliberately containing no red and no amber: a member sitting next to a
// `down` amount or a `notice` tag must never read as a warning. Not @theme
// tokens, because nothing outside this file ever picks one by name.
const PALETTE = ['#2f6b8f', '#6b4e9b', '#a03d6b', '#4a5a7d', '#2e6e6e'];

const SIZE_CLASSES = {
  sm: 'size-7 text-micro',
  md: 'size-8.5 text-label',
  // Only the settle card, where two faces are the first thing on the screen.
  lg: 'size-13 text-section',
} as const;

// Same person, same colour on every screen, with nothing stored anywhere:
// the hue is derived from the name itself.
function hueFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 9973;
  return PALETTE[hash % PALETTE.length]!;
}

export function Avatar({ name, size = 'sm', isYou = false, className = '' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: hueFor(name) }}
      className={`inline-grid shrink-0 place-items-center rounded-full font-sans font-semibold text-white ${
        SIZE_CLASSES[size]
      } ${isYou ? 'ring-2 ring-accent' : ''} ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

interface AvatarClusterProps {
  // Viewer first, per /me/groups; may be shorter than `total`.
  names: string[];
  total: number;
  max?: number;
  className?: string;
}

// Overlapping initials for a group row. Shows `max` faces then a "+N" disc; the
// white ring is what reads the overlap as separate people rather than a blob.
export function AvatarCluster({ names, total, max = 3, className = '' }: AvatarClusterProps) {
  const shown = names.slice(0, max);
  const overflow = total - shown.length;
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center ${className}`}>
      {shown.map((name, index) => (
        <Avatar
          key={index}
          name={name}
          size="sm"
          className={`ring-2 ring-surface ${index > 0 ? '-ml-1.5' : ''}`}
        />
      ))}
      {overflow > 0 && (
        <span className="-ml-1.5 inline-grid size-7 shrink-0 place-items-center rounded-full bg-sunken font-sans text-micro font-semibold text-dim ring-2 ring-surface">
          +{overflow}
        </span>
      )}
    </span>
  );
}
