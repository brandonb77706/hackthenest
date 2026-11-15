// The user's Buddy (their equipped avatar), drawn in the style of the design
// mockups (by Adrian; all 8 drawings are from Avatar.dc.html). The catalog's
// image files aren't generated yet, so this draws the Buddy from its name.
// A Buddy with no drawing yet shows its first letter instead. The fox is the main Buddy.

export type BuddyArt = "fox" | "owl" | "cat" | "beaver" | "penguin" | "frog" | "turtle" | "bunny";

const ART_WORDS: BuddyArt[] = ["fox", "owl", "cat", "beaver", "penguin", "frog", "turtle", "bunny"];

/** Paw colors for when a Buddy holds the tab bar. */
const PAWS: Record<BuddyArt, [string, string]> = {
  fox: ["#F08A3E", "#B85A1C"],
  owl: ["#9C7752", "#6E5233"],
  cat: ["#A3AEC2", "#6E7A90"],
  beaver: ["#9A5B2E", "#6B3E1E"],
  penguin: ["#F5A623", "#C47F0E"],
  frog: ["#6CC070", "#3F8A48"],
  turtle: ["#8FCB8A", "#4F8F4A"],
  bunny: ["#F2EDF5", "#B9A9C8"],
};

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
  /** Paws at the bottom, for when the Buddy holds the tab bar */
  paws?: boolean;
}

