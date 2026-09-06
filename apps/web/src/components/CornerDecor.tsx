// Layered flat shapes bleeding out of a band header's top-left corner: depth
// with no gradient and no blur, clipped to the corner by the header's own
// overflow-hidden. Two filled blobs plus one hairline ring, white-alpha only,
// so it reads as a tonal lift on the forest band rather than a second colour.
//
// Shared by every `bg-band` header (My groups, Group page) so the dark device
// reads as one thing, per DESIGN_SYSTEM §2. The host must be
// `relative overflow-hidden`, and content that should sit above it needs its
// own `relative`.
export function CornerDecor() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-28 h-56 w-56 rounded-[46%_54%_58%_42%/48%_56%_44%_52%] bg-white/[0.06]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-16 h-36 w-36 rounded-[52%_48%_43%_57%/46%_52%_48%_54%] bg-white/[0.05]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-white/[0.07]"
      />
    </>
  );
}
