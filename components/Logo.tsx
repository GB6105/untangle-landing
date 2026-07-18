/**
 * Untangle brand mark — a soft-violet rounded square with two vertical bars.
 * Recreates the `component/SystemLogo` from the design; all proportions scale
 * from the original 68px artboard so any `size` stays faithful.
 */
export function Logo({ size = 30 }: { size?: number }) {
  const k = size / 68;
  const bar = {
    position: "absolute" as const,
    top: 21 * k,
    width: 8 * k,
    height: 13 * k,
    borderRadius: 4 * k,
    background: "#6a45e7",
  };

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: 34 * k,
        background:
          "radial-gradient(125% 125% at 55% 8%, #f4f2ff 0%, #d5c9ff 42%, #b9a6fe 100%)",
        boxShadow: "0 2px 8px rgba(106, 69, 231, 0.28)",
        overflow: "hidden",
      }}
    >
      <span style={{ ...bar, left: 15 * k }} />
      <span style={{ ...bar, left: 30 * k }} />
    </div>
  );
}
