// GET /api/reverse?lat=&lon= → human-readable address for the picker UI.

import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/nominatim";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat"));
  const lon = parseFloat(searchParams.get("lon"));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }
  const data = await reverseGeocode(lat, lon);
  if (!data) {
    return NextResponse.json({ label: null, address: null });
  }
  return NextResponse.json({
    label: data.display_name,
    address: data.address || null,
  });
}