/** Decorative: say the Buddy's name in nearby text, not here. */
export function BuddyAvatar({ name, size, paws = false }: Props) {
  const art = buddyArt(name);
  if (!art) {
    return (
      <span
        aria-hidden="true"
        className="flex items-center justify-center self-center rounded-full bg-primary-soft font-display font-bold text-primary-text"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  const [paw, pawEdge] = PAWS[art];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="overflow-visible">
      {art === "fox" && <Fox />}
      {art === "owl" && <Owl />}
      {art === "cat" && <Cat />}
      {art === "beaver" && <Beaver />}
      {art === "penguin" && <Penguin />}
      {art === "frog" && <Frog />}
      {art === "turtle" && <Turtle />}
      {art === "bunny" && <Bunny />}
      {paws && (
        <>
          <ellipse cx="28" cy="96" rx="11" ry="7" fill={paw} stroke={pawEdge} strokeWidth="1.5" />
          <ellipse cx="72" cy="96" rx="11" ry="7" fill={paw} stroke={pawEdge} strokeWidth="1.5" />
          <path d="M23 92v5M28 91v6M33 92v5M67 92v5M72 91v6M77 92v5" stroke={pawEdge} strokeWidth="1.2" strokeLinecap="round" />
        </>
      )}
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
      <path d="M20 50 C30 50 40 56 50 70 C60 56 70 50 80 50 C78 64 66 73 50 73 C34 73 22 64 20 50 Z" fill="#FFF4EA" />
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
      <path d="M50 59q-4 4-8 2M50 59q4 4 8 2" fill="none" stroke="#4A4A5A" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 54h12M22 59l12-2M78 54H66M78 59l-12-2" stroke="#5E6878" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}

function Beaver() {
  return (
    <>
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
      <rect x="44.5" y="57" width="5" height="8" rx="1" fill="#FFFFFF" stroke="#3A2414" strokeWidth="1" />
      <rect x="50.5" y="57" width="5" height="8" rx="1" fill="#FFFFFF" stroke="#3A2414" strokeWidth="1" />
    </>
  );
}

function Penguin() {
  return (
    <>
      <path d="M16 100 C16 78 30 70 50 70 C70 70 84 78 84 100 Z" fill="#2B3A55" />
      <path d="M30 100 C30 84 38 78 50 78 C62 78 70 84 70 100 Z" fill="#FFFFFF" />
      <ellipse cx="50" cy="45" rx="32" ry="31" fill="#2B3A55" />
      <path d="M24 50 C24 32 36 26 50 34 C64 26 76 32 76 50 C76 64 64 72 50 72 C36 72 24 64 24 50 Z" fill="#FFFFFF" />
      <circle cx="39" cy="45" r="5" fill="#1B1B1B" />
      <circle cx="61" cy="45" r="5" fill="#1B1B1B" />
      <circle cx="40.6" cy="43.4" r="1.6" fill="#FFFFFF" />
      <circle cx="62.6" cy="43.4" r="1.6" fill="#FFFFFF" />
      <path d="M43 54 L57 54 L50 63 Z" fill="#F5A623" />
      <circle cx="31" cy="56" r="4" fill="#FFB8C2" />
      <circle cx="69" cy="56" r="4" fill="#FFB8C2" />
    </>
  );
}

function Frog() {
  return (
    <>
      <path d="M16 100 C16 80 30 72 50 72 C70 72 84 80 84 100 Z" fill="#4FA85A" />
      <ellipse cx="50" cy="52" rx="34" ry="25" fill="#6CC070" />
      <circle cx="33" cy="30" r="13" fill="#6CC070" />
      <circle cx="67" cy="30" r="13" fill="#6CC070" />
      <circle cx="33" cy="30" r="8" fill="#FFFFFF" />
      <circle cx="67" cy="30" r="8" fill="#FFFFFF" />
      <circle cx="34" cy="31" r="4.5" fill="#1B1B1B" />
      <circle cx="68" cy="31" r="4.5" fill="#1B1B1B" />
      <path d="M34 58 Q50 70 66 58" fill="none" stroke="#24572B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="26" cy="54" r="4.5" fill="#FF9EAA" />
      <circle cx="74" cy="54" r="4.5" fill="#FF9EAA" />
    </>
  );
}

function Turtle() {
  return (
    <>
      <path d="M14 100C14 74 30 64 50 64s36 10 36 36z" fill="#3E8E5E" />
      <path d="M30 100c2-14 9-22 20-22s18 8 20 22M50 78v22M36 86h28" fill="none" stroke="#2C6B45" strokeWidth="2.5" />
      <ellipse cx="50" cy="44" rx="27" ry="26" fill="#8FCB8A" />
      <circle cx="39" cy="40" r="5" fill="#1B1B1B" />
      <circle cx="61" cy="40" r="5" fill="#1B1B1B" />
      <circle cx="40.6" cy="38.4" r="1.6" fill="#FFFFFF" />
      <circle cx="62.6" cy="38.4" r="1.6" fill="#FFFFFF" />
      <path d="M40 54q10 7 20 0" fill="none" stroke="#2C6B45" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="31" cy="50" r="4" fill="#F7B5A8" />
      <circle cx="69" cy="50" r="4" fill="#F7B5A8" />
    </>
  );
}

function Bunny() {
  return (
    <>
      <ellipse cx="36" cy="16" rx="8" ry="20" fill="#F2EDF5" />
      <ellipse cx="64" cy="16" rx="8" ry="20" fill="#F2EDF5" />
      <ellipse cx="36" cy="16" rx="4" ry="14" fill="#F7C6D9" />
      <ellipse cx="64" cy="16" rx="4" ry="14" fill="#F7C6D9" />
      <path d="M18 100C18 80 30 72 50 72s32 8 32 28z" fill="#E6DFEC" />
      <ellipse cx="50" cy="50" rx="30" ry="27" fill="#F7F3FA" />
      <circle cx="39" cy="47" r="5" fill="#2A2340" />
      <circle cx="61" cy="47" r="5" fill="#2A2340" />
      <circle cx="40.6" cy="45.4" r="1.6" fill="#FFFFFF" />
      <circle cx="62.6" cy="45.4" r="1.6" fill="#FFFFFF" />
      <ellipse cx="50" cy="56" rx="3.5" ry="2.6" fill="#F28AA0" />
      <path d="M50 59q-3 3-6 1M50 59q3 3 6 1" fill="none" stroke="#6A5A7A" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="30" cy="57" r="4.5" fill="#F7C6D9" />
      <circle cx="70" cy="57" r="4.5" fill="#F7C6D9" />
    </>
  );
}
