import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { geocodeAddress, reverseGeocode, mapsErrorResponse } from '@/lib/google-maps-server';

export const dynamic = 'force-dynamic';

// GET /api/maps/geocode?address=...  |  ?lat=..&lng=..
export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const address = sp.get('address');
  const lat = sp.get('lat');
  const lng = sp.get('lng');

  try {
    if (address) {
      const results = await geocodeAddress(address);
      return NextResponse.json({ results });
    }
    if (lat && lng) {
      const results = await reverseGeocode(parseFloat(lat), parseFloat(lng));
      return NextResponse.json({ results });
    }
    return NextResponse.json({ error: 'Falta parámetro: address, o lat+lng' }, { status: 400 });
  } catch (err) {
    const { body, status } = mapsErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
