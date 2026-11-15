import { findProducts } from "@/features/groceries/krogerServer";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const locationId = query.get("locationId") ?? "";
  const term = (query.get("term") ?? "").trim();
  if (!/^\d{8}$/.test(locationId) || term.length < 1 || term.length > 100) return Response.json({ error: "Choose a store and enter an item." }, { status: 400 });
  try { return Response.json({ products: await findProducts(locationId, term) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Product search is unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } }); }
}
