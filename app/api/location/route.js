// GET /api/location → resolve user IP via ipapi.co.
// In dev, the request IP is usually loopback so we fall back to a default city.

import { NextResponse } from "next/server";

const DEFAULT_LOCATION = {
  city: "Dubai",
  country: "United Arab Emirates",
  latitude: 25.2048,
  longitude: 55.2708,
  source: "default",
};

function clientIp(req) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "";
}

function isLocal(ip) {
  if (!ip) return true;
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.") ||
    ip.includes("localhost")
  );
}

export async function GET(req) {
  const ip = clientIp(req);
  if (isLocal(ip)) {
    return NextResponse.json(DEFAULT_LOCATION);
  }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "GeoIntelMVP/1.0" },
    });
    if (!res.ok) return NextResponse.json(DEFAULT_LOCATION);
    const data = await res.json();
    if (data.error || data.latitude == null) return NextResponse.json(DEFAULT_LOCATION);
    return NextResponse.json({
      city: data.city,
      country: data.country_name,
      latitude: data.latitude,
      longitude: data.longitude,
      source: "ipapi",
    });
  } catch {
    return NextResponse.json(DEFAULT_LOCATION);
  }
}
