// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/features/groceries/krogerServer", () => ({ findStores: vi.fn(), findStoresNear: vi.fn(), findProducts: vi.fn() }));
import { findStores, findStoresNear, findProducts } from "./krogerServer";
import { GET as stores } from "@/app/api/groceries/stores/route";
import { GET as products } from "@/app/api/groceries/products/route";
beforeEach(() => vi.resetAllMocks());
it("validates ZIP and passes it to the store lookup", async () => {
  expect((await stores(new Request("http://localhost/?zip=bad"))).status).toBe(400);
  vi.mocked(findStores).mockResolvedValue([{ locationId: "01800707", name: "Whittaker" }]);
  expect(await (await stores(new Request("http://localhost/?zip=48197"))).json()).toEqual({ stores: [{ locationId: "01800707", name: "Whittaker" }] });
  expect(findStores).toHaveBeenCalledWith("48197");
  vi.mocked(findStoresNear).mockResolvedValue([{ locationId: "01800707", name: "Whittaker" }]);
  expect(await (await stores(new Request("http://localhost/?lat=42.2&lon=-83.6"))).json()).toEqual({ stores: [{ locationId: "01800707", name: "Whittaker" }] });
  expect(findStoresNear).toHaveBeenCalledWith(42.2, -83.6);
  expect((await stores(new Request("http://localhost/?lat=190&lon=0"))).status).toBe(400);
});
it("passes store and term to product lookup and hides upstream errors", async () => {
  expect((await products(new Request("http://localhost/?locationId=bad&term=rice"))).status).toBe(400);
  vi.mocked(findProducts).mockRejectedValue(new Error("private upstream details"));
  const response = await products(new Request("http://localhost/?locationId=01800707&term=rice"));
  expect(findProducts).toHaveBeenCalledWith("01800707", "rice");
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain("private upstream details");
});
