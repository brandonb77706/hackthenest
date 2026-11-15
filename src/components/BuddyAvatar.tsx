// The user's Buddy (their equipped avatar), drawn in the style of the design mockups.
// The catalog's image files aren't generated yet, so this draws the Buddy from its
// name. A Buddy with no drawing yet shows its first letter instead.

export type BuddyArt = "fox" | "owl" | "cat";

const ART_WORDS: BuddyArt[] = ["fox", "owl", "cat"];

/** Which drawing fits an avatar name, e.g. "Skater owl" is the owl. Null if there isn't one yet. */
export function buddyArt(name: string): BuddyArt | null {
  const words = name.toLowerCase().split(/[^a-z]+/);
  return ART_WORDS.find((art) => words.includes(art)) ?? null;
}

interface Props {
  /** Avatar name from the catalog, e.g. "Fox" */
  name: string;
  /** Width and height in px */
  size: number;
}

/** Decorative: say the Buddy's name in nearby text, not here. */
export function BuddyAvatar({ name, size }: Props) {
  const art = buddyArt(name);
  if (!art) {
    return (
      <span
        aria-hidden="true"
        className="br-display flex items-center justify-center self-center font-bold"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="overflow-visible">
      {art === "fox" && <Fox />}
      {art === "owl" && <Owl />}
      {art === "cat" && <Cat />}
    </svg>
  );
}

function Fox() {
  return (
    <>
      <path d="M22 26 L30 4 L42 22 Z" fill="#E0762E" />
      <path d="M78 26 L70 4 L58 22 Z" fill="#E0762E" />
      <path d="M27 22 L31 11 L37 21 Z" fill="#3A2414" />
      <path d="M73 22 L69 11 L63 21 Z" fill="#3A2414" />
      <path d="M18 100 C18 80 30 72 50 72 C70 72 82 80 82 100 Z" fill="#E0762E" />
      <path d="M38 100 C38 86 43 80 50 80 C57 80 62 86 62 100 Z" fill="#FFF4EA" />
      <ellipse cx="50" cy="46" rx="31" ry="27" fill="#F08A3E" />
      <path
        d="M20 50 C30 50 40 56 50 70 C60 56 70 50 80 50 C78 64 66 73 50 73 C34 73 22 64 20 50 Z"
        fill="#FFF4EA"
      />
      <circle cx="38" cy="42" r="5" fill="#1B1B1B" />
      <circle cx="62" cy="42" r="5" fill="#1B1B1B" />
      <circle cx="39.6" cy="40.4" r="1.6" fill="#FFFFFF" />
      <circle cx="63.6" cy="40.4" r="1.6" fill="#FFFFFF" />
      <ellipse cx="50" cy="60" rx="4.5" ry="3.2" fill="#1B1B1B" />
    </>
  );
}

function Owl() {
  return (
    <>
      <path d="M22 22l6-14 10 12z" fill="#7A5A3A" />
      <path d="M78 22l-6-14-10 12z" fill="#7A5A3A" />
      <path d="M16 100C16 78 30 70 50 70s34 8 34 30z" fill="#8C6A48" />
      <path d="M34 100c0-14 7-20 16-20s16 6 16 20z" fill="#E9D6B8" />
      <path d="M38 88l4 3M50 86v4M62 88l-4 3" stroke="#B89870" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="50" cy="45" rx="33" ry="30" fill="#9C7752" />
      <circle cx="36" cy="42" r="13" fill="#F4E7D2" />
      <circle cx="64" cy="42" r="13" fill="#F4E7D2" />
      <circle cx="36" cy="42" r="6.5" fill="#1B1B1B" />
      <circle cx="64" cy="42" r="6.5" fill="#1B1B1B" />
      <circle cx="38" cy="40" r="2" fill="#FFFFFF" />
      <circle cx="66" cy="40" r="2" fill="#FFFFFF" />
      <path d="M45 54h10l-5 8z" fill="#F5A623" />
    </>
  );
}

function Cat() {
  return (
    <>
      <path d="M20 30l4-24 18 16z" fill="#8E9AAF" />
      <path d="M80 30l-4-24-18 16z" fill="#8E9AAF" />
      <path d="M25 24l2-11 9 8z" fill="#F7C6CF" />
      <path d="M75 24l-2-11-9 8z" fill="#F7C6CF" />
      <path d="M18 100C18 80 30 72 50 72s32 8 32 28z" fill="#8E9AAF" />
      <ellipse cx="50" cy="47" rx="32" ry="28" fill="#A3AEC2" />
      <path d="M30 34l8 4M70 34l-8 4M50 22v8" stroke="#7D889C" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="38" cy="45" rx="5" ry="6" fill="#2E3B2E" />
      <ellipse cx="62" cy="45" rx="5" ry="6" fill="#2E3B2E" />
      <circle cx="39.6" cy="43" r="1.7" fill="#FFFFFF" />
      <circle cx="63.6" cy="43" r="1.7" fill="#FFFFFF" />
      <path d="M46 55h8l-4 4z" fill="#F28AA0" />
      <path
        d="M50 59q-4 4-8 2M50 59q4 4 8 2"
        fill="none"
        stroke="#4A4A5A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M22 54h12M22 59l12-2M78 54H66M78 59l-12-2"
        stroke="#5E6878"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </>
  );
}
