import { describe, expect, it } from "vitest";
import { mockCatalog, parseProductResponse } from "./catalog";

describe("grocery catalog response handling", () => {
  it("keeps missing or unrecognized stock and aisle data unknown", () => {
    expect(parseProductResponse({ data: [{ productId: "a", description: "Apple" }, { productId: "b", description: "Bread", items: [{ inventory: { stockLevel: "NEW_VALUE" } }], aisleLocations: [] }] })).toEqual([
      { id: "a", name: "Apple", availability: "unknown", aisle: null },
      { id: "b", name: "Bread", availability: "unknown", aisle: null },
    ]);
  });
  it("uses explicit availability and aisle information only", () => {
    expect(parseProductResponse({ data: [{ productId: "x", description: "Milk", items: [{ inventory: { stockLevel: "LOW" } }], aisleLocations: [{ description: "Dairy" }] }, { productId: "y", description: "Bread", items: [{ inventory: { stockLevel: "TEMPORARILY_OUT_OF_STOCK" } }] }] })).toEqual([
      { id: "x", name: "Milk", availability: "available", aisle: "Dairy" },
      { id: "y", name: "Bread", availability: "unavailable", aisle: null },
    ]);
  });
  it("handles malformed responses and rejects invalid mock locations", async () => {
    expect(parseProductResponse(null)).toEqual([]);
    expect(parseProductResponse({ data: [null, {}, { productId: 1, description: "Bad" }] })).toEqual([]);
    await expect(mockCatalog.search("missing", "milk")).rejects.toThrow("Choose a store");
  });
});
