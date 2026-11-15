import { findStores } from "@/features/groceries/krogerServer";
export async function GET(request: Request) {
  const zip = new URL(request.url).searchParams.get("zip") ?? "";
  if (!/^\d{5}$/.test(zip)) return Response.json({ error: "Enter a 5-digit ZIP code." }, { status: 400 });
  try { return Response.json({ stores: await findStores(zip) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Store search is unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } }); }
}
