export type Availability = "available" | "unavailable" | "unknown";
export interface Store { locationId: string; name: string; }
export interface Product { id: string; name: string; availability: Availability; aisle: string | null; }
export interface GroceryCatalog {
  stores(zip: string): Promise<Store[]>;
  search(locationId: string, term: string): Promise<Product[]>;
}

/** Keep unrecognized or missing provider fields unknown. Never infer stock from price or description. */
export function parseProductResponse(value: unknown): Product[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { data?: unknown }).data)) return [];
  return (value as { data: unknown[] }).data.flatMap((entry): Product[] => {
    if (!entry || typeof entry !== "object") return [];
    const p = entry as { productId?: unknown; description?: unknown; items?: unknown; aisleLocations?: unknown };
    if (typeof p.productId !== "string" || !p.productId.trim() || typeof p.description !== "string" || !p.description.trim()) return [];
    const first = Array.isArray(p.items) && p.items[0] && typeof p.items[0] === "object" ? p.items[0] as { inventory?: { stockLevel?: unknown } } : undefined;
    const stock = first?.inventory?.stockLevel;
    const availability: Availability = stock === "HIGH" || stock === "LOW" ? "available" : stock === "TEMPORARILY_OUT_OF_STOCK" || stock === "OUT_OF_STOCK" ? "unavailable" : "unknown";
    const aisle = Array.isArray(p.aisleLocations) && typeof p.aisleLocations[0]?.description === "string" ? p.aisleLocations[0].description.trim() || null : null;
    return [{ id: p.productId, name: p.description, availability, aisle }];
  });
}

// Illustrative local fixtures only. They are not real Kroger locations or inventory.
const mockStores: Store[] = [{ locationId: "demo-north", name: "Demo store – North" }, { locationId: "demo-south", name: "Demo store – South" }];
const mockProducts = [
  { productId: "milk", description: "Milk (sample)", items: [{ inventory: { stockLevel: "HIGH" } }], aisleLocations: [{ description: "Dairy (sample)" }] },
  { productId: "bread", description: "Bread (sample)", items: [{ inventory: { stockLevel: "TEMPORARILY_OUT_OF_STOCK" } }] },
  { productId: "apples", description: "Apples (sample)" },
];
export const mockCatalog: GroceryCatalog = {
  async stores() { return mockStores; },
  async search(locationId, term) {
    if (!mockStores.some((store) => store.locationId === locationId)) throw new Error("Choose a store first.");
    return parseProductResponse({ data: mockProducts }).filter((p) => p.name.toLowerCase().includes(term.trim().toLowerCase()));
  },
};

export const liveCatalog: GroceryCatalog = {
  async stores(zip) {
    const response = await fetch(`/api/groceries/stores?zip=${encodeURIComponent(zip)}`);
    if (!response.ok) throw new Error("Stores unavailable");
    return (await response.json()).stores;
  },
  async search(locationId, term) {
    const query = new URLSearchParams({ locationId, term });
    const response = await fetch(`/api/groceries/products?${query}`);
    if (!response.ok) throw new Error("Products unavailable");
    return (await response.json()).products;
  },
};
