// Watermark for `bg-band` headers. Host needs `relative overflow-hidden`.
export function CornerDecor() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-6 -top-20 select-none font-mono text-[13rem] font-bold leading-none text-white/[0.03]"
    >
      $
    </span>
  );
}
