// Bix the beaver, the default Buddy from the design. The other Buddies
// (Pip, Mo, Luna...) come with rewards.

interface Props {
  size?: number;
  /** Paws at the bottom, for when Bix holds the tab bar */
  paws?: boolean;
}

export function Buddy({ size = 100, paws = false }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ overflow: "visible" }}>
      <circle cx="24" cy="24" r="9" fill="#9A5B2E" />
      <circle cx="76" cy="24" r="9" fill="#9A5B2E" />
      <circle cx="24" cy="24" r="4.5" fill="#6B3E1E" />
      <circle cx="76" cy="24" r="4.5" fill="#6B3E1E" />
      <path d="M18 100 C18 80 30 72 50 72 C70 72 82 80 82 100 Z" fill="#9A5B2E" />
      <ellipse cx="50" cy="46" rx="31" ry="29" fill="#A9693A" />
      <ellipse cx="50" cy="57" rx="16" ry="12" fill="#F2D3B0" />
      <circle cx="38" cy="40" r="5" fill="#1B1B1B" />
      <circle cx="62" cy="40" r="5" fill="#1B1B1B" />
      <circle cx="39.6" cy="38.4" r="1.6" fill="#FFFFFF" />
      <circle cx="63.6" cy="38.4" r="1.6" fill="#FFFFFF" />
      <ellipse cx="50" cy="51" rx="5.5" ry="3.6" fill="#3A2414" />
      <rect x="44.5" y="57" width="5" height="8" rx="1" fill="#FFFFFF" stroke="#3A2414" strokeWidth={1} />
      <rect x="50.5" y="57" width="5" height="8" rx="1" fill="#FFFFFF" stroke="#3A2414" strokeWidth={1} />
      {paws && (
        <>
          <ellipse cx="28" cy="96" rx="11" ry="7" fill="#9A5B2E" stroke="#6B3E1E" strokeWidth={1.5} />
          <ellipse cx="72" cy="96" rx="11" ry="7" fill="#9A5B2E" stroke="#6B3E1E" strokeWidth={1.5} />
          <path d="M23 92v5M28 91v6M33 92v5M67 92v5M72 91v6M77 92v5" stroke="#6B3E1E" strokeWidth={1.2} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export const BUDDY_NAME = "Bix";
