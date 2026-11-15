import { describe, expect, it } from "vitest";
import { CHALLENGES, challengeStatus, readyToClaim, type ChallengeFacts } from "./challenges";

const facts = (over: Partial<ChallengeFacts> = {}): ChallengeFacts => ({
  routinesToday: 3,
  routinesDoneToday: 0,
  scansToday: 0,
  routinesMadeToday: 0,
  canMakeRoutines: true,
  claimed: [],
  ...over,
});
const byId = (f: ChallengeFacts) => Object.fromEntries(challengeStatus(f).map((c) => [c.id, c]));

it("each challenge pays more than finishing one routine (20)", () => {
  expect(CHALLENGES.every((c) => c.tokens > 20)).toBe(true);
});

describe("challengeStatus", () => {
  it("shows progress toward each challenge", () => {
    const c = byId(facts({ routinesDoneToday: 2, scansToday: 1 }));
    expect(c.all_routines).toMatchObject({ done: false, progress: "2 of 3 routines", percent: 67 });
    expect(c.scans).toMatchObject({ done: false, progress: "1 of 3 scans", percent: 33 });
    expect(c.new_routine).toMatchObject({ done: false, progress: "Not yet", percent: 0 });
  });

  it("is done when the goal is met", () => {
    const c = byId(facts({ routinesDoneToday: 3, scansToday: 5, routinesMadeToday: 1 }));
    expect(Object.values(c).every((x) => x.done && x.percent === 100)).toBe(true);
    expect(c.scans.progress).toBe("3 of 3 scans");
  });

  it("can't finish all routines when none are planned", () => {
    expect(byId(facts({ routinesToday: 0 })).all_routines).toMatchObject({ done: false, progress: "No routines planned today" });
  });

  it("stays done once paid, even if a routine is added later today", () => {
    expect(byId(facts({ routinesToday: 4, routinesDoneToday: 3, claimed: ["all_routines"] })).all_routines.done).toBe(true);
  });

  it("hides the new-routine challenge when a guardian manages routines", () => {
    expect(challengeStatus(facts({ canMakeRoutines: false })).map((c) => c.id)).toEqual(["all_routines", "scans"]);
  });
});

describe("readyToClaim", () => {
  it("is what's met and not paid yet", () => {
    const f = facts({ routinesDoneToday: 3, scansToday: 3, claimed: ["scans"] });
    expect(readyToClaim(f).map((c) => c.id)).toEqual(["all_routines"]);
    expect(readyToClaim(facts())).toEqual([]);
  });
});
