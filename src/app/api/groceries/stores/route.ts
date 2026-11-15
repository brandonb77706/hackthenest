import { findStores, findStoresNear } from "@/features/groceries/krogerServer";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const zip = params.get("zip");
  const lat = params.get("lat");
  const lon = params.get("lon");
  const hasCoordinates = lat !== null && lon !== null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lon)) <= 180;
  if (zip === null && !hasCoordinates) return Response.json({ error: "Enter a 5-digit ZIP code or allow location access." }, { status: 400 });
  if (zip !== null && !/^\d{5}$/.test(zip)) return Response.json({ error: "Enter a 5-digit ZIP code." }, { status: 400 });
  try { return Response.json({ stores: zip ? await findStores(zip) : await findStoresNear(Number(lat), Number(lon)) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Store search is unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } }); }
}
