import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let pathname = "/guardian/u1/routines";
vi.mock("next/navigation", () => ({ useParams: () => ({ personId: "u1" }), usePathname: () => pathname }));

import { GuardianTabBar } from "./GuardianTabBar";

describe("GuardianTabBar", () => {
  it("has the four guardian tabs, without Help or Scan", () => {
    render(<GuardianTabBar />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Today", "Routines", "Contacts", "Me"]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/guardian/u1", "/guardian/u1/routines", "/guardian/u1/contacts", "/guardian/u1/me"]);
  });

  it("marks the current tab", () => {
    pathname = "/guardian/u1";
    render(<GuardianTabBar />);
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Me" })).not.toHaveAttribute("aria-current");
  });
});
