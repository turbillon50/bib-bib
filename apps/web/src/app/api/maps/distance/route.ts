import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDistanceMatrix, mapsErrorResponse } from '@/lib/google-maps-server';

export const dynamic = 'force-dynamic';

// GET /api/maps/distance?origins=lat,lng&destinations=lat,lng&mode=driving
export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const origins = sp.get('origins');
  const destinations = sp.get('destinations');
  const mode = sp.get('mode') ?? 'driving';

  if (!origins || !destinations) {
    return NextResponse.json({ error: 'Faltan parámetros: origins y destinations' }, { status: 400 });
  }

  try {
    const matrix = await getDistanceMatrix(origins, destinations, mode);
    return NextResponse.json({ matrix });
  } catch (err) {
    const { body, status } = mapsErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
